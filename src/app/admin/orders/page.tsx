import Link from 'next/link';
import { getStore } from '@/server/store';
import type { Order, OrderStatus } from '@/server/orders/types';
import { Icon } from '@/components/ui/Icon';
import { OrderRow } from '../components';

export const metadata = { title: 'הזמנות' };

/** Quick filters, in the order staff work through them. */
const VIEWS: { key: string; label: string; statuses?: OrderStatus[]; tone?: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'todo', label: 'לטיפול', statuses: ['PAID', 'PREFLIGHT', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'READY_FOR_PRODUCTION'] },
  { key: 'production', label: 'בייצור', statuses: ['IN_PRODUCTION', 'QUALITY_CHECK'] },
  { key: 'ship', label: 'למשלוח', statuses: ['READY_FOR_SHIPPING'] },
  { key: 'sent', label: 'נשלחו', statuses: ['SHIPPED', 'DELIVERED'] },
  { key: 'pending', label: 'ממתין לתשלום', statuses: ['PAYMENT_PENDING'] },
  { key: 'issues', label: 'בעיות', statuses: ['PAYMENT_FAILED', 'PRODUCTION_FILE_ERROR'], tone: 'text-bad' },
  { key: 'closed', label: 'בוטלו', statuses: ['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
];

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

function dayLabel(key: string) {
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 864e5).toISOString());
  if (key === today) return 'היום';
  if (key === yesterday) return 'אתמול';
  return new Date(`${key}T12:00:00`).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; view?: string; status?: string }> }) {
  const { q, view: viewParam, status } = await searchParams;
  const all = await getStore().listOrders({ q, limit: 500 });
  // Old links used ?status=A,B – keep them working.
  const legacy = status ? (status.split(',') as OrderStatus[]) : undefined;
  const view = VIEWS.find((v) => v.key === viewParam) ?? VIEWS[0];
  const wanted = legacy ?? view.statuses;
  const orders = wanted ? all.filter((o) => wanted.includes(o.status)) : all;
  const count = (v: (typeof VIEWS)[number]) => (v.statuses ? all.filter((o) => v.statuses!.includes(o.status)).length : all.length);
  const urgent = orders.filter((o) => o.urgent).length;

  const groups = new Map<string, Order[]>();
  for (const o of orders) {
    const k = dayKey(o.createdAt);
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const href = (key: string) => `/admin/orders/?${new URLSearchParams({ ...(q ? { q } : {}), ...(key !== 'all' ? { view: key } : {}) })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">
          הזמנות <span className="text-base font-medium text-muted">({orders.length})</span>
        </h1>
        <div className="flex gap-2">
          <Link href="/designer/?new=1" target="_blank" className="btn-primary btn-sm max-sm:!px-3" aria-label="הזמנה טלפונית">
            <Icon name="plus" size={16} /> <span className="max-sm:hidden">הזמנה טלפונית</span>
          </Link>
          <Link href="/admin/orders/trash/" className="btn-outline btn-sm max-sm:!px-3" aria-label="סל מחזור">
            <Icon name="trash" size={16} /> <span className="max-sm:hidden">סל מחזור</span>
          </Link>
          <a href="/api/admin/orders.csv" className="btn-outline btn-sm max-sm:!px-3" aria-label="ייצוא CSV">
            <Icon name="download" size={16} /> <span className="max-sm:hidden">ייצוא CSV</span>
          </a>
        </div>
      </div>

      <form className="flex gap-2">
        {!legacy && view.key !== 'all' && <input type="hidden" name="view" value={view.key} />}
        <input name="q" type="search" defaultValue={q} placeholder="חיפוש: הזמנה, שם, טלפון, מייל…" className="input min-w-0 flex-1 sm:max-w-md" />
        <button className="btn-dark shrink-0" aria-label="חיפוש">
          <Icon name="search" size={17} /> <span className="max-sm:hidden">חיפוש</span>
        </button>
      </form>

      <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="סינון לפי סטטוס">
        {VIEWS.map((v) => {
          const n = count(v);
          const on = !legacy && v.key === view.key;
          return (
            <Link
              key={v.key}
              href={href(v.key)}
              aria-current={on ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'} ${!on && n === 0 ? 'opacity-50' : ''}`}
            >
              <span className={!on ? v.tone : ''}>{v.label}</span>
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? 'bg-white/20' : 'bg-surface text-muted'}`}>{n}</span>
            </Link>
          );
        })}
      </nav>
      {legacy && (
        <p className="text-sm text-muted">
          מסונן לפי סטטוס ·{' '}
          <Link href={href('all')} className="text-blue underline">
            ניקוי
          </Link>
        </p>
      )}
      {urgent > 0 && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-semibold text-bad">{urgent} הזמנות דחופות ברשימה</p>}

      {[...groups].map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-1.5 flex items-center justify-between px-1 text-xs font-bold text-muted">
            <span>{dayLabel(day)}</span>
            <span className="tabular-nums">
              {list.length} · ₪{Math.round(list.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)).toLocaleString('he-IL')}
            </span>
          </h2>
          <div className="card overflow-hidden">
            {list.map((o) => (
              <OrderRow key={o.id} o={o} />
            ))}
          </div>
        </section>
      ))}
      {!orders.length && <p className="card p-8 text-center text-sm text-muted">{q ? 'לא נמצאו הזמנות לחיפוש.' : 'אין הזמנות בתצוגה הזו.'}</p>}
    </div>
  );
}
