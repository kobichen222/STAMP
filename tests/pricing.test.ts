import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, quoteCart, quoteLine } from '@/lib/pricing';

describe('pricing engine', () => {
  it('prices a single stamp at base price', () => {
    expect(quoteLine({ basePrice: 99, quantity: 1 }).total).toBe(99);
  });
  it('applies quantity tiers', () => {
    const q = quoteLine({ basePrice: 100, quantity: 5 });
    expect(q.unitPrice).toBe(90);
    expect(q.total).toBe(450);
    expect(q.lines.some((l) => l.amount < 0)).toBe(true);
  });
  it('adds surcharges from rules', () => {
    const rules = { ...DEFAULT_RULES, ink: { ...DEFAULT_RULES.ink, blue: 5 }, logo: 10 };
    const q = quoteLine({ basePrice: 79, quantity: 1, ink: 'blue', hasLogo: true }, rules);
    expect(q.total).toBe(94);
  });
  it('handles products without a price', () => {
    expect(quoteLine({ basePrice: null, quantity: 2 }).onRequest).toBe(true);
  });
  it('computes shipping, free-shipping threshold and coupons', () => {
    expect(quoteCart([100], { shippingId: 'courier' }).total).toBe(135);
    expect(quoteCart([300], { shippingId: 'courier' }).shipping).toBe(0);
    const rules = { ...DEFAULT_RULES, coupons: [{ code: 'WELCOME10', type: 'percent' as const, value: 10 }] };
    const c = quoteCart([200], { couponCode: 'welcome10' }, rules);
    expect(c.discount).toBe(20);
    expect(c.total).toBe(180);
    expect(quoteCart([200], { couponCode: 'nope' }, rules).couponError).toBeTruthy();
  });
});
