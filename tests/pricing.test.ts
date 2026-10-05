import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, lineInputFor, quoteCart, quoteLine } from '@/lib/pricing';

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

describe('review pricing: ink colour, frame, online discount, add-ons', () => {
  const rectFramed = { shape: 'rect', border: { style: 'single' }, elements: [{ type: 'text' }] };
  it('colour ink and frame cost ₪9 each, then 5% online design discount', () => {
    const q = quoteLine(lineInputFor({ basePrice: 100, quantity: 1, design: rectFramed, ink: 'blue' }));
    expect(q.lines.find((l) => l.label === 'צבע דיו')?.amount).toBe(9);
    expect(q.lines.find((l) => l.label === 'מסגרת')?.amount).toBe(9);
    expect(q.unitPrice).toBeCloseTo(118 * 0.95, 2);
  });
  it('no frame charge for a round stamp ring or a frameless design; black ink is free', () => {
    const round = quoteLine(lineInputFor({ basePrice: 100, quantity: 1, design: { ...rectFramed, shape: 'round' }, ink: 'black' }));
    const none = quoteLine(lineInputFor({ basePrice: 100, quantity: 1, design: { ...rectFramed, border: { style: 'none' } } }));
    expect(round.unitPrice).toBe(95);
    expect(none.unitPrice).toBe(95);
  });
  it('add-ons: fixed prices and an extra identical body at 90% of the unit price', () => {
    const q = quoteLine(lineInputFor({ basePrice: 100, quantity: 1, design: { ...rectFramed, border: { style: 'none' } }, addons: { pad: 1, 'ink-bottle': 2, 'extra-body': 1, certified: 1 } }));
    expect(q.total).toBeCloseTo(95 + 25 + 40 + 95 * 0.9 + 49, 2);
  });
});
