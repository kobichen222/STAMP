import Link from 'next/link';
import { ageText, ageTone } from '@/lib/age';
import { addDays, buildReport, dayKey, isAbandoned, isSale, resolveRange } from '@/lib/reports';
import type { Order, OrderStatus } from '@/server/orders/types';
import { paymentHealth } from '@/server/payment-log';
import { getStore } from '@/server/store';
import { listContacts } from '@/server/store/neon';
import { int, nis, pct } from '@/lib/numbers';
import { Delta, Tile } from './charts';
import { OrderRow } from './components';
import { TrendCard } from './TrendCard';

export const dynamic = 'force-dynamic';

/** The work queue, in the order an order moves through the studio. */
const STAGES: { key: string; label: string; hint: string; statuses: OrderStatus[] }[] = [
  { key: 'check', label: 'לבדיקה', hint: 'שולמו, מחכות לבדיקת קובץ', statuses: ['PAID', 'PREFLIGHT'] },
  { key: 'approval', label: 'אצל הלקוח', hint: 'אישור סקיצה או שינוי', statuses: ['AWAITING_APPROVAL', 'CHANGE_REQUESTED'] },
  { key: 'ready', label: 'מחכה לייצור', hint: 'מוכן להדפסה', statuses: ['READY_FOR_PRODUCTION'] },
  { key: 'production', label: 'בייצור', hint: 'בעבודה עכשיו', statuses: ['IN_PRODUCTION', 'QUALITY_CHECK'] },
  { key: 'out', label: 'מוכן', hint: 'למשלוח או לאיסוף', statuses: ['READY_FOR_SHIPPING'] },
  { key: 'shipped', label: 'בדרך ללקוח', hint: 'נשלח, עוד לא נמסר', statuses: ['SHIPPED'] },
];
const AGE_TONE = { fresh: 'text-muted', day: 'text-warn', old: 'text-bad' };

function Health({ label, ok, warn }: { label: string; ok: boolean; warn?: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 truncate">{label}</span>
      <span className={`flex shrink-0 items-center gap-1.5 ${ok ? 'text-ok' : 'text-warn'}`}>
        <span className={`h-2 w-2 rounded-full ${ok ? 'bg-ok' : 'bg-warn'}`} />
        {ok ? 'תקין' : warn}
      </span>
    </li>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage: stageParam } = await searchParams;
  const store = getStore();
  const [orders, payHealth, contacts] = await Promise.all([store.listOrders({ limit: 3000 }), paymentHealth().catch(() => null), listContacts(500).catch(() => [])]);
  const now = new Date();
  const today = dayKey(now);
  const yesterday = addDays(today, -1);

  // Today, against yesterday up to the same hour – a fair comparison in the middle of the day.
  const sales = orders.filter(isSale);
  const todays = sales.filter((o) => dayKey(o.createdAt) === today);
  const sameTime = sales.filter((o) => dayKey(o.createdAt) === yesterday && Date.parse(o.createdAt) <= now.getTime() - 86_400_000);
  const sum = (list: Order[]) => list.reduce((s, o) => s + o.total, 0);
  const stamps = (list: Order[]) => list.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  const revToday = { value: sum(todays), prev: sum(sameTime) };

  const week = buildReport(orders, resolveRange({ range: '7' }, orders, now));
  const two = buildReport(orders, resolveRange({ from: addDays(today, -13), to: today }, orders, now));
  const month = buildReport(orders, resolveRange({ from: `${today.slice(0, 8)}01`, to: today }, orders, now));
  const openLeads = contacts.filter((l) => !l.handled).length;

  const stages = STAGES.map((s) => {
    const list = orders.filter((o) => s.statuses.includes(o.status)).sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || a.createdAt.localeCompare(b.createdAt));
    const oldest = list.reduce<string | null>((m, o) => (!m || o.createdAt < m ? o.createdAt : m), null);
    return { ...s, list, oldest };
  });
  const active = stages.find((s) => s.key === stageParam);
  const inWork = stages.filter((s) => s.key !== 'shipped').reduce((n, s) => n + s.list.length, 0);
  const shown = active ? active.list.slice(0, 12) : orders.filter((o) => !isAbandoned(o)).slice(0, 8);

  const open = stages.filter((s) => s.key !== 'shipped').flatMap((s) => s.list);
  const count = (f: (o: Order) => boolean) => orders.filter(f).length;
  const alerts = [
    { n: count((o) => o.status === 'PRODUCTION_FILE_ERROR'), label: 'שגיאות בקובץ ייצור', href: '/admin/orders/?view=issues', tone: 'bad' },
    { n: count((o) => o.status === 'CHANGE_REQUESTED'), label: 'לקוחות ביקשו שינוי', href: '/admin/orders/?view=todo', tone: 'bad' },
    { n: open.filter((o) => o.urgent).length, label: 'הזמנות דחופות פתוחות', href: '/admin/production/', tone: 'bad' },
    { n: open.filter((o) => ageTone(o.createdAt) === 'old').length, label: 'פתוחות יותר מ-3 ימים', href: '/admin/production/', tone: 'warn' },
    { n: count((o) => o.status === 'PAYMENT_PENDING' && o.paymentMethod === 'manual'), label: 'ממתינות לתשלום מול הסטודיו', href: '/admin/orders/?view=abandoned', tone: 'warn' },
    { n: payHealth?.stuck.length ?? 0, label: 'תשלומים בלי תשובה מהסליקה', href: '/admin/payments/', tone: 'warn' },
    { n: openLeads, label: 'פניות שלא טופלו', href: '/admin/leads/', tone: 'blue' },
  ].filter((a) => a.n > 0);
  const TONE: Record<string, string> = { bad: 'border-bad/25 bg-bad/5 text-bad', warn: 'border-warn/30 bg-warn/5 text-warn', blue: 'border-blue/20 bg-blue-50 text-blue' };

  const out = stages.find((s) => s.key === 'out')!.list;
  const logistics = [
    { label: 'לשדר ולמסור לשליח', n: out.filter((o) => o.shipping.method !== 'pickup').length },
    { label: 'ממתינות לאיסוף עצמי', n: out.filter((o) => o.shipping.method === 'pickup').length },
    { label: 'בדרך ללקוח', n: stages.find((s) => s.key === 'shipped')!.list.length },
  ];
  const products = week.breakdowns.find((b) => b.id === 'products')!.rows.slice(0, 5);
  const maxProduct = Math.max(1, ...products.map((p) => p.revenue));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">לוח בקרה</h1>
          <p className="mt-0.5 text-sm text-muted">{now.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'long' })} · {inWork} הזמנות בעבודה</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href="/admin/reports/" className="btn-outline btn-sm max-sm:flex-1">
            דוחות מלאים
          </Link>
          <Link href="/designer/?new=1" target="_blank" className="btn-primary btn-sm max-sm:flex-[2]">
            הזמנה טלפונית – לעורך
          </Link>
        </div>
      </div>

      {/* what needs attention right now */}
      {alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Link key={a.label} href={a.href} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition hover:shadow-soft ${TONE[a.tone]}`}>
              <b className="tabular-nums">{a.n}</b>
              <span className="text-ink">{a.label}</span>
              <span aria-hidden>←</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="inline-flex items-center gap-2 rounded-full border border-ok/25 bg-ok/5 px-3 py-1.5 text-[13px] font-semibold text-ok">
          <span aria-hidden>✓</span>
          <span className="text-ink">אין כרגע דבר שדורש טיפול מיוחד</span>
        </p>
      )}

      {/* headline numbers */}
      <div className="grid gap-3 lg:grid-cols-[1.25fr_2fr]">
        <div className="card relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -end-10 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-blue/15 to-violet/15 blur-2xl" />
          <div className="relative flex items-center justify-between gap-2">
            <p className="text-sm text-muted">הכנסות היום</p>
            <Delta k={revToday} />
          </div>
          <p className="relative mt-2 text-5xl font-extrabold leading-none tracking-tight">{nis(revToday.value)}</p>
          <p className="relative mt-2 text-[13px] text-muted">אתמול עד השעה הזאת {nis(revToday.prev)}</p>
          <dl className="relative mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-[13px]">
            {[
              ['הזמנות', int(todays.length)],
              ['חותמות', int(stamps(todays))],
              ['ממוצע הזמנה', nis(todays.length ? revToday.value / todays.length : 0)],
            ].map(([l, v]) => (
              <div key={l} className="min-w-0">
                <dt className="truncate text-muted">{l}</dt>
                <dd className="mt-0.5 font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="הכנסות 7 ימים" value={nis(week.kpis.revenue.value)} k={week.kpis.revenue} spark={week.series.map((s) => s.revenue)} />
          <Tile label="הזמנות 7 ימים" value={int(week.kpis.orders.value)} k={week.kpis.orders} spark={week.series.map((s) => s.orders)} />
          <Tile label="החודש עד היום" value={nis(month.kpis.revenue.value)} k={month.kpis.revenue} sub={`${int(month.kpis.orders.value)} הזמנות`} />
          <Tile label="ממוצע הזמנה" value={nis(week.kpis.aov.value)} k={week.kpis.aov} sub="ב-7 הימים האחרונים" />
          <Tile label="המרה בקופה" value={pct(week.kpis.conversion.value)} k={week.kpis.conversion} points sub={`${week.extra.abandonedCount} נטשו השבוע`} />
          <Tile label="לקוחות השבוע" value={int(week.kpis.customers.value)} k={week.kpis.customers} sub={`${week.extra.newCustomers} חדשים · ${week.extra.returningCustomers} חוזרים`} />
        </div>
      </div>

      {/* the work queue – pick a stage to see its orders below */}
      <section className="card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-bold">תור העבודה</h2>
            <p className="mt-0.5 text-[13px] text-muted">לחיצה על שלב מציגה את ההזמנות שלו למטה</p>
          </div>
          <Link href="/admin/production/" className="text-[13px] font-semibold text-blue hover:underline">
            לתור הייצור ←
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((s, i) => {
            const on = active?.key === s.key;
            return (
              <Link
                key={s.key}
                href={on ? '/admin/' : `/admin/?stage=${s.key}`}
                scroll={false}
                aria-current={on ? 'true' : undefined}
                className={`group relative rounded-2xl border p-3 transition ${on ? 'border-blue bg-blue-50 shadow-soft' : 'border-line bg-white hover:border-blue/40 hover:shadow-soft'}`}
              >
                <p className="flex items-center gap-1.5 text-[13px] text-muted">
                  <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${on ? 'bg-blue text-white' : 'bg-surface text-muted'}`}>{i + 1}</span>
                  <span className="truncate">{s.label}</span>
                </p>
                <p className={`mt-1.5 text-3xl font-extrabold leading-none ${s.list.length ? '' : 'text-muted/50'}`}>{s.list.length}</p>
                <p className="mt-1.5 truncate text-xs text-muted">{s.list.length ? nis(sum(s.list)) : s.hint}</p>
                {s.oldest && <p className={`mt-0.5 truncate text-xs ${AGE_TONE[ageTone(s.oldest)]}`}>הוותיקה {ageText(s.oldest)}</p>}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="font-bold">
                {active ? `${active.label} · ${active.list.length} הזמנות` : 'הזמנות אחרונות'}
                {active && <span className="ms-2 text-[13px] font-normal text-muted">הוותיקות קודם</span>}
              </h2>
              <Link href={active ? '/admin/' : '/admin/orders/'} scroll={false} className="shrink-0 text-sm font-semibold text-blue">
                {active ? 'נקה סינון ✕' : 'לכל ההזמנות'}
              </Link>
            </div>
            {shown.map((o) => (
              <OrderRow key={o.id} o={o} />
            ))}
            {!shown.length && <p className="p-6 text-center text-sm text-muted">{active ? 'אין הזמנות בשלב הזה.' : 'אין עדיין הזמנות.'}</p>}
          </section>
          <TrendCard series={two.series} title="14 הימים האחרונים" hint="מול 14 הימים שלפניהם" legend={[`התקופה (${two.range.label})`, `הקודמת (${two.prev?.label ?? ''})`]} />
        </div>

        <div className="min-w-0 space-y-5">
          <section className="card p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold">משלוחים ואיסוף</h2>
              <Link href="/admin/calendar/" className="text-[13px] font-semibold text-blue hover:underline">
                ליומן ←
              </Link>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {logistics.map((l) => (
                <li key={l.label} className="flex items-center justify-between py-2 text-sm">
                  {l.label}
                  <b className={`tabular-nums ${l.n ? '' : 'text-muted/60'}`}>{l.n}</b>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold">נמכר השבוע</h2>
              <Link href="/admin/reports/?range=7" className="text-[13px] font-semibold text-blue hover:underline">
                לדוח ←
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {products.map((p) => (
                <li key={p.label} className="group">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate" title={p.label}>
                      {p.label}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <b>{nis(p.revenue)}</b>
                      <span className="text-xs text-muted"> · {p.count} יח׳</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-blue/85 transition-all group-hover:bg-blue" style={{ width: `${(p.revenue / maxProduct) * 100}%` }} />
                  </div>
                </li>
              ))}
              {!products.length && <li className="py-3 text-center text-sm text-muted">אין מכירות השבוע.</li>}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="font-bold">בריאות מערכת</h2>
            <ul className="mt-2 divide-y divide-line">
              <Health label={`מסד נתונים / אחסון${store.kind === 'neon' ? ' (Neon)' : ''}`} ok={store.durable} warn={store.kind === 'filesystem' ? 'זמני' : 'לא מוגדר'} />
              <Health label="מנוע ייצור" ok />
              <Health label={`שליחת מיילים${process.env.SMTP_HOST ? ' (SMTP)' : process.env.RESEND_API_KEY ? ' (Resend)' : ''}`} ok={!!(process.env.SMTP_HOST || process.env.RESEND_API_KEY)} warn="לא מוגדר" />
              <Health label="סליקה (טרנזילה)" ok={(process.env.PAYMENT_PROVIDER ?? 'tranzila') === 'tranzila' && !(payHealth && payHealth.stuck.length >= 2)} warn={payHealth && payHealth.stuck.length >= 2 ? `${payHealth.stuck.length} בלי תשובה` : 'ידני'} />
              <Health label="משלוחים (זיג זג)" ok={!!(process.env.TOKEN_SWAGGER || process.env.DATALOGICS_TOKEN)} warn="שידור ידני" />
              <Health label="עוזר עיצוב" ok={!!(process.env.ANTHROPIC_API_KEY || process.env.sk || process.env.SK)} warn="מצב מקומי" />
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
