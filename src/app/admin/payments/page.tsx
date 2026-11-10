import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { paymentHealth, paymentLog } from '@/server/payment-log';
import { requireStaff } from '@/server/staff';
import { PaymentLogList } from '../PaymentLogList';

export const metadata = { title: 'לוג סליקה' };
export const dynamic = 'force-dynamic';

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await requireStaff(['admin']);
  const { f } = await searchParams;
  const failuresOnly = f === 'fail';
  const [health, rows] = await Promise.all([paymentHealth().catch(() => null), paymentLog({ limit: 200, failuresOnly }).catch(() => [])]);
  const bad = !!health && health.stuck.length >= 2;
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">לוג סליקה (טרנזילה)</h1>
        <p className="mt-1 text-sm text-muted">כל פתיחת תשלום, כל תשובה מטרנזילה וכל חזרה של לקוח מדף התשלום. תשלום שנכשל שולח מייל מיד, וכמה הזמנות ברצף בלי תשובה שולחות התראה.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`card p-4 ${bad ? 'ring-2 ring-bad/40' : ''}`}>
          <p className="text-xs text-muted">מצב הסליקה</p>
          <p className={`mt-1 text-lg font-bold ${bad ? 'text-bad' : 'text-ok'}`}>{bad ? 'ייתכן שיש תקלה' : 'תקין'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">תשלום אחרון שאושר</p>
          <p className="mt-1 text-lg font-bold">{health?.lastOk ? formatDate(health.lastOk) : '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">כישלונות ב־24 שעות</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${health?.failures24h ? 'text-bad' : ''}`}>{health?.failures24h ?? 0}</p>
        </div>
      </div>

      {!!health?.stuck.length && (
        <section className="card border-bad/30 p-4 sm:p-5">
          <h2 className="font-bold text-bad">הזמנות שנפתחו לתשלום ולא קיבלנו עליהן תשובה ({health.stuck.length})</h2>
          <p className="mt-0.5 text-xs text-muted">הלקוח פתח את טופס האשראי ומאז אין אישור או סירוב. כדאי לחזור ללקוח.</p>
          <ul className="mt-2 divide-y divide-line text-sm">
            {health.stuck.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <Link href={`/admin/orders/${s.id}/`} className="font-semibold text-blue" dir="ltr">
                  {s.id}
                </Link>
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="tabular-nums">₪{s.total}</span>
                <span className="text-xs text-muted">{formatDate(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-bold">יומן</h2>
          <div className="flex gap-1.5 text-sm">
            <Link href="/admin/payments/" className={`rounded-full px-3 py-1 ${!failuresOnly ? 'bg-ink text-white' : 'bg-surface'}`}>
              הכל
            </Link>
            <Link href="/admin/payments/?f=fail" className={`rounded-full px-3 py-1 ${failuresOnly ? 'bg-ink text-white' : 'bg-surface'}`}>
              רק כישלונות
            </Link>
          </div>
        </div>
        <PaymentLogList rows={rows} showOrder />
      </section>
    </div>
  );
}
