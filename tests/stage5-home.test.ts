/** Stage 5, home side: the box's cards in browser storage, a cart line opened as a card, and the cart line replaced. */
import { beforeEach, describe, expect, it } from 'vitest';
import type { CartItem } from '@/lib/cart-store';
import { cartStore, replaceCartLine, replacedLines } from '@/lib/cart-store';
import type { StampCardData } from '@/components/home/StampCard';
import { withHeld } from '@/components/home/stamp-box-logic';
import {
  cardsKey,
  cartUrl,
  KEEP_MS,
  lineCard,
  readCards,
  readSaved,
  restoreBox,
  restoredCard,
  savedCards,
  toSaved,
  writeCards,
} from '@/components/home/stamp-box-store';
import type { Stamp } from '@/stamp-bot/card-types';
import { toStamp, unpinned } from '@/stamp-bot/card';
import { cleanForm } from '@/stamp-bot/form';
import { botLine } from '@/stamp-bot/order';

const NOW = Date.UTC(2026, 10, 28, 12);
const FORM = JSON.stringify({ tmpl: 'written', kind: 'rect', color: 'blue' });

function fakeStore() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

const stamp: Stamp = {
  svg: '<svg>drawing</svg>',
  form: FORM,
  kind: 'rect',
  size: '38x14',
  ink: 'blue',
  frame: false,
  bodies: [{ slug: 'print-20', title: 'פרינט 20', short: 'פרינט 20', price: 59 }],
  orderable: true,
  why: '',
};

function card(p: Partial<StampCardData> = {}): StampCardData {
  return {
    id: 'c1',
    group: 'm1',
    msgs: [
      { role: 'user', text: 'יוסי כהן' },
      { role: 'ai', text: 'הנה החותמת', form: FORM },
    ],
    stamp,
    body: 'print-20',
    qty: 2,
    reply: '',
    err: '',
    retry: false,
    orderErr: '',
    busy: false,
    running: false,
    inking: false,
    panel: null,
    ...p,
  };
}

describe('saving and restoring the cards', () => {
  it('round trip: what is saved brings the card back, without its drawing or price', () => {
    const store = fakeStore();
    writeCards(store, 'start', savedCards([card({ line: 'c-line' })], [{ id: 'm1', text: 'יוסי כהן' }], NOW));
    const raw = store.m.get(cardsKey('start'))!;
    expect(raw).not.toContain('drawing');
    expect(raw).not.toContain('59');
    const saved = readCards(store, 'start', NOW + 1000);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ id: 'c1', group: 'm1', text: 'יוסי כהן', form: FORM, ink: 'blue', body: 'print-20', qty: 2, line: 'c-line', at: NOW });
    const { cards, sent } = restoreBox(saved);
    expect(sent).toEqual([{ id: 'm1', text: 'יוסי כהן' }]);
    expect(cards[0]).toMatchObject({ id: 'c1', group: 'm1', stamp: null, body: 'print-20', qty: 2, line: 'c-line', busy: false, restore: { form: FORM, ink: 'blue' } });
    expect(cards[0].msgs).toEqual(card().msgs);
  });

  it('keeps the order of the cards and of their messages', () => {
    const store = fakeStore();
    const cs = [card({ id: 'a', group: 'g1' }), card({ id: 'b', group: 'g2' }), card({ id: 'c', group: 'g1' })];
    writeCards(store, 'start', savedCards(cs, [{ id: 'g1', text: 'ראשונה' }, { id: 'g2', text: 'שנייה' }], NOW));
    const { cards, sent } = restoreBox(readCards(store, 'start', NOW));
    expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(sent).toEqual([
      { id: 'g1', text: 'ראשונה' },
      { id: 'g2', text: 'שנייה' },
    ]);
  });

  it('the two boxes keep their cards under their own keys', () => {
    const store = fakeStore();
    expect(cardsKey('start')).not.toBe(cardsKey('end'));
    writeCards(store, 'start', savedCards([card({ id: 'top' })], [], NOW));
    writeCards(store, 'end', savedCards([card({ id: 'bottom' })], [], NOW));
    expect(readCards(store, 'start', NOW).map((s) => s.id)).toEqual(['top']);
    expect(readCards(store, 'end', NOW).map((s) => s.id)).toEqual(['bottom']);
    writeCards(store, 'end', []);
    expect(store.m.has(cardsKey('end'))).toBe(false);
    expect(readCards(store, 'start', NOW).map((s) => s.id)).toEqual(['top']);
  });

  it('drops a card saved more than 7 days ago', () => {
    const store = fakeStore();
    const old = { ...toSaved(card({ id: 'old' }), '', NOW - KEEP_MS - 1) };
    const fresh = { ...toSaved(card({ id: 'fresh' }), '', NOW - KEEP_MS + 60_000) };
    store.setItem(cardsKey('start'), JSON.stringify([old, fresh]));
    expect(readCards(store, 'start', NOW).map((s) => s.id)).toEqual(['fresh']);
  });

  it('drops corrupt and old-shape records silently, keeps the readable ones', () => {
    const store = fakeStore();
    const good = toSaved(card({ id: 'good' }), '', NOW);
    const noVersion: Record<string, unknown> = { ...toSaved(card({ id: 'old-shape' }), '', NOW) };
    delete noVersion.v;
    store.setItem(
      cardsKey('start'),
      JSON.stringify([good, noVersion, { ...good, id: 'bad-msgs', msgs: [{ role: 'x', text: 1 }] }, { ...good, id: 'no-at', at: 'x' }, null, 7, { ...good, v: 2, id: 'v2' }]),
    );
    expect(readCards(store, 'start', NOW).map((s) => s.id)).toEqual(['good']);
    store.setItem(cardsKey('start'), '{not json');
    expect(readCards(store, 'start', NOW)).toEqual([]);
    store.setItem(cardsKey('start'), '{"v":1}');
    expect(readCards(store, 'start', NOW)).toEqual([]);
  });

  it('a browser that refuses storage behaves as if nothing was saved', () => {
    const refusing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readCards(refusing, 'start', NOW)).toEqual([]);
    expect(() => writeCards(refusing, 'start', savedCards([card()], [], NOW))).not.toThrow();
    expect(readCards(null, 'start', NOW)).toEqual([]);
  });

  it('a card unchanged since it was saved keeps its saved-at time', () => {
    const first = savedCards([card()], [], NOW);
    expect(savedCards([card()], [], NOW + 5000, first)[0].at).toBe(NOW);
    expect(savedCards([card({ qty: 3 })], [], NOW + 5000, first)[0].at).toBe(NOW + 5000);
  });
});

describe('what a restored card becomes', () => {
  const back = (c: StampCardData) => restoredCard(readSaved(JSON.parse(JSON.stringify(toSaved(c, 'x', NOW))), NOW)!);

  it('a drawn stamp: redrawn from its form, the static skeleton meanwhile', () => {
    const r = back(card());
    expect(r).toMatchObject({ stamp: null, busy: false, running: false, err: '', reply: '', panel: null, restore: { form: FORM, ink: 'blue' } });
  });

  it('a card waiting for the bot: back in the queue with its same last message', () => {
    const msgs = [...card().msgs, { role: 'user' as const, text: 'להגדיל', form: FORM }];
    const r = back(card({ msgs, busy: true, running: true }));
    expect(r.busy).toBe(true);
    expect(r.running).toBe(false);
    expect(r.msgs.at(-1)).toEqual({ role: 'user', text: 'להגדיל', form: FORM });
    expect(r.restore?.form).toBe(FORM); // the previous stamp is redrawn while the turn runs
    const first = back(card({ msgs: [{ role: 'user', text: 'יוסי' }], stamp: null, busy: true }));
    expect(first.busy).toBe(true);
    expect(first.restore).toBeUndefined();
  });

  it('a question with nothing drawn: the question and its answer box', () => {
    const r = back(card({ stamp: null, msgs: [{ role: 'user', text: 'חותמת' }, { role: 'ai', text: 'מה לכתוב בה?' }], reply: 'מה לכתוב בה?', panel: 'fix' }));
    expect(r).toMatchObject({ stamp: null, busy: false, reply: 'מה לכתוב בה?', panel: 'fix' });
    expect(r.restore).toBeUndefined();
  });

  it('an error: the same error with its retry button', () => {
    const msgs = [{ role: 'user' as const, text: 'יוסי' }];
    const r = back(card({ stamp: null, msgs, err: 'הבוט לא ענה בזמן', retry: true }));
    expect(r).toMatchObject({ busy: false, err: 'הבוט לא ענה בזמן', retry: true });
  });
});

describe('a cart line opened as a card', () => {
  const item: CartItem = {
    id: 'c-line',
    productSlug: 'print-20',
    productName: 'פרינט 20',
    modelId: 'print-20',
    size: '38×14',
    design: {
      version: 1,
      modelId: 'print-20',
      shape: 'rect',
      width: 38,
      height: 14,
      border: { style: 'none', thickness: 0, inset: 0, gap: 0 },
      elements: [],
      inkColor: 'red',
      bot: { form: FORM },
    },
    previewSvg: '<svg/>',
    ink: 'red',
    quantity: 3,
    unitPrice: 59,
    addedAt: '2026-11-27T10:00:00.000Z',
  };

  it('seeds the line form, model, ink and quantity, and remembers the line', () => {
    const c = lineCard(item, 'k1', 'g1')!;
    expect(c).toMatchObject({ id: 'k1', group: 'g1', line: 'c-line', msgs: [], stamp: null, body: 'print-20', qty: 3, busy: false, reply: '', err: '' });
    expect(c.restore).toEqual({ form: FORM, ink: 'red', unpin: true });
  });

  it('a line that is not the bot\'s is not opened', () => {
    expect(lineCard({ ...item, design: { ...item.design, bot: undefined } }, 'k1', 'g1')).toBeNull();
  });

  it('a refresh before its first redraw keeps it a cart stamp', () => {
    const r = restoredCard(readSaved(JSON.parse(JSON.stringify(toSaved(lineCard(item, 'k1', 'g1')!, '', NOW))), NOW)!);
    expect(r).toMatchObject({ line: 'c-line', restore: { form: FORM, ink: 'red', unpin: true }, busy: false });
  });
});

describe('the cart line replaced in place', () => {
  const base: Omit<CartItem, 'id' | 'addedAt'> = {
    productName: 'פרינט 20',
    modelId: 'print-20',
    size: '38×14',
    design: { version: 1, modelId: 'print-20', shape: 'rect', width: 38, height: 14, border: { style: 'none', thickness: 0, inset: 0, gap: 0 }, elements: [], inkColor: 'black' },
    previewSvg: '<svg/>',
    ink: 'black',
    quantity: 1,
    unitPrice: 59,
  };
  const line = (id: string, p: Partial<CartItem> = {}): CartItem => ({ ...base, id, addedAt: `t-${id}`, ...p });
  const fresh: Omit<CartItem, 'id' | 'addedAt'> = { ...base, productName: 'פרינט 30', modelId: 'print-30', quantity: 4, ink: 'blue' };

  beforeEach(() => cartStore.set([]));

  it('keeps the id, the position, addons and bodyColor', () => {
    const items = [line('a'), line('b', { addons: { pad: 1 } as never, bodyColor: 'red', designId: 'd1' }), line('c')];
    const next = replacedLines(items, 'b', fresh)!;
    expect(next.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(next[1]).toMatchObject({ id: 'b', addedAt: 't-b', addons: { pad: 1 }, bodyColor: 'red', productName: 'פרינט 30', quantity: 4, ink: 'blue' });
    expect(next[1].designId).toBeUndefined();
    expect(replacedLines(items, 'gone', fresh)).toBeNull();
  });

  it('through the store: replaces, or adds when the line is gone', () => {
    cartStore.set([line('a'), line('b')]);
    expect(replaceCartLine('a', fresh)).toBe(true);
    expect(cartStore.get().map((i) => [i.id, i.productName])).toEqual([
      ['a', 'פרינט 30'],
      ['b', 'פרינט 20'],
    ]);
    expect(replaceCartLine('gone', fresh)).toBe(false);
    expect(cartStore.get()).toHaveLength(3);
    expect(cartStore.get()[2].productName).toBe('פרינט 30');
  });

  it('the cart address says how many were added and how many updated', () => {
    expect(cartUrl(2, 0)).toBe('/cart/?added=2');
    expect(cartUrl(0, 1)).toBe('/cart/?updated=1');
    expect(cartUrl(1, 2)).toBe('/cart/?added=1&updated=2');
  });
});

describe('a removed card waits for its undo in its place', () => {
  it('puts each removed card back at its index, two from the same place in their order', () => {
    const shown = withHeld(['x0', 'x1', 'x4'], [
      { key: 'A', item: 'A', at: 2 },
      { key: 'B', item: 'B', at: 2 },
    ]);
    expect(shown.map((e) => e.item)).toEqual(['x0', 'x1', 'A', 'B', 'x4']);
    expect(shown.filter((e) => e.gone).map((e) => e.gone)).toEqual(['A', 'B']);
  });
});

describe('the stamp of a cart line, opened for editing', () => {
  const lineForm = (size: string) => {
    const form = JSON.stringify(cleanForm({ tmpl: 'written', kind: 'rect', size, written: [{ text: 'יוסי כהן', level: 1 }, { text: 'רואה חשבון', level: 3 }] }));
    for (const b of toStamp(JSON.parse(form)).bodies) {
      const l = botLine({ form, slug: b.slug, ink: 'black', quantity: 1 });
      if (typeof l !== 'string') return l;
    }
    throw new Error(`no body to order at ${size}: ${form}`);
  };

  it('a line drawn at the automatic size comes back loose, as the same drawing', () => {
    const l = lineForm('auto');
    expect(JSON.parse(l.design.bot!.form).size).not.toBe('auto');
    const s = unpinned(l.design.bot!.form, 'black')!;
    expect(JSON.parse(s.form).size).toBe('auto');
    expect(s.svg).toBe(l.previewSvg);
  });

  it('a line the customer sized on purpose stays at its size', () => {
    const auto = lineForm('auto');
    const l = lineForm('47x18');
    expect(JSON.parse(auto.design.bot!.form).size).not.toBe('47x18'); // the automatic size would be another one
    const s = unpinned(l.design.bot!.form, 'black')!;
    expect(s.size).toBe('47x18');
    expect(s.svg).toBe(l.previewSvg);
  });

  it('an unreadable form or ink comes back as null', () => {
    expect(unpinned('{', 'black')).toBeNull();
    expect(unpinned(lineForm('auto').design.bot!.form, 'gold')).toBeNull();
  });
});
