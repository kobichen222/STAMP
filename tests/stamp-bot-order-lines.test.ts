/** "Continue to order" on the home page: a stamp that cannot be ordered comes back with the id of its card. */
import { describe, expect, it, vi } from 'vitest';
import { designerModelForProduct } from '@/designer/models';
import { getProduct } from '@/lib/content';
import { cleanForm } from '@/stamp-bot/form';
import type { OrderAsk } from '@/stamp-bot/card-types';

vi.mock('@/server/settings', () => ({ ensureSettings: async () => undefined }));

const SLUG = 'חותמת-פרינט-20';
const UNREADABLE = 'לא הצלחנו לקרוא את החותמת. נסו ליצור אותה שוב.';

function goodForm() {
  const product = getProduct(SLUG);
  const model = product && designerModelForProduct(product);
  if (!model) throw new Error(`no product ${SLUG}`);
  const form = cleanForm({
    tmpl: 'written',
    kind: 'rect',
    size: `${model.width}x${model.height}`,
    written: [
      { text: 'יוסי כהן', level: 1 },
      { text: 'רואה חשבון', level: 3 },
    ],
  });
  return JSON.stringify(form);
}

const ask = (id: string, form = goodForm(), slug = SLUG): OrderAsk => ({ id, form, slug, ink: 'black', quantity: 1 });

describe('orderLines', () => {
  it('all good: the cart lines', async () => {
    const { orderLines } = await import('@/stamp-bot/api');
    const res = await orderLines([ask('1'), ask('2')]);
    expect(res.err).toBe(false);
    if (!res.err) expect(res.lines).toHaveLength(2);
  });

  it('one stamp fails: its card id and reason, and the line under the bar', async () => {
    const { orderLines } = await import('@/stamp-bot/api');
    const res = await orderLines([ask('7'), ask('9', 'not json')]);
    expect(res).toEqual({ err: true, msg: 'חותמת אחת לא עברה להזמנה, התיקון מסומן עליה', cards: [{ id: '9', msg: UNREADABLE }] });
  });

  it('several fail: every one of them, by card', async () => {
    const { orderLines } = await import('@/stamp-bot/api');
    const res = await orderLines([ask('a', 'x'), ask('b'), ask('c', goodForm(), 'no-such-product')]);
    expect(res.err).toBe(true);
    if (!res.err) return;
    expect(res.msg).toBe('2 חותמות לא עברו להזמנה, התיקון מסומן עליהן');
    expect(res.cards?.map((c) => c.id)).toEqual(['a', 'c']);
    expect(res.cards?.[0].msg).toBe(UNREADABLE);
    expect(res.cards?.[1].msg).toBe('הדגם הזה לא זמין לחותמת במידה הזו.');
  });

  it('a stamp sent without a card id is told under the bar by its number, as before', async () => {
    const { orderLines } = await import('@/stamp-bot/api');
    const { id: _id, ...noId } = ask('x', 'x');
    void _id;
    const res = await orderLines([ask('1'), noId as OrderAsk]);
    expect(res).toEqual({ err: true, msg: `חותמת 2: ${UNREADABLE}`, cards: [] });
  });

  it('errors that belong to no card stay as they were', async () => {
    const { orderLines } = await import('@/stamp-bot/api');
    expect(await orderLines([])).toEqual({ err: true, msg: 'לא נבחרו חותמות להזמנה' });
  });
});
