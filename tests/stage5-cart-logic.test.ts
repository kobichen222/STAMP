/** The cart page's pure rules: the green status line and putting a removed line back where it was. */
import { describe, expect, it } from 'vitest';
import { cartStatusText, insertAt } from '@/app/cart/cart-logic';

describe('the green status line', () => {
  it('nothing in the address: no line', () => {
    expect(cartStatusText(null, null)).toBeNull();
    expect(cartStatusText(null, '0')).toBeNull();
    expect(cartStatusText(null, 'x')).toBeNull();
  });
  it('added only: today\'s wording', () => {
    expect(cartStatusText('1', null)).toBe('החותמת נוספה לסל');
    expect(cartStatusText('3', null)).toBe('3 חותמות נוספו לסל');
  });
  it('updated only', () => {
    expect(cartStatusText(null, '1')).toBe('החותמת עודכנה בסל');
    expect(cartStatusText(null, '2')).toBe('2 חותמות עודכנו בסל');
  });
  it('both: the added wording', () => {
    expect(cartStatusText('1', '1')).toBe('החותמת נוספה לסל');
    expect(cartStatusText('2', '3')).toBe('2 חותמות נוספו לסל');
  });
});

describe('putting a removed line back', () => {
  const line = (id: string, extra: object = {}) => ({ id, ...extra });

  it('goes back to the same position with everything it carried', () => {
    const removed = line('b', { quantity: 3, addons: { pad: 1 } });
    const back = insertAt([line('a'), line('c')], removed, 1);
    expect(back.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(back[1]).toBe(removed);
  });
  it('first and last positions', () => {
    expect(insertAt([line('b')], line('a'), 0).map((l) => l.id)).toEqual(['a', 'b']);
    expect(insertAt([line('a')], line('b'), 1).map((l) => l.id)).toEqual(['a', 'b']);
  });
  it('the only line, back into an empty cart', () => {
    expect(insertAt([], line('a'), 0).map((l) => l.id)).toEqual(['a']);
  });
  it('a position past the end of a list that got shorter goes last', () => {
    expect(insertAt([line('a')], line('z'), 5).map((l) => l.id)).toEqual(['a', 'z']);
  });
  it('a line whose id is already in the cart is not doubled', () => {
    const list = [line('a'), line('b')];
    expect(insertAt(list, line('a'), 1)).toBe(list);
  });
});
