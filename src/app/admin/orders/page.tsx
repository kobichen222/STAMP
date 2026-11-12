import Link from 'next/link';
import { getStore } from '@/server/store';
import type { Order, OrderStatus } from '@/server/orders/types';
import { Icon } from '@/components/ui/Icon';
import { nis } from '@/lib/numbers';
import { PageHead, SectionTitle, Stats, Tabs } from '../blocks';
import { OrderRow } from '../components';

export const metadata = { title: 'הזמנות' };

/** Checkout started but the card payment never went through – kept out of "הכל", in a tab of their own. */
const ABANDONED: OrderStatus[] = ['PAYMENT_PENDING', 'PAYMENT_FAILED'];
const isAbandoned = (o: Order) => ABANDONED.includes(o.status) && o.paymentStatus !== 'paid';

/** Quick filters, in the order staff work through them. */
const VIEWS: { key: string; label: string; statuses?: OrderStatus[]; tone?: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'todo', label: 'לטיפול', statuses: ['PAID', 'PREFLIGHT', 'AWAITING_APPROVAL', 'CHANGE_REQUESTED', 'READY_FOR_PRODUCTION'] },
  { key: 'production', label: 'בייצור', statuses: ['IN_PRODUCTION', 'QUALITY_CHECK'] },
  { key: 'ship', label: 'למשלוח', statuses: ['READY_FOR_SHIPPING'] },
  { key: 'sent', label: 'נשלחו', statuses: ['SHIPPED', 'DELIVERED'] },
  { key: 'issues', label: 'בעיות', statuses: ['PRODUCTION_FILE_ERROR'], tone: 'text-bad' },
  { key: 'closed', label: 'בוטלו', statuses: ['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
  { key: 'abandoned', label: 'נוטשים', statuses: ABANDONED, tone: 'text-warn' },
];
/** Old links (?view=pending) land on the new tab. */
const ALIAS: Record<string, string> = { pending: 'abandoned' };

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
  const view = VIEWS.find((v) => v.key === (ALIAS[viewParam ?? ''] ?? viewParam)) ?? VIEWS[0];
  const wanted = legacy ?? view.statuses;
  // "הכל" = real orders only; a search still finds an abandoned one.
  const real = q ? all : all.filter((o) => !isAbandoned(o));
  const orders = wanted ? all.filter((o) => wanted.includes(o.status)) : real;
  const count = (v: (typeof VIEWS)[number]) => (v.statuses ? all.filter((o) => v.statuses!.includes(o.status)).length : real.length);
  const urgent = orders.filter((o) => o.urgent).length;
  const todays = real.filter((o) => dayKey(o.createdAt) === dayKey(new Date().toISOString()));

  const groups = new Map<string, Order[]>();
  for (const o of orders) {
    const k = dayKey(o.createdAt);
    groups.set(k, [...(groups.get(k) ?? []), o]);
  }
  const href = (key: string) => `/admin/orders/?${new URLSearchParams({ ...(q ? { q } : {}), ...(key !== 'all' ? { view: key } : {}) })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHead title="הזמנות" sub={`${orders.length} בתצוגה · ${nis(orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0))}`}>
          <Link href="/designer/?new=1" target="_blank" className="btn-primary btn-sm max-sm:!px-3" aria-label="הזמנה טלפונית">
            <Icon name="plus" size={16} /> <span className="max-sm:hidden">הזמנה טלפונית</span>
          </Link>
          <Link href="/admin/orders/trash/" className="btn-outline btn-sm max-sm:!px-3" aria-label="סל מחזור">
            <Icon name="trash" size={16} /> <span className="max-sm:hidden">סל מחזור</span>
          </Link>
          <a href="/api/admin/orders.csv" className="btn-outline btn-sm max-sm:!px-3" aria-label="ייצוא CSV">
            <Icon name="download" size={16} /> <span className="max-sm:hidden">ייצוא CSV</span>
          </a>
      </PageHead>

      {!q && (
        <Stats
          items={[
            { label: 'נכנסו היום', value: todays.length, sub: nis(todays.reduce((s, o) => s + o.total, 0)) },
            { label: 'לטיפול', value: count(VIEWS[1]), sub: 'בדיקה, אישור, מחכות לייצור', href: href('todo'), on: view.key === 'todo', tone: count(VIEWS[1]) ? 'blue' : undefined },
            { label: 'בייצור', value: count(VIEWS[2]), sub: 'בעבודה עכשיו', href: href('production'), on: view.key === 'production' },
            { label: 'למשלוח / לאיסוף', value: count(VIEWS[3]), sub: 'מוכנות לצאת', href: href('ship'), on: view.key === 'ship', tone: count(VIEWS[3]) ? 'ok' : undefined },
          ]}
        />
      )}

      <form className="flex gap-2">
        {!legacy && view.key !== 'all' && <input type="hidden" name="view" value={view.key} />}
        <input name="q" type="search" defaultValue={q} placeholder="חיפוש: הזמנה, שם, טלפון, מייל…" className="input min-w-0 flex-1 sm:max-w-md" />
        <button className="btn-dark shrink-0" aria-label="חיפוש">
          <Icon name="search" size={17} /> <span className="max-sm:hidden">חיפוש</span>
        </button>
      </form>

      <Tabs label="סינון לפי סטטוס" items={VIEWS.map((v) => ({ href: href(v.key), label: v.label, count: count(v), on: !legacy && v.key === view.key, tone: v.tone }))} />
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
          <SectionTitle count={list.length} side={nis(list.filter((o) => o.status !== 'CANCELLED').reduce((t, o) => t + o.total, 0))}>
            {dayLabel(day)}
          </SectionTitle>
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
