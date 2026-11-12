import { describe, expect, it } from 'vitest';
import { buildReport, isAbandoned, resolveRange } from '@/lib/reports';
import type { Order } from '@/server/orders/types';

const order = (id: string, createdAt: string, over: Partial<Order> = {}): Order =>
  ({
    id,
    createdAt,
    status: 'DELIVERED',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    customer: { name: 'דנה', phone: '050-1234567' },
    shipping: { method: 'courier', label: 'שליח', price: 29, address: { street: 'הרצל 1', city: 'חיפה' } },
    items: [{ productName: 'C20', size: '38×14', ink: 'black', quantity: 2, total: 200, addons: { pad: 1 } }],
    subtotal: 200,
    discount: 0,
    shippingPrice: 29,
    total: 229,
    audit: [],
    ...over,
  }) as unknown as Order;

const now = new Date('2026-11-12T10:00:00Z');

describe('reports', () => {
  it('resolves presets and custom ranges in Israel days', () => {
    expect(resolveRange({ range: '7' }, [], now)).toMatchObject({ from: '2026-11-06', to: '2026-11-12', days: 7 });
    expect(resolveRange({ days: '90' }, [], now).days).toBe(90);
    expect(resolveRange({ from: '2026-11-10', to: '2026-11-01' }, [], now)).toMatchObject({ preset: 'custom', from: '2026-11-01', to: '2026-11-10', days: 10 });
    expect(resolveRange({ range: 'all' }, [order('a', '2026-10-01T08:00:00Z')], now).from).toBe('2026-10-01');
  });

  it('counts sales, leaves abandoned checkouts out and compares with the previous period', () => {
    const orders = [
      order('a', '2026-11-11T08:00:00Z'),
      order('b', '2026-11-10T08:00:00Z', { customer: { name: 'רון', phone: '0521111111' } }),
      order('c', '2026-11-10T09:00:00Z', { status: 'PAYMENT_PENDING', paymentStatus: 'unpaid' }),
      order('d', '2026-11-09T09:00:00Z', { status: 'PAYMENT_PENDING', paymentStatus: 'unpaid', paymentMethod: 'manual' }),
      order('e', '2026-11-08T09:00:00Z', { status: 'CANCELLED' }),
      order('f', '2026-11-02T09:00:00Z'),
    ];
    expect(isAbandoned(orders[2])).toBe(true);
    expect(isAbandoned(orders[3])).toBe(false);
    const r = buildReport(orders, resolveRange({ range: '7' }, orders, now));
    expect(r.kpis.orders).toEqual({ value: 3, prev: 1 });
    expect(r.kpis.revenue.value).toBe(687);
    expect(r.kpis.stamps.value).toBe(6);
    expect(Math.round(r.kpis.conversion.value)).toBe(75);
    expect(r.extra).toMatchObject({ abandonedCount: 1, lostCount: 1, newCustomers: 1, returningCustomers: 1 });
    expect(r.series).toHaveLength(7);
    expect(r.series.reduce((s, b) => s + b.revenue, 0)).toBe(687);
    expect(r.series.reduce((s, b) => s + (b.prevRevenue ?? 0), 0)).toBe(229);
    expect(r.funnel.map((f) => f.count)).toEqual([5, 3, 2, 2]);
    expect(r.breakdowns.find((b) => b.id === 'cities')!.rows[0]).toMatchObject({ label: 'חיפה', count: 3 });
    expect(r.heat.total).toBe(3);
  });

  it('buckets a single day by hour and a long range by week', () => {
    const orders = [order('a', '2026-11-12T08:30:00Z')];
    const day = buildReport(orders, resolveRange({ range: 'today' }, orders, now));
    expect(day.granularity).toBe('hour');
    expect(day.series[10].orders).toBe(1);
    expect(buildReport(orders, resolveRange({ range: '365' }, orders, now)).granularity).toBe('week');
  });
});
