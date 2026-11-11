/** The morning queue e-mail: grouping and counts (store mocked). */
import { describe, expect, it, vi } from 'vitest';
import type { Order } from '@/server/orders/types';

const now = new Date('2026-11-11T06:00:00Z');
const mk = (id: string, status: Order['status'], hoursAgo: number, extra: Partial<Order> = {}) =>
  ({
    id,
    status,
    createdAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
    paymentStatus: 'paid',
    paymentMethod: 'tranzila',
    total: 147,
    customer: { name: `לקוח ${id}`, phone: '0501234567' },
    shipping: { method: 'courier', label: 'שליח עד הבית', price: 35 },
    items: [{ productName: 'PRINT R 540', size: '40 מ"מ', quantity: 1 }],
    ...extra,
  }) as unknown as Order;

const orders = [
  mk('ORD-A', 'READY_FOR_PRODUCTION', 3, { urgent: true }),
  mk('ORD-B', 'READY_FOR_SHIPPING', 30, { shipping: { method: 'pickup', label: 'איסוף עצמי', price: 0 } }),
  mk('ORD-C', 'READY_FOR_SHIPPING', 50),
  mk('ORD-D', 'IN_PRODUCTION', 10),
  mk('ORD-E', 'DELIVERED', 5),
  mk('ORD-F', 'PAYMENT_PENDING', 2, { paymentStatus: 'pending' }),
];

vi.mock('server-only', () => ({}));
vi.mock('@/server/store', () => ({ getStore: () => ({ listOrders: async () => orders }) }));

describe('daily report', () => {
  it('groups the open orders and counts the new ones', async () => {
    const { buildDailyReport } = await import('@/server/daily-report');
    const r = await buildDailyReport(now);
    expect(r.counts).toEqual({ fresh: 3, work: 4, urgent: 1, open: 5 });
    expect(r.html).toContain('מוכן לאיסוף');
    expect(r.html).toContain('מוכן למשלוח');
    expect(r.html).toContain('מחכה לייצור');
    expect(r.html.split('ORD-E/').length - 1).toBe(1); // only in "new", not in the open queue
    if (process.env.REPORT_OUT) (await import('node:fs')).writeFileSync(process.env.REPORT_OUT, r.html);
  });
});
