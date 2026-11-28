/** Stage 6, home side: "המשך להזמנה" runs the checkout's production check, so a stamp that cannot be produced is told on its card. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { designerModelForProduct } from '@/designer/models';
import { getProduct } from '@/lib/content';
import { cleanForm } from '@/stamp-bot/form';
import type { OrderAsk } from '@/stamp-bot/card-types';

vi.mock('@/server/settings', () => ({ ensureSettings: async () => undefined }));
// the order action never sends mail; kept out so this test does not depend on the notification code
vi.mock('@/server/notifications', () => ({ notify: async () => [] }));

// the real production check, or a laser file the preflight refuses
const prod = vi.hoisted(() => ({ fail: false }));
vi.mock('@/stamp-bot/production', async (load) => {
  const real = await load<typeof import('@/stamp-bot/production')>();
  return {
    ...real,
    botPreflight: (...a: Parameters<typeof real.botPreflight>) =>
      prod.fail ? [{ severity: 'error' as const, code: 'test', message: 'the laser file cannot be built' }] : real.botPreflight(...a),
  };
});

const SLUG = 'חותמת-פרינט-20';
const FAILED = 'לא הצלחנו להכין את קובץ הייצור של החותמת הזו. נסו לקצר את הטקסט או לבחור מידה אחרת.';

function goodForm() {
  const model = designerModelForProduct(getProduct(SLUG)!)!;
  return JSON.stringify(
    cleanForm({ tmpl: 'written', kind: 'rect', size: `${model.width}x${model.height}`, written: [{ text: 'יוסי כהן', level: 1 }, { text: 'רואה חשבון', level: 3 }] }),
  );
}

const ask = (id: string): OrderAsk => ({ id, form: goodForm(), slug: SLUG, ink: 'black', quantity: 1 });

afterEach(() => {
  prod.fail = false;
});

describe('orderLines runs the production check', () => {
  it('a stamp that can be produced goes through', async () => {
    const { orderLines } = await import('@/stamp-bot/api');
    const res = await orderLines([ask('1')]);
    expect(res.err).toBe(false);
    if (!res.err) expect(res.lines).toHaveLength(1);
  });

  it('a stamp whose production check fails is refused on its own card', async () => {
    const { orderLines } = await import('@/stamp-bot/api');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    prod.fail = true;
    const res = await orderLines([ask('7')]);
    expect(res).toEqual({ err: true, msg: 'חותמת אחת לא עברה להזמנה, התיקון מסומן עליה', cards: [{ id: '7', msg: FAILED }] });
    expect(err).toHaveBeenCalled(); // the reason is logged for the studio
    err.mockRestore();
  });

  it('the checkout keeps its own check with its own message', async () => {
    const { botProductionError } = await import('@/server/orders/service');
    const { botLine } = await import('@/stamp-bot/order');
    const line = botLine(ask('1'));
    if (typeof line === 'string') throw new Error(line);
    expect(botProductionError(line.design, SLUG)).toBeNull();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    prod.fail = true;
    expect(botProductionError(line.design, SLUG)).toBe('the laser file cannot be built');
    err.mockRestore();
  });
});
