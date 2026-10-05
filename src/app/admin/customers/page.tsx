import Link from 'next/link';
import { getStore } from '@/server/store';
import { requireStaff } from '@/server/staff';
import { STATUS_LABEL, type Order } from '@/server/orders/types';

export const metadata = { title: 'לקוחות' };
export const dynamic = 'force-dynamic';

interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  orders: Order[];
  total: number;
  last: string;
}

const phoneKey = (p: string) => p.replace(/\D/g, '').replace(/^972/, '0').slice(-10);

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  await requireStaff(['admin']);
  const { q, c } = await searchParams;
  const orders = await getStore().listOrders({ limit: 2000 });
  const map = new Map<string, CustomerRow>();
  for (const o of orders) {
    const key = phoneKey(o.customer.phone) || o.customer.email || o.id;
    const row = map.get(key) ?? { key, name: o.customer.name, phone: o.customer.phone, email: o.customer.email, company: o.customer.company, orders: [], total: 0, last: o.createdAt };
    row.orders.push(o);
    if (o.status !== 'CANCELLED') row.total += o.total;
    if (o.createdAt > row.last) {
      row.last = o.createdAt;
      row.name = o.customer.name;
      row.email = o.customer.email ?? row.email;
      row.company = o.customer.company ?? row.company;
    }
    map.set(key, row);
  }
  const s = q?.trim().toLowerCase();
  const list = [...map.values()]
    .filter((r) => !s || [r.name, r.phone, r.email, r.company].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)))
    .sort((a, b) => b.last.localeCompare(a.last));
  const open = c ? map.get(c) : undefined;
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeZone: 'Asia/Jerusalem' });
  const repeat = [...map.values()].filter((r) => r.orders.length > 1).length;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">לקוחות</h1>
          <p className="mt-1 text-sm text-muted">
            {map.size} לקוחות · {repeat} חוזרים · לפי מספר טלפון
          </p>
        </div>
        <a href="/api/admin/customers.csv" className="btn-outline btn-sm">
          ייצוא לאקסל (CSV)
        </a>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="חיפוש: שם, טלפון, אימייל, חברה…" className="input max-w-md" />
        <button className="btn-dark">חיפוש</button>
      </form>

      {open && (
        <section className="card border-blue/30 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{open.name}</h2>
              <p className="mt-1 text-sm text-muted">
                <a href={`tel:${open.phone}`} dir="ltr" className="text-blue">
                  {open.phone}
                </a>
                {open.email && (
                  <>
                    {' · '}
                    <a href={`mailto:${open.email}`} dir="ltr" className="text-blue">
                      {open.email}
                    </a>
                  </>
                )}
                {open.company && ` · ${open.company}`}
              </p>
            </div>
            <div className="text-left">
              <p className="text-2xl font-extrabold tabular-nums">₪{Math.round(open.total).toLocaleString('he-IL')}</p>
              <p className="text-xs text-muted">{open.orders.length} הזמנות</p>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {open.orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}/`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface">
                  <span className="font-mono font-semibold" dir="ltr">
                    {o.id}
                  </span>
                  <span className="text-muted">{fmt.format(new Date(o.createdAt))}</span>
                  <span className="min-w-0 flex-1 truncate">{o.items.map((i) => i.productName).join(', ')}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs">{STATUS_LABEL[o.status]}</span>
                  <span className="font-semibold tabular-nums">₪{o.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface text-right text-xs text-muted">
            <tr>
              <th className="px-3 py-2.5 font-medium">לקוח</th>
              <th className="px-3 py-2.5 font-medium">טלפון</th>
              <th className="px-3 py-2.5 font-medium">אימייל</th>
              <th className="px-3 py-2.5 font-medium">הזמנות</th>
              <th className="px-3 py-2.5 font-medium">סה״כ</th>
              <th className="px-3 py-2.5 font-medium">הזמנה אחרונה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((r) => (
              <tr key={r.key} className={open?.key === r.key ? 'bg-blue-50/50' : 'hover:bg-surface'}>
                <td className="px-3 py-2.5">
                  <Link href={`/admin/customers/?c=${encodeURIComponent(r.key)}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className="font-semibold hover:text-blue">
                    {r.name}
                  </Link>
                  {r.company && <span className="block text-xs text-muted">{r.company}</span>}
                </td>
                <td className="px-3 py-2.5" dir="ltr">
                  {r.phone}
                </td>
                <td className="px-3 py-2.5 text-muted" dir="ltr">
                  {r.email ?? '—'}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {r.orders.length}
                  {r.orders.length > 1 && <span className="ms-1.5 rounded-full bg-ok/10 px-1.5 text-[11px] text-ok">חוזר</span>}
                </td>
                <td className="px-3 py-2.5 font-semibold tabular-nums">₪{Math.round(r.total).toLocaleString('he-IL')}</td>
                <td className="px-3 py-2.5 text-muted">{fmt.format(new Date(r.last))}</td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted">
                  {map.size ? 'לא נמצאו לקוחות לחיפוש.' : 'עדיין אין לקוחות – הם יופיעו כאן אחרי ההזמנה הראשונה.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
