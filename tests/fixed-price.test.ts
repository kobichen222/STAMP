import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, quoteCart, quoteLine } from '@/lib/pricing';

/** A fixed-price product (the notary seal, 780 ₪) is never discounted. */
describe('fixed price lines', () => {
  it('ignores quantity tiers and the online-design discount', () => {
    const q = quoteLine({ basePrice: 780, quantity: 10, designedOnline: true, fixedPrice: true });
    expect(q.unitPrice).toBe(780);
    expect(q.total).toBe(7800);
    expect(q.lines).toEqual([{ label: 'מחיר קבוע', amount: 780 }]);
  });
  it('ignores ink / body / frame surcharges', () => {
    const q = quoteLine({ basePrice: 780, quantity: 1, ink: 'blue', body: 'red', hasFrame: true, fixedPrice: true });
    expect(q.total).toBe(780);
  });
  it('is excluded from the coupon base', () => {
    const rules = { ...DEFAULT_RULES, coupons: [{ code: 'TEN', type: 'percent' as const, value: 10 }] };
    const cart = quoteCart([780, 100], { couponCode: 'TEN', couponExempt: 780, shippingId: 'pickup' }, rules);
    expect(cart.discount).toBe(10);
  });
});
