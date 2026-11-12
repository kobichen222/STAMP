/** The shipping & pickup calendar: every order lands on the right day and track, from its status history alone. */
import { describe, expect, it } from 'vitest';
import { buildWeek, courierDay, eventsOf, weekStart } from '@/lib/ship-calendar';
import type { Order } from '@/server/orders/types';

// Wednesday 11.11.2026, 10:00 in Israel (UTC+2).
const now = new Date('2026-11-11T08:00:00Z');
const order = (over: Partial<Order> & { audit?: Order['audit'] }): Order =>
  ({
    id: 'ORD-1',
    status: 'READY_FOR_SHIPPING',
    createdAt: '2026-11-09T08:00:00Z',
    updatedAt: '2026-11-11T07:00:00Z',
    customer: { name: 'דנה לוי', phone: '0501234567' },
    shipping: { method: 'courier', label: 'שליח עד הבית', price: 35 },
    audit: [],
    ...over,
  }) as unknown as Order;
const st = (at: string, to: string) => ({ at, actor: 'admin', action: 'status', to }) as Order['audit'][number];

describe('shipping & pickup calendar', () => {
  it('books the courier for the same day before 13:00, otherwise the next working day', () => {
    expect(courierDay('2026-11-11T08:00:00Z')).toBe('2026-11-11'); // Wed 10:00
    expect(courierDay('2026-11-11T12:30:00Z')).toBe('2026-11-12'); // Wed 14:30 → Thu
    expect(courierDay('2026-11-12T12:30:00Z')).toBe('2026-11-15'); // Thu 14:30 → Sunday
    expect(courierDay('2026-11-13T07:00:00Z')).toBe('2026-11-15'); // Friday → Sunday
    expect(weekStart('2026-11-11')).toBe('2026-11-08');
  });

  it('a ready courier order waits in the pickup window – booked or not', () => {
    const ready = st('2026-11-11T07:00:00Z', 'READY_FOR_SHIPPING');
    const [a] = eventsOf(order({ audit: [ready] }), now);
    expect(a).toMatchObject({ track: 'courier', kind: 'courier-unbooked', day: '2026-11-11', time: '13:00–17:00' });
    const [b] = eventsOf(order({ audit: [ready, { at: '2026-11-11T07:30:00Z', actor: 'admin', action: 'shipment_created' }], shipping: { method: 'courier', label: 'שליח עד הבית', price: 35, trackingNumber: '100' } as Order['shipping'] }), now);
    expect(b).toMatchObject({ kind: 'courier-waiting', day: '2026-11-11', tracking: '100' });
  });

  it('an order the courier has not taken rolls on to today, marked late', () => {
    const [e] = eventsOf(order({ audit: [st('2026-11-09T07:00:00Z', 'READY_FOR_SHIPPING')] }), now);
    expect(e).toMatchObject({ day: '2026-11-11', waitingDays: 2 });
  });

  it('collected and delivered land on the time of the status change', () => {
    const ev = eventsOf(order({ status: 'DELIVERED', audit: [st('2026-11-09T07:00:00Z', 'READY_FOR_SHIPPING'), st('2026-11-09T12:10:00Z', 'SHIPPED'), st('2026-11-10T09:05:00Z', 'DELIVERED')] }), now);
    expect(ev.map((e) => [e.kind, e.day, e.time])).toEqual([
      ['courier-collected', '2026-11-09', '14:10'],
      ['courier-delivered', '2026-11-10', '11:05'],
    ]);
  });

  it('self-pickup: ready on its day, still waiting today, collected when handed over', () => {
    const pickup = { method: 'pickup', label: 'איסוף עצמי', price: 0 } as Order['shipping'];
    const waiting = eventsOf(order({ shipping: pickup, audit: [st('2026-11-09T09:00:00Z', 'READY_FOR_SHIPPING')] }), now);
    expect(waiting.map((e) => [e.kind, e.day])).toEqual([
      ['pickup-ready', '2026-11-09'],
      ['pickup-waiting', '2026-11-11'],
    ]);
    expect(waiting[1].waitingDays).toBe(2);
    const done = eventsOf(order({ shipping: pickup, status: 'DELIVERED', audit: [st('2026-11-09T09:00:00Z', 'READY_FOR_SHIPPING'), st('2026-11-10T13:00:00Z', 'DELIVERED')] }), now);
    expect(done.map((e) => [e.kind, e.day, e.time])).toEqual([
      ['pickup-ready', '2026-11-09', '11:00'],
      ['pickup-collected', '2026-11-10', '15:00'],
    ]);
  });

  it('cancelled and unpaid orders are not on the calendar; the week has seven days', () => {
    expect(eventsOf(order({ status: 'CANCELLED' }), now)).toEqual([]);
    expect(eventsOf(order({ status: 'PAYMENT_PENDING' }), now)).toEqual([]);
    const week = buildWeek([order({ audit: [st('2026-11-11T07:00:00Z', 'READY_FOR_SHIPPING')] })], '2026-11-08', now);
    expect(week).toHaveLength(7);
    expect(week[3].courier).toHaveLength(1);
  });
});
