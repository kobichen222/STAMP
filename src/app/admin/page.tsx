import Link from 'next/link';
import { getStore } from '@/server/store';
import { OrderRow } from './components';

function Kpi({ label, value, tone = '', href }: { label: string; value: string | number; tone?: string; href?: string }) {
  const body = (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Health({ label, ok, warn }: { label: string; ok: boolean; warn?: string }) {
  return (
    <li className="flex items-center justify-between py-2 text-sm">
      {label}
      <span className={`flex items-center gap-1.5 ${ok ? 'text-ok' : 'text-warn'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-ok' : 'bg-warn'}`} />
        {ok ? 'תקין' : warn}
      </span>
    </li>
  );
}

export default async function Dashboard() {
  const store = getStore();
  const orders = await store.listOrders({ limit: 500 });
  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const revenueToday = todays.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === 'READY_FOR_PRODUCTION' || o.status === 'IN_PRODUCTION').length;
  const errors = orders.filter((o) => o.status === 'PRODUCTION_FILE_ERROR').length;
  const toShip = orders.filter((o) => o.status === 'READY_FOR_SHIPPING').length;
  const valid = orders.filter((o) => o.status !== 'CANCELLED');
  const aov = valid.length ? Math.round(valid.reduce((s, o) => s + o.total, 0) / valid.length) : 0;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Kpi label="הזמנות היום" value={todays.length} />
        <Kpi label="הכנסות היום" value={`₪${revenueToday.toLocaleString('he-IL')}`} />
        <Kpi label="ממתינות לייצור" value={pending} tone="text-blue" href="/admin/production/" />
        <Kpi label="שגיאות קבצים" value={errors} tone={errors ? 'text-bad' : ''} href="/admin/orders/?status=PRODUCTION_FILE_ERROR" />
        <Kpi label="למשלוח" value={toShip} href="/admin/orders/?status=READY_FOR_SHIPPING" />
        <Kpi label="ממוצע הזמנה" value={`₪${aov}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold">הזמנות אחרונות</h2>
            <Link href="/admin/orders/" className="text-sm text-blue">
              לכל ההזמנות
            </Link>
          </div>
          {orders.slice(0, 8).map((o) => (
            <OrderRow key={o.id} o={o} />
          ))}
          {!orders.length && <p className="p-6 text-center text-sm text-muted">אין עדיין הזמנות.</p>}
        </section>
        <section className="card h-fit p-4">
          <h2 className="font-semibold">בריאות מערכת</h2>
          <ul className="mt-2 divide-y divide-line">
            <Health label="מסד נתונים / אחסון" ok={store.durable} warn={store.kind === 'filesystem' ? 'זמני – הגדירו Supabase' : 'לא מוגדר'} />
            <Health label="מנוע ייצור" ok />
            <Health label="אימייל (Resend)" ok={!!process.env.RESEND_API_KEY} warn="לא מוגדר" />
            <Health label="סליקה" ok={false} warn="ידני (טלפון/איסוף)" />
            <Health label="עוזר AI" ok={!!process.env.ANTHROPIC_API_KEY} warn="מצב מקומי" />
            <Health label="WhatsApp" ok={false} warn="לא מחובר" />
          </ul>
        </section>
      </div>
    </div>
  );
}
