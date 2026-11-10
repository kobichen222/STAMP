import Link from 'next/link';
import { getStore } from '@/server/store';
import { listContacts } from '@/server/store/neon';
import { OrderRow } from './components';

function Kpi({ label, value, tone = '', href }: { label: string; value: string | number; tone?: string; href?: string }) {
  const body = (
    <div className="card h-full p-3.5 transition hover:shadow-soft sm:p-5">
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl ${tone}`}>{value}</p>
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
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const month = valid.filter((o) => new Date(o.createdAt) >= monthStart);
  const revenueMonth = month.reduce((s, o) => s + o.total, 0);
  const unpaid = orders.filter((o) => o.paymentStatus !== 'paid' && o.status !== 'CANCELLED').length;
  const openLeads = (await listContacts(500).catch(() => [])).filter((l) => !l.handled).length;
  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl max-lg:hidden">לוח בקרה</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href="/admin/reports/" className="btn-outline btn-sm max-sm:flex-1">
            דוחות
          </Link>
          <Link href="/designer/?new=1" target="_blank" className="btn-primary btn-sm max-sm:flex-[2]">
            הזמנה טלפונית – לעורך
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <Kpi label="הזמנות היום" value={todays.length} />
        <Kpi label="הכנסות היום" value={`₪${revenueToday.toLocaleString('he-IL')}`} />
        <Kpi label="ממתינות לייצור" value={pending} tone="text-blue" href="/admin/production/" />
        <Kpi label="שגיאות קבצים" value={errors} tone={errors ? 'text-bad' : ''} href="/admin/orders/?status=PRODUCTION_FILE_ERROR" />
        <Kpi label="למשלוח" value={toShip} href="/admin/orders/?status=READY_FOR_SHIPPING" />
        <Kpi label="ממוצע הזמנה" value={`₪${aov}`} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <Kpi label="הכנסות החודש" value={`₪${Math.round(revenueMonth).toLocaleString('he-IL')}`} href="/admin/reports/" />
        <Kpi label="הזמנות החודש" value={month.length} href="/admin/reports/" />
        <Kpi label="ממתינות לתשלום" value={unpaid} tone={unpaid ? 'text-warn' : ''} href="/admin/orders/?status=PAYMENT_PENDING" />
        <Kpi label="פניות פתוחות" value={openLeads} tone={openLeads ? 'text-blue' : ''} href="/admin/leads/" />
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
            <Health label={`מסד נתונים / אחסון${store.kind === 'neon' ? ' (Neon)' : ''}`} ok={store.durable} warn={store.kind === 'filesystem' ? 'זמני – הגדירו DATABASE_URL (Neon)' : 'לא מוגדר'} />
            <Health label="מנוע ייצור" ok />
            <Health label={`שליחת מיילים${process.env.SMTP_HOST ? ' (SMTP)' : process.env.RESEND_API_KEY ? ' (Resend)' : ''}`} ok={!!(process.env.SMTP_HOST || process.env.RESEND_API_KEY)} warn="לא מוגדר" />
            <Health label="סליקה (טרנזילה)" ok={(process.env.PAYMENT_PROVIDER ?? 'tranzila') === 'tranzila'} warn="ידני" />
            <Health label="משלוחים (זיג זג)" ok={!!(process.env.TOKEN_SWAGGER || process.env.DATALOGICS_TOKEN)} warn="שידור ידני" />
            <Health label="עוזר עיצוב" ok={!!process.env.ANTHROPIC_API_KEY} warn="מצב מקומי" />
          </ul>
        </section>
      </div>
    </div>
  );
}
