/** Stage 6, home side: the card's prices from the page's rules, the discount line, and the remedies that need no bot. */
import { describe, expect, it } from 'vitest';
import type { StampCardData } from '@/components/home/StampCard';
import { cardTotal, confirmLabel, discountLine, fixPlaceholder, inkExtra, linePrice } from '@/components/home/stamp-card-logic';
import { DEFAULT_RULES, type PricingRules } from '@/lib/pricing';
import { biggerStamp, confirmedStamp, toStamp } from '@/stamp-bot/card';
import type { Stamp } from '@/stamp-bot/card-types';
import { KINDS, sizeName } from '@/stamp-bot/kinds';

const rules = (over: Partial<PricingRules> = {}): PricingRules => ({ ...DEFAULT_RULES, coupons: [], ...over });
const LADDER = [
  { min: 2, discountPct: 5 },
  { min: 5, discountPct: 10 },
  { min: 10, discountPct: 15 },
];

describe('the discount line under the quantity', () => {
  const r = rules({ quantityTiers: LADDER });

  it('below the first tier: the whole ladder', () => {
    expect(discountLine(1, 56.05, r)).toBe('2 ומעלה: 5% הנחה · 5 ומעלה: 10% · 10 ומעלה: 15%');
  });

  it('at a tier with a higher one: that discount, the unit price, and the next tier', () => {
    expect(discountLine(2, 53.25, r)).toBe('הנחת כמות 5%: ₪53.25 ליחידה · 5 ומעלה: 10%');
    expect(discountLine(4, 53.25, r)).toBe('הנחת כמות 5%: ₪53.25 ליחידה · 5 ומעלה: 10%');
    expect(discountLine(5, 50.44, r)).toBe('הנחת כמות 10%: ₪50.44 ליחידה · 10 ומעלה: 15%');
    expect(discountLine(9, 50.44, r)).toBe('הנחת כמות 10%: ₪50.44 ליחידה · 10 ומעלה: 15%');
  });

  it('at the top tier: no next tier', () => {
    expect(discountLine(10, 47.64, r)).toBe('הנחת כמות 15%: ₪47.64 ליחידה');
    expect(discountLine(400, 47.64, r)).toBe('הנחת כמות 15%: ₪47.64 ליחידה');
  });

  it('other tiers, saved out of order, are read from the rules', () => {
    const other = rules({ quantityTiers: [{ min: 20, discountPct: 25 }, { min: 3, discountPct: 8 }] });
    expect(discountLine(2, 60, other)).toBe('3 ומעלה: 8% הנחה · 20 ומעלה: 25%');
    expect(discountLine(3, 55.2, other)).toBe('הנחת כמות 8%: ₪55.2 ליחידה · 20 ומעלה: 25%');
    expect(discountLine(20, 45, other)).toBe('הנחת כמות 25%: ₪45 ליחידה');
  });

  it('rules with no tiers: no line', () => {
    expect(discountLine(1, 50, rules({ quantityTiers: [] }))).toBe('');
    expect(discountLine(7, 50, rules({ quantityTiers: [] }))).toBe('');
  });

  it('the unit price is the one the card price uses', () => {
    // the card's line at 5: the same quote that gives its total
    const total = linePrice(59, 5, 'black', r);
    const line = discountLine(5, Math.round((total / 5) * 100) / 100, r);
    expect(line.startsWith('הנחת כמות 10%: ₪')).toBe(true);
  });
});

describe('prices come from the rules the page passes', () => {
  const live = rules({ ink: { black: 0, blue: 20 }, quantityTiers: [{ min: 3, discountPct: 20 }], onlineDesignPct: 0 });
  const stamp: Stamp = {
    svg: '<svg/>',
    form: '{}',
    kind: 'rect',
    size: '38x14',
    ink: 'blue',
    frame: false,
    bodies: [{ slug: 'a', title: 'A', short: 'A', price: 100 }],
    orderable: true,
    why: '',
  };
  const card = (qty: number, s: Stamp = stamp): StampCardData => ({
    id: '1',
    group: 'g',
    msgs: [],
    stamp: s,
    body: 'a',
    qty,
    reply: '',
    err: '',
    retry: false,
    orderErr: '',
    busy: false,
    running: false,
    inking: false,
    panel: null,
  });

  it('ink surcharge, tier and online discount all from the passed rules', () => {
    // 100 + 20 ink, 20% off at 3 -> 96 a stamp, no online discount
    expect(cardTotal(card(3), live)).toBe(288);
    // the static defaults would say otherwise: 100 + 9, 5% at 2+ ... and 5% online
    expect(cardTotal(card(3), rules())).not.toBe(288);
    expect(inkExtra('blue', live)).toBe(20);
    expect(inkExtra('blue', rules())).toBe(9);
    expect(linePrice(100, 1, 'black', live)).toBe(100);
  });

  it('a stamp that cannot be ordered has no price', () => {
    expect(cardTotal(card(1, { ...stamp, orderable: false, why: 'x' }), live)).toBeNull();
  });
});

describe('the remedies of a stamp that cannot be ordered', () => {
  const rect = KINDS.rect.sizes.map(sizeName);
  const square = KINDS.square.sizes.map(sizeName);
  const written = (kind: string, size: string, lines: string[]) =>
    JSON.stringify({ tmpl: 'written', kind, size, written: lines.map((text, i) => ({ text, level: i === 0 ? 1 : 3 })) });

  it('one number to confirm: the button, and confirming it makes the stamp orderable without the bot', () => {
    const s = toStamp(JSON.parse(written('rect', 'auto', ['יוסי כהן', 'ח.פ. 123456789'])));
    expect(s.orderable).toBe(false);
    expect(s.why).toBe('אשרו או תקנו את המספר 123456789.');
    expect(s.remedy).toEqual({ kind: 'confirm', numbers: ['123456789'] });
    expect(confirmLabel(s.remedy!.kind === 'confirm' ? s.remedy!.numbers : [])).toBe('המספר נכון');
    const ok = confirmedStamp(s.form)!;
    expect(ok.orderable).toBe(true);
    expect(JSON.parse(ok.form).confirmed).toEqual(['123456789']);
    expect(ok.svg).toBe(s.svg); // nothing on the stamp changes
  });

  it('two numbers: the plural button confirms both', () => {
    const s = toStamp(JSON.parse(written('rect', 'auto', ['יוסי כהן', 'ח.פ. 123456789', 'ת.ז. 987654321'])));
    expect(s.why).toBe('אשרו או תקנו את המספרים 123456789, 987654321.');
    expect(s.remedy?.kind === 'confirm' && confirmLabel(s.remedy.numbers)).toBe('המספרים נכונים');
    const ok = confirmedStamp(s.form)!;
    expect(ok.orderable).toBe(true);
    expect(JSON.parse(ok.form).confirmed).toEqual(['123456789', '987654321']);
  });

  it('text too dense for its size: the next size up that has a product, without the bot', () => {
    const lines = ['משרד עורכי דין ונוטריונים', 'ישראל ישראלי ושות׳', 'רחוב הרצל 120 תל אביב יפו', 'טלפון 03-5551234', 'פקס 03-5551235', 'דואר office@example.co.il'];
    const s = toStamp(JSON.parse(written('rect', rect[0], lines)));
    expect(s.why).toBe('הטקסט צפוף מדי למידה הזו: בחרו מידה גדולה יותר או קצרו אותו.');
    expect(s.remedy).toEqual({ kind: 'dense', bigger: true });
    const up = biggerStamp(s.form)!;
    expect(up.size).toBe(rect[1]);
    expect(JSON.parse(up.form).size).toBe(rect[1]);
  });

  it('no larger size: no button, and the redraw refuses', () => {
    const lines = Array.from({ length: 8 }, (_, i) => `שורה ארוכה מאוד מספר ${i + 1} עם עוד הרבה מילים בתוכה`);
    const s = toStamp(JSON.parse(written('square', square.at(-1)!, lines)));
    expect(s.remedy).toEqual({ kind: 'dense', bigger: false });
    expect(biggerStamp(s.form)).toBeNull();
  });

  it('missing details: the placeholder names them as the reason does', () => {
    expect(fixPlaceholder(false, { kind: 'missing', items: 'שם, מספר רישיון' })).toBe('כתבו כאן: שם, מספר רישיון');
    expect(fixPlaceholder(false, { kind: 'confirm', numbers: ['1'] })).toBe('או כתבו את המספר הנכון');
    expect(fixPlaceholder(false, { kind: 'dense', bigger: true })).toBeUndefined();
    expect(fixPlaceholder(false, { kind: 'other' })).toBeUndefined();
    expect(fixPlaceholder(true, { kind: 'missing', items: 'שם' })).toBe('כתבו כאן את התשובה');
  });

  it('too much text or nothing to print: only the correction box', () => {
    expect(toStamp(JSON.parse(written('rect', 'auto', []))).remedy).toEqual({ kind: 'other' });
  });

  it('an unreadable form redraws nothing', () => {
    expect(confirmedStamp('not json')).toBeNull();
    expect(biggerStamp('not json')).toBeNull();
  });
});
