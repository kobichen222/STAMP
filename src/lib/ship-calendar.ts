import type { Order, OrderStatus } from '@/server/orders/types';

/**
 * The shipping & pickup calendar: where every order sits on the week, derived only from its status
 * history – so it updates by itself whenever a status changes.
 *
 * Two tracks:
 *  - courier: waits for the courier (pickup window) → collected by the courier → delivered
 *  - pickup:  ready for self-pickup (and still waiting, day after day) → collected by the customer
 */

export type Track = 'courier' | 'pickup';
export type EventKind =
  | 'courier-waiting' // ready, a courier was ordered – in today's (or the next) pickup window
  | 'courier-unbooked' // ready, no courier ordered yet
  | 'courier-collected' // the courier took it
  | 'courier-delivered'
  | 'pickup-ready' // became ready for self-pickup
  | 'pickup-waiting' // still waiting for the customer today
  | 'pickup-collected';

export interface CalEvent {
  id: string;
  track: Track;
  kind: EventKind;
  /** YYYY-MM-DD in Israel time. */
  day: string;
  /** "13:00–17:00" or "09:42"; empty for all-day. */
  time: string;
  /** Sort key within the day (minutes from midnight). */
  minute: number;
  orderId: string;
  customer: string;
  phone: string;
  label: string;
  city?: string;
  tracking?: string;
  urgent?: boolean;
  /** Days the order has been waiting (pickup-waiting / late courier). */
  waitingDays?: number;
}

/** The courier collects from the studio in this window, Sunday–Thursday; orders booked after the cut-off go out the next working day. */
export const COURIER_WINDOW = { from: 13, to: 17, label: '13:00–17:00' };
const TZ = 'Asia/Jerusalem';
const DONE: OrderStatus[] = ['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'];

export const dayKey = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const hm = (d: Date | string) => new Date(d).toLocaleTimeString('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const minuteOf = (d: Date | string) => {
  const [h, m] = hm(d).split(':').map(Number);
  return h * 60 + m;
};
/** Calendar arithmetic on a YYYY-MM-DD key (noon UTC keeps it clear of DST edges). */
export const addDays = (key: string, n: number) => new Date(Date.parse(`${key}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const weekday = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay(); // 0 = Sunday
const isWorkday = (key: string) => weekday(key) <= 4; // Sunday–Thursday
const nextWorkday = (key: string) => {
  let k = addDays(key, 1);
  while (!isWorkday(k)) k = addDays(k, 1);
  return k;
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
/** The Sunday that starts the week of `key`. */
export const weekStart = (key: string) => addDays(key, -weekday(key));

/** The day the courier will collect an order that became ready / was booked at `at`. */
export function courierDay(at: Date | string): string {
  const day = dayKey(at);
  if (isWorkday(day) && minuteOf(at) < COURIER_WINDOW.from * 60) return day;
  return nextWorkday(day);
}

const lastAt = (o: Order, pred: (a: Order['audit'][number]) => boolean) => [...o.audit].reverse().find(pred)?.at;

export function eventsOf(o: Order, now: Date = new Date()): CalEvent[] {
  if (DONE.includes(o.status)) return [];
  const today = dayKey(now);
  const base = {
    orderId: o.id,
    customer: o.customer.company || o.customer.name,
    phone: o.customer.phone,
    label: o.shipping.label,
    city: o.shipping.address?.city,
    tracking: o.shipping.trackingNumber,
    urgent: o.urgent,
  };
  const readyAt = lastAt(o, (a) => a.action === 'status' && a.to === 'READY_FOR_SHIPPING');
  const shippedAt = lastAt(o, (a) => a.action === 'status' && a.to === 'SHIPPED');
  const deliveredAt = lastAt(o, (a) => a.action === 'status' && a.to === 'DELIVERED');
  const bookedAt = o.shipping.trackingNumber ? lastAt(o, (a) => a.action === 'shipment_created' || a.action === 'tracking') : undefined;
  const out: CalEvent[] = [];
  const at = (kind: EventKind, track: Track, when: string, extra: Partial<CalEvent> = {}): CalEvent => ({ id: `${o.id}:${kind}`, track, kind, day: dayKey(when), time: hm(when), minute: minuteOf(when), ...base, ...extra });

  if (o.shipping.method === 'pickup') {
    if (readyAt && ['READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'].includes(o.status)) out.push(at('pickup-ready', 'pickup', readyAt));
    const collectedAt = deliveredAt ?? (o.status === 'SHIPPED' ? shippedAt : undefined);
    if (collectedAt) out.push(at('pickup-collected', 'pickup', collectedAt));
    else if (o.status === 'READY_FOR_SHIPPING') {
      const since = dayKey(readyAt ?? o.updatedAt ?? o.createdAt);
      // Still on the shelf: it shows on today as well, with the days it has been waiting.
      if (since !== today || !readyAt) out.push({ id: `${o.id}:pickup-waiting`, track: 'pickup', kind: 'pickup-waiting', day: today, time: '', minute: 0, ...base, waitingDays: Math.max(0, daysBetween(since, today)) });
    }
    return out;
  }

  if (o.status === 'READY_FOR_SHIPPING') {
    const planned = courierDay(bookedAt ?? readyAt ?? o.updatedAt ?? o.createdAt);
    // Never in the past: an order the courier has not taken yet rolls on to today (or the next working day).
    const day = planned >= today ? planned : isWorkday(today) ? today : nextWorkday(today);
    out.push({
      id: `${o.id}:courier`,
      track: 'courier',
      kind: bookedAt ? 'courier-waiting' : 'courier-unbooked',
      day,
      time: COURIER_WINDOW.label,
      minute: COURIER_WINDOW.from * 60,
      ...base,
      waitingDays: planned < today ? daysBetween(planned, today) : undefined,
    });
  }
  if (shippedAt && ['SHIPPED', 'DELIVERED'].includes(o.status)) out.push(at('courier-collected', 'courier', shippedAt));
  if (deliveredAt && o.status === 'DELIVERED') out.push(at('courier-delivered', 'courier', deliveredAt));
  return out;
}

export interface CalDay {
  key: string;
  courier: CalEvent[];
  pickup: CalEvent[];
}

/** The seven days from `start` (a Sunday), each with its events in time order (urgent first within the same time). */
export function buildWeek(orders: Order[], start: string, now: Date = new Date()): CalDay[] {
  const events = orders.flatMap((o) => eventsOf(o, now));
  const sort = (a: CalEvent, b: CalEvent) => a.minute - b.minute || Number(!!b.urgent) - Number(!!a.urgent) || a.orderId.localeCompare(b.orderId);
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(start, i);
    const of = (t: Track) => events.filter((e) => e.day === key && e.track === t).sort(sort);
    return { key, courier: of('courier'), pickup: of('pickup') };
  });
}

/** Orders still being made, per track – what will reach the calendar next. */
export function inTheWorks(orders: Order[]) {
  const making: OrderStatus[] = ['PAID', 'PREFLIGHT', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_CHECK'];
  const list = orders.filter((o) => making.includes(o.status));
  return { courier: list.filter((o) => o.shipping.method !== 'pickup').length, pickup: list.filter((o) => o.shipping.method === 'pickup').length };
}
