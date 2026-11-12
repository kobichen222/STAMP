import { INK_COLORS } from '@/designer/types';
import { ADDONS } from '@/lib/pricing';
import { statusLabel, type Order, type OrderStatus } from '@/server/orders/types';

/**
 * Everything the admin reports page shows, computed from the orders in one pass-friendly, pure
 * function (no I/O), so the numbers on the page always agree with each other and can be tested.
 * Days are Israel calendar days, written YYYY-MM-DD.
 */

const TZ = 'Asia/Jerusalem';
const DAY = 86_400_000;

export const PRESETS = ['today', '7', '30', '90', '365', 'all'] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_LABEL: Record<Preset, string> = { today: 'היום', '7': '7 ימים', '30': '30 ימים', '90': '90 ימים', '365': 'שנה', all: 'הכל' };

export const dayKey = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const keyMs = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
export const addDays = (k: string, n: number) => new Date(keyMs(k) + n * DAY).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((keyMs(b) - keyMs(a)) / DAY);
const isKey = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(keyMs(s));
const hourOf = (iso: string) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(iso)));
const shortDate = (k: string) => `${+k.slice(8, 10)}.${+k.slice(5, 7)}`;
const MONTHS = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export interface Range {
  preset: Preset | 'custom';
  from: string;
  to: string; // inclusive
  days: number;
  label: string;
}

/** The period asked for in the URL: a preset, or custom from/to dates (either order). */
export function resolveRange(sp: { range?: string; days?: string; from?: string; to?: string }, orders: Pick<Order, 'createdAt'>[], now = new Date()): Range {
  const today = dayKey(now);
  const mk = (preset: Range['preset'], from: string, to: string): Range => ({ preset, from, to, days: diffDays(from, to) + 1, label: from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}` });
  if (isKey(sp.from) && isKey(sp.to)) {
    const [a, b] = sp.from <= sp.to ? [sp.from, sp.to] : [sp.to, sp.from];
    return mk('custom', a, b > today ? today : b);
  }
  const p = (PRESETS as readonly string[]).includes(sp.range ?? '') ? (sp.range as Preset) : (PRESETS as readonly string[]).includes(sp.days ?? '') ? (sp.days as Preset) : '30';
  if (p === 'today') return mk(p, today, today);
  if (p === 'all') {
    const first = orders.reduce((m, o) => (o.createdAt < m ? o.createdAt : m), now.toISOString());
    return mk(p, dayKey(first), today);
  }
  return mk(p, addDays(today, -(Number(p) - 1)), today);
}

const ABANDONED: OrderStatus[] = ['PAYMENT_PENDING', 'PAYMENT_FAILED'];
const LOST: OrderStatus[] = ['CANCELLED', 'REFUNDED'];
const PRODUCED: OrderStatus[] = ['READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'];
const OPEN_FLOW: OrderStatus[] = ['PAID', 'PREFLIGHT', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'PRODUCTION_FILE_ERROR', 'READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING', 'SHIPPED'];

/** A card checkout that never completed; a manual (phone / bank) order counts as a real order. */
export const isAbandoned = (o: Order) => ABANDONED.includes(o.status) && !(o.status === 'PAYMENT_PENDING' && o.paymentMethod === 'manual');
export const isSale = (o: Order) => !isAbandoned(o) && !LOST.includes(o.status);

const customerKey = (o: Order) => o.customer.phone.replace(/\D/g, '').replace(/^972/, '0') || (o.customer.email ?? '').toLowerCase() || o.id;
const stampsOf = (o: Order) => o.items.reduce((n, i) => n + i.quantity, 0);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

export interface Kpi {
  value: number;
  prev: number | null;
}
export interface Bucket {
  key: string;
  label: string;
  long: string;
  revenue: number;
  orders: number;
  stamps: number;
  prevRevenue: number | null;
  prevOrders: number | null;
}
export interface Row {
  label: string;
  count: number;
  revenue: number;
}
export interface Breakdown {
  id: string;
  label: string;
  unit: string;
  hasRevenue: boolean;
  rows: Row[];
}
export interface Report {
  range: Range;
  prev: { from: string; to: string; label: string } | null;
  granularity: 'hour' | 'day' | 'week' | 'month';
  kpis: Record<'revenue' | 'orders' | 'aov' | 'stamps' | 'customers' | 'conversion' | 'returning' | 'discounts', Kpi>;
  extra: { paid: number; unpaid: number; shippingIncome: number; abandonedCount: number; abandonedValue: number; lostCount: number; lostValue: number; newCustomers: number; returningCustomers: number; couponOrders: number; urgent: number };
  series: Bucket[];
  heat: { counts: number[][]; max: number; total: number };
  funnel: { label: string; hint: string; count: number; value: number }[];
  breakdowns: Breakdown[];
  topCustomers: { name: string; phone: string; orders: number; revenue: number; last: string; isNew: boolean }[];
  ops: { toReadyHours: number | null; toDeliveredHours: number | null; sample: number; open: Row[]; openTotal: number };
  insights: { title: string; text: string }[];
}

function bucketize(range: Range): { granularity: Report['granularity']; keys: { key: string; label: string; long: string }[]; index: (o: Order, from: string) => number } {
  const { from, days } = range;
  if (days === 1) {
    return {
      granularity: 'hour',
      keys: Array.from({ length: 24 }, (_, h) => ({ key: String(h), label: `${String(h).padStart(2, '0')}:00`, long: `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00` })),
      index: (o) => hourOf(o.createdAt),
    };
  }
  if (days <= 92) {
    return {
      granularity: 'day',
      keys: Array.from({ length: days }, (_, i) => {
        const k = addDays(from, i);
        return { key: k, label: shortDate(k), long: `יום ${WEEKDAYS[new Date(keyMs(k)).getUTCDay()]} ${shortDate(k)}` };
      }),
      index: (o, f) => diffDays(f, dayKey(o.createdAt)),
    };
  }
  if (days <= 400) {
    const n = Math.ceil(days / 7);
    return {
      granularity: 'week',
      keys: Array.from({ length: n }, (_, i) => {
        const a = addDays(from, i * 7);
        const b = addDays(from, Math.min(days - 1, i * 7 + 6));
        return { key: a, label: shortDate(a), long: `שבוע ${shortDate(a)} – ${shortDate(b)}` };
      }),
      index: (o, f) => Math.floor(diffDays(f, dayKey(o.createdAt)) / 7),
    };
  }
  const months: { key: string; label: string; long: string }[] = [];
  for (let y = +from.slice(0, 4), m = +from.slice(5, 7); `${y}-${String(m).padStart(2, '0')}` <= range.to.slice(0, 7); m === 12 ? (y++, (m = 1)) : m++) {
    months.push({ key: `${y}-${String(m).padStart(2, '0')}`, label: `${MONTHS[m - 1]} ${String(y).slice(2)}`, long: `${MONTHS[m - 1]} ${y}` });
  }
  const pos = new Map(months.map((m, i) => [m.key, i]));
  return { granularity: 'month', keys: months, index: (o) => pos.get(dayKey(o.createdAt).slice(0, 7)) ?? -1 };
}

export function buildReport(all: Order[], range: Range): Report {
  const inRange = (o: Order, from: string, to: string) => {
    const k = dayKey(o.createdAt);
    return k >= from && k <= to;
  };
  const prev = range.preset === 'all' ? null : { from: addDays(range.from, -range.days), to: addDays(range.from, -1) };
  const cur = all.filter((o) => inRange(o, range.from, range.to));
  const old = prev ? all.filter((o) => inRange(o, prev.from, prev.to)) : [];
  const sales = cur.filter(isSale);
  const oldSales = old.filter(isSale);

  // Who bought before this period started – tells new customers from returning ones.
  const firstSale = new Map<string, string>();
  for (const o of all) {
    if (!isSale(o)) continue;
    const k = customerKey(o);
    const d = dayKey(o.createdAt);
    if (!firstSale.has(k) || d < firstSale.get(k)!) firstSale.set(k, d);
  }
  const people = (list: Order[], from: string) => {
    const keys = new Set(list.map(customerKey));
    let returning = 0;
    for (const k of keys) if ((firstSale.get(k) ?? from) < from) returning++;
    return { total: keys.size, returning, fresh: keys.size - returning };
  };
  const ppl = people(sales, range.from);
  const oldPpl = prev ? people(oldSales, prev.from) : null;

  const sum = (list: Order[], f: (o: Order) => number) => list.reduce((s, o) => s + f(o), 0);
  const stats = (list: Order[], everything: Order[]) => {
    const revenue = sum(list, (o) => o.total);
    const started = list.length + everything.filter(isAbandoned).length;
    return { revenue, orders: list.length, aov: list.length ? revenue / list.length : 0, stamps: sum(list, stampsOf), conversion: started ? (list.length / started) * 100 : 0, discounts: sum(list, (o) => o.discount) };
  };
  const a = stats(sales, cur);
  const b = prev ? stats(oldSales, old) : null;
  const kpi = (value: number, p: number | null | undefined): Kpi => ({ value, prev: p ?? null });

  // Time series, with the previous period laid over it bucket by bucket.
  const bz = bucketize(range);
  const series: Bucket[] = bz.keys.map((k) => ({ ...k, revenue: 0, orders: 0, stamps: 0, prevRevenue: prev && bz.granularity !== 'month' ? 0 : null, prevOrders: prev && bz.granularity !== 'month' ? 0 : null }));
  for (const o of sales) {
    const s = series[bz.index(o, range.from)];
    if (!s) continue;
    s.revenue += o.total;
    s.orders++;
    s.stamps += stampsOf(o);
  }
  if (prev && bz.granularity !== 'month') {
    for (const o of oldSales) {
      const s = series[bz.index(o, prev.from)];
      if (!s) continue;
      s.prevRevenue = (s.prevRevenue ?? 0) + o.total;
      s.prevOrders = (s.prevOrders ?? 0) + 1;
    }
  }

  // When orders come in: weekday × hour.
  const counts = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const o of sales) counts[new Date(keyMs(dayKey(o.createdAt))).getUTCDay()][hourOf(o.createdAt)]++;
  const heatMax = Math.max(0, ...counts.flat());

  const abandoned = cur.filter(isAbandoned);
  const lost = cur.filter((o) => LOST.includes(o.status));
  const produced = sales.filter((o) => PRODUCED.includes(o.status));
  const delivered = sales.filter((o) => o.status === 'DELIVERED' || o.status === 'PARTIALLY_REFUNDED');
  const funnel = [
    { label: 'התחילו הזמנה', hint: 'הגיעו לשלב התשלום', count: cur.length, value: sum(cur, (o) => o.total) },
    { label: 'הזמנות בפועל', hint: 'שולמו או נסגרו מול הסטודיו', count: sales.length, value: a.revenue },
    { label: 'יוצרו', hint: 'מוכנות, נשלחו או נמסרו', count: produced.length, value: sum(produced, (o) => o.total) },
    { label: 'נמסרו ללקוח', hint: 'הושלמו', count: delivered.length, value: sum(delivered, (o) => o.total) },
  ];

  const group = (pairs: [string, number, number][]): Row[] => {
    const m = new Map<string, Row>();
    for (const [label, count, revenue] of pairs) {
      const r = m.get(label) ?? { label, count: 0, revenue: 0 };
      r.count += count;
      r.revenue += revenue;
      m.set(label, r);
    }
    return [...m.values()].sort((x, y) => y.revenue - x.revenue || y.count - x.count);
  };
  const items = sales.flatMap((o) => o.items);
  const payLabel = (o: Order) => (o.paymentMethod === 'manual' ? 'תשלום מול הסטודיו' : 'כרטיס אשראי באתר');
  const breakdowns: Breakdown[] = [
    { id: 'products', label: 'מוצרים', unit: 'יח׳', hasRevenue: true, rows: group(items.map((i) => [i.productName, i.quantity, i.total])) },
    { id: 'sizes', label: 'מידות', unit: 'יח׳', hasRevenue: true, rows: group(items.map((i) => [i.size, i.quantity, i.total])) },
    { id: 'inks', label: 'צבעי דיו', unit: 'יח׳', hasRevenue: true, rows: group(items.map((i) => [INK_COLORS[i.ink]?.label ?? String(i.ink), i.quantity, i.total])) },
    {
      id: 'addons',
      label: 'תוספות',
      unit: 'יח׳',
      hasRevenue: false,
      rows: group(items.flatMap((i) => Object.entries(i.addons ?? {}).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => [ADDONS.find((x) => x.id === k)?.label ?? k, n ?? 0, 0] as [string, number, number]))),
    },
    { id: 'shipping', label: 'משלוח ואיסוף', unit: 'הזמנות', hasRevenue: true, rows: group(sales.map((o) => [o.shipping.label, 1, o.total])) },
    { id: 'payment', label: 'אמצעי תשלום', unit: 'הזמנות', hasRevenue: true, rows: group(sales.map((o) => [payLabel(o), 1, o.total])) },
    { id: 'cities', label: 'ערים', unit: 'הזמנות', hasRevenue: true, rows: group(sales.filter((o) => o.shipping.address?.city?.trim()).map((o) => [o.shipping.address!.city.trim(), 1, o.total])) },
    { id: 'coupons', label: 'קופונים', unit: 'שימושים', hasRevenue: true, rows: group(sales.filter((o) => o.couponCode).map((o) => [o.couponCode!.toUpperCase(), 1, o.total])) },
  ];

  const byCustomer = new Map<string, { name: string; phone: string; orders: number; revenue: number; last: string; isNew: boolean }>();
  for (const o of sales) {
    const k = customerKey(o);
    const c = byCustomer.get(k) ?? { name: o.customer.company || o.customer.name, phone: o.customer.phone, orders: 0, revenue: 0, last: o.createdAt, isNew: (firstSale.get(k) ?? range.from) >= range.from };
    c.orders++;
    c.revenue += o.total;
    if (o.createdAt > c.last) c.last = o.createdAt;
    byCustomer.set(k, c);
  }
  const topCustomers = [...byCustomer.values()].sort((x, y) => y.revenue - x.revenue).slice(0, 8);

  // How long the studio takes: from the order coming in to ready, and to delivered.
  const hoursTo = (o: Order, targets: OrderStatus[]) => {
    const e = o.audit.find((x) => x.to && targets.includes(x.to));
    return e ? (Date.parse(e.at) - Date.parse(o.createdAt)) / 3_600_000 : null;
  };
  const ready = sales.map((o) => hoursTo(o, ['READY_FOR_SHIPPING', 'SHIPPED'])).filter((x): x is number => x !== null && x >= 0);
  const done = sales.map((o) => hoursTo(o, ['DELIVERED'])).filter((x): x is number => x !== null && x >= 0);
  const openOrders = all.filter((o) => OPEN_FLOW.includes(o.status));
  const open = group(openOrders.map((o) => [statusLabel(o.status, o.shipping.method), 1, o.total])).sort((x, y) => y.count - x.count);

  const insights: Report['insights'] = [];
  const best = series.reduce<Bucket | null>((m, s) => (s.revenue > (m?.revenue ?? 0) ? s : m), null);
  if (best) insights.push({ title: bz.granularity === 'hour' ? 'השעה החזקה' : bz.granularity === 'day' ? 'היום החזק' : 'התקופה החזקה', text: `${best.long} – ₪${Math.round(best.revenue).toLocaleString('he-IL')} ב-${best.orders} הזמנות` });
  if (heatMax > 0) {
    const perDay = counts.map((r) => r.reduce((s, n) => s + n, 0));
    const perHour = Array.from({ length: 24 }, (_, h) => counts.reduce((s, r) => s + r[h], 0));
    const d = perDay.indexOf(Math.max(...perDay));
    const h = perHour.indexOf(Math.max(...perHour));
    insights.push({ title: 'מתי מזמינים', text: `הכי הרבה הזמנות ביום ${WEEKDAYS[d]}, ובשעה ${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00` });
  }
  const topProduct = breakdowns[0].rows[0];
  if (topProduct && a.revenue > 0) insights.push({ title: 'המוצר המוביל', text: `${topProduct.label} – ${Math.round((topProduct.revenue / sum(sales, (o) => o.subtotal || o.total)) * 100)}% מהמכירות, ${topProduct.count} יח׳` });
  if (abandoned.length) insights.push({ title: 'כסף שנשאר בקופה', text: `${abandoned.length} הזמנות ננטשו בשלב התשלום, בשווי ₪${Math.round(sum(abandoned, (o) => o.total)).toLocaleString('he-IL')}` });
  if (ppl.total) insights.push({ title: 'לקוחות חוזרים', text: `${ppl.returning} מתוך ${ppl.total} לקוחות כבר הזמינו בעבר (${Math.round((ppl.returning / ppl.total) * 100)}%)` });

  return {
    range,
    prev: prev ? { ...prev, label: `${shortDate(prev.from)} – ${shortDate(prev.to)}` } : null,
    granularity: bz.granularity,
    kpis: {
      revenue: kpi(a.revenue, b?.revenue),
      orders: kpi(a.orders, b?.orders),
      aov: kpi(a.aov, b?.aov),
      stamps: kpi(a.stamps, b?.stamps),
      customers: kpi(ppl.total, oldPpl?.total),
      conversion: kpi(a.conversion, b?.conversion),
      returning: kpi(ppl.total ? (ppl.returning / ppl.total) * 100 : 0, oldPpl ? (oldPpl.total ? (oldPpl.returning / oldPpl.total) * 100 : 0) : null),
      discounts: kpi(a.discounts, b?.discounts),
    },
    extra: {
      paid: sum(sales.filter((o) => o.paymentStatus === 'paid'), (o) => o.total),
      unpaid: sum(sales.filter((o) => o.paymentStatus !== 'paid'), (o) => o.total),
      shippingIncome: sum(sales, (o) => o.shippingPrice),
      abandonedCount: abandoned.length,
      abandonedValue: sum(abandoned, (o) => o.total),
      lostCount: lost.length,
      lostValue: sum(lost, (o) => o.total),
      newCustomers: ppl.fresh,
      returningCustomers: ppl.returning,
      couponOrders: sales.filter((o) => o.couponCode).length,
      urgent: sales.filter((o) => o.urgent).length,
    },
    series,
    heat: { counts, max: heatMax, total: sales.length },
    funnel,
    breakdowns,
    topCustomers,
    ops: { toReadyHours: median(ready), toDeliveredHours: median(done), sample: ready.length, open, openTotal: openOrders.length },
    insights,
  };
}
