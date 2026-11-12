import { getSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { listRewardCoupons } from '@/server/store/neon';
import { PageHead, Stats } from '../blocks';
import { CouponsEditor } from './CouponsEditor';

export const metadata = { title: 'קופונים' };
export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  await requireStaff(['admin']);
  const [s, rewards] = await Promise.all([getSettings(true), listRewardCoupons(200).catch(() => [])]);
  const used = rewards.filter((c) => c.usedAt).length;
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeZone: 'Asia/Jerusalem' });
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead title="קופונים" sub="קודי הנחה כלליים שהלקוח מקליד בקופה, וקודים אישיים להזמנה הבאה" />
      <Stats
        items={[
          { label: 'קופונים פעילים', value: s.coupons.filter((c) => c.active).length, sub: `${s.coupons.length} בסך הכול`, tone: 'blue' },
          { label: 'קודים אישיים', value: rewards.length, sub: 'נוצרו אחרי תשלום' },
          { label: 'מומשו', value: used, sub: rewards.length ? `${Math.round((used / rewards.length) * 100)}% מהקודים` : undefined, tone: used ? 'ok' : undefined },
          { label: 'ממתינים למימוש', value: rewards.length - used, sub: 'לשימוש חד-פעמי' },
        ]}
      />
      <div>
        <CouponsEditor initial={s.coupons} />
      </div>
      <section>
        <h2 className="text-lg font-bold">קודים אישיים להזמנה הבאה ({rewards.length})</h2>
        <p className="mt-1 text-sm text-muted">נוצרים אוטומטית אחרי תשלום, לשימוש חד־פעמי.</p>
        <ul className="mt-3 space-y-2 md:hidden">
          {rewards.map((c) => (
            <li key={c.code} className="card flex items-center gap-3 p-3 text-sm">
              <span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-blue-50 font-bold text-blue">{c.pct}%</span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono font-semibold" dir="ltr">
                  {c.code}
                </span>
                <a href={`/admin/orders/${c.orderId}/`} className="block truncate text-xs text-blue" dir="ltr">
                  {c.orderId} · {c.phone ?? c.email ?? ''}
                </a>
              </span>
              {c.usedAt ? <span className="shrink-0 rounded-full bg-ok/10 px-2 py-0.5 text-xs text-ok">מומש</span> : <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">ממתין</span>}
            </li>
          ))}
          {!rewards.length && <li className="card p-6 text-center text-sm text-muted">עדיין לא נוצרו קודים אישיים.</li>}
        </ul>
        <div className="card mt-3 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-right text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">קוד</th>
                <th className="px-3 py-2 font-medium">הנחה</th>
                <th className="px-3 py-2 font-medium">נוצר מהזמנה</th>
                <th className="px-3 py-2 font-medium">לקוח</th>
                <th className="px-3 py-2 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rewards.map((c) => (
                <tr key={c.code}>
                  <td className="px-3 py-2 font-mono font-semibold" dir="ltr">
                    {c.code}
                  </td>
                  <td className="px-3 py-2">{c.pct}%</td>
                  <td className="px-3 py-2">
                    <a href={`/admin/orders/${c.orderId}/`} className="text-blue hover:underline" dir="ltr">
                      {c.orderId}
                    </a>{' '}
                    <span className="text-xs text-muted">· {fmt.format(new Date(c.createdAt))}</span>
                  </td>
                  <td className="px-3 py-2 text-muted" dir="ltr">
                    {c.phone ?? c.email ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {c.usedAt ? (
                      <span className="text-ok">
                        מומש ב־
                        <a href={`/admin/orders/${c.usedOrderId}/`} className="underline" dir="ltr">
                          {c.usedOrderId}
                        </a>
                      </span>
                    ) : (
                      <span className="text-muted">ממתין</span>
                    )}
                  </td>
                </tr>
              ))}
              {!rewards.length && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted">
                    עדיין לא נוצרו קודים אישיים.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
