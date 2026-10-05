import Link from 'next/link';
import { INK_COLORS } from '@/designer/types';
import { ADDONS } from '@/lib/pricing';
import { STATUS_LABEL, type OrderStatus } from '@/server/orders/types';
import { requireStaff } from '@/server/staff';
import { getStore } from '@/server/store';

export const metadata = { title: 'דוחות' };
export const dynamic = 'force-dynamic';

const PERIODS = [7, 30, 90, 365] as const;
const nis = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

function Bars({ rows }: { rows: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={r.label}>
            {r.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface">
            <span className="block h-full rounded-full bg-blue" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-left tabular-nums">
            {r.sub ?? r.value}
          </span>
        </li>
      ))}
      {!rows.length && <li className="text-sm text-muted">אין נתונים לתקופה.</li>}
    </ul>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff(['admin']);
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp.days) ?? 30;
  const since = new Date(Date.now() - days * 86400_000);
  const all = await getStore().listOrders({ limit: 5000 });
  const orders = all.filter((o) => new Date(o.createdAt) >= since);
  const valid = orders.filter((o) => o.status !== 'CANCELLED');
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const paid = valid.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0);
  const stamps = valid.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  const discounts = valid.reduce((s, o) => s + o.discount, 0);

  // Revenue per day (Israel time), the last `min(days, 31)` days as columns.
  const span = Math.min(days, 31);
  const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  const perDay = new Map<string, { revenue: number; count: number }>();
  for (const o of valid) {
    const k = dayKey(new Date(o.createdAt));
    const v = perDay.get(k) ?? { revenue: 0, count: 0 };
    v.revenue += o.total;
    v.count++;
    perDay.set(k, v);
  }
  const columns = Array.from({ length: span }, (_, i) => {
    const d = new Date(Date.now() - (span - 1 - i) * 86400_000);
    const k = dayKey(d);
    return { k, label: d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' }), ...(perDay.get(k) ?? { revenue: 0, count: 0 }) };
  });
  const maxDay = Math.max(1, ...columns.map((c) => c.revenue));

  const count = <T extends string>(pairs: [T, number][]) => {
    const m = new Map<T, number>();
    for (const [k, v] of pairs) m.set(k, (m.get(k) ?? 0) + v);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const products = count(valid.flatMap((o) => o.items.map((i) => [i.productName, i.quantity] as [string, number])));
  const productRevenue = new Map(count(valid.flatMap((o) => o.items.map((i) => [i.productName, i.total] as [string, number]))));
  const statuses = count(orders.map((o) => [o.status, 1] as [OrderStatus, number]));
  const inks = count(valid.flatMap((o) => o.items.map((i) => [i.ink, i.quantity] as [string, number])));
  const addons = count(valid.flatMap((o) => o.items.flatMap((i) => Object.entries(i.addons ?? {}).map(([k, n]) => [k, n ?? 0] as [string, number]))));
  const coupons = count(valid.filter((o) => o.couponCode).map((o) => [o.couponCode!, 1] as [string, number]));
  const shipping = count(valid.map((o) => [o.shipping.label, 1] as [string, number]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">דוחות</h1>
        <div className="flex gap-1 rounded-full bg-surface p-1">
          {PERIODS.map((p) => (
            <Link key={p} href={`/admin/reports/?days=${p}`} className={`rounded-full px-3 py-1.5 text-sm ${p === days ? 'bg-white font-semibold shadow-soft' : 'text-muted hover:text-ink'}`}>
              {p === 365 ? 'שנה' : `${p} ימים`}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          ['הכנסות', nis(revenue)],
          ['שולם בפועל', nis(paid)],
          ['הזמנות', valid.length],
          ['חותמות', stamps],
          ['ממוצע הזמנה', nis(valid.length ? revenue / valid.length : 0)],
        ].map(([l, v]) => (
          <div key={l} className="card p-5">
            <p className="text-sm text-muted">{l}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="font-bold">הכנסות לפי יום</h2>
        <div className="mt-4 flex h-48 items-end gap-1" role="img" aria-label="גרף הכנסות יומי">
          {columns.map((c) => (
            <div key={c.k} className="group relative flex h-full flex-1 flex-col justify-end" title={`${c.label}: ${nis(c.revenue)} · ${c.count} הזמנות`}>
              <div className="w-full rounded-t bg-blue/80 transition group-hover:bg-blue" style={{ height: `${Math.max(c.revenue ? 3 : 0, (c.revenue / maxDay) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{columns[0]?.label}</span>
          <span>{columns.at(-1)?.label}</span>
        </div>
        {discounts > 0 && <p className="mt-3 text-sm text-muted">סה״כ הנחות קופון בתקופה: {nis(discounts)}</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-bold">מוצרים מובילים</h2>
          <Bars rows={products.slice(0, 10).map(([k, v]) => ({ label: k, value: v, sub: `${v} יח׳ · ${nis(productRevenue.get(k) ?? 0)}` }))} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">סטטוס הזמנות</h2>
          <Bars rows={statuses.map(([k, v]) => ({ label: STATUS_LABEL[k], value: v }))} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">מוצרים נוספים שנמכרו</h2>
          <Bars rows={addons.map(([k, v]) => ({ label: ADDONS.find((a) => a.id === k)?.label ?? k, value: v }))} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">צבעי דיו</h2>
          <Bars rows={inks.map(([k, v]) => ({ label: INK_COLORS[k as keyof typeof INK_COLORS]?.label ?? k, value: v }))} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">שימוש בקופונים</h2>
          <Bars rows={coupons.map(([k, v]) => ({ label: k, value: v }))} />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 font-bold">משלוח ואיסוף</h2>
          <Bars rows={shipping.map(([k, v]) => ({ label: k, value: v }))} />
        </section>
      </div>
    </div>
  );
}
