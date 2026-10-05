import { getSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { listRewardCoupons } from '@/server/store/neon';
import { CouponsEditor } from './CouponsEditor';

export const metadata = { title: 'קופונים' };
export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  await requireStaff(['admin']);
  const [s, rewards] = await Promise.all([getSettings(true), listRewardCoupons(200).catch(() => [])]);
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeZone: 'Asia/Jerusalem' });
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">קופונים</h1>
        <p className="mt-1 text-sm text-muted">קודי הנחה כלליים שהלקוח מקליד בקופה.</p>
        <CouponsEditor initial={s.coupons} />
      </div>
      <section>
        <h2 className="text-lg font-bold">קודים אישיים להזמנה הבאה ({rewards.length})</h2>
        <p className="mt-1 text-sm text-muted">נוצרים אוטומטית אחרי תשלום, לשימוש חד־פעמי.</p>
        <div className="card mt-3 overflow-x-auto">
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
