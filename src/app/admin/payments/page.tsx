import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { paymentHealth, paymentLog } from '@/server/payment-log';
import { requireStaff } from '@/server/staff';
import { PageHead, Stats, Tabs } from '../blocks';
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
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHead title="לוג סליקה" sub="כל פתיחת תשלום, כל תשובה מטרנזילה וכל חזרה של לקוח מדף התשלום" />
      <Stats
        items={[
          { label: 'מצב הסליקה', value: bad ? 'ייתכן שיש תקלה' : 'תקין', tone: bad ? 'bad' : 'ok', sub: 'טרנזילה' },
          { label: 'תשלום אחרון שאושר', value: health?.lastOk ? formatDate(health.lastOk) : '—' },
          { label: 'כישלונות ב-24 שעות', value: health?.failures24h ?? 0, tone: health?.failures24h ? 'bad' : undefined, href: '/admin/payments/?f=fail' },
          { label: 'בלי תשובה', value: health?.stuck.length ?? 0, tone: health?.stuck.length ? 'warn' : undefined, sub: 'נפתחו לתשלום ולא נסגרו' },
        ]}
      />

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
          <Tabs
            label="סינון"
            items={[
              { href: '/admin/payments/', label: 'הכל', on: !failuresOnly },
              { href: '/admin/payments/?f=fail', label: 'רק כישלונות', on: failuresOnly },
            ]}
          />
        </div>
        <PaymentLogList rows={rows} showOrder />
      </section>
    </div>
  );
}
