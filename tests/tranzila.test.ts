/** Tranzila invoice lines must always add up to the charged sum. */
import { describe, expect, it } from 'vitest';
import type { Order } from '@/server/orders/types';
import { tranzilaPurchaseData } from '@/server/payments';

const order = (items: number[], shipping: number, total: number) =>
  ({
    items: items.map((t, i) => ({ productName: `P${i}`, size: '40 מ"מ', quantity: 1, total: t })),
    shipping: { label: 'שליח עד הבית' },
    shippingPrice: shipping,
    total,
  }) as unknown as Order;

const sum = (l: { product_price: number }[]) => Math.round(l.reduce((s, x) => s + x.product_price, 0) * 100) / 100;

describe('tranzilaPurchaseData', () => {
  it('lists items and shipping', () => {
    const l = tranzilaPurchaseData(order([100, 49.9], 35, 184.9));
    expect(l.map((x) => x.product_name)).toEqual(['P0 40 מ"מ ×1', 'P1 40 מ"מ ×1', 'שליח עד הבית']);
    expect(sum(l)).toBe(184.9);
  });
  it('spreads a coupon discount and keeps the exact total', () => {
    const l = tranzilaPurchaseData(order([33.33, 33.33, 33.34], 0, 93));
    expect(sum(l)).toBe(93);
    expect(l.every((x) => x.product_price > 0)).toBe(true);
  });
});
