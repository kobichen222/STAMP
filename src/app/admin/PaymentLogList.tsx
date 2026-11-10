import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { PaymentLogRow } from '@/server/payment-log';

const KIND: Record<string, string> = { start: 'נפתח תשלום', notify: 'תשובת טרנזילה', return: 'חזרה מהתשלום', alert: 'התראת מערכת' };

/** Rows of the card-payment log (shared by the order page and the payments page). */
export function PaymentLogList({ rows, showOrder = false }: { rows: PaymentLogRow[]; showOrder?: boolean }) {
  if (!rows.length) return <p className="text-sm text-muted">עדיין אין רישומים.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <li key={r.id} className={`rounded-xl px-3 py-2 ${r.ok === false ? 'bg-bad/10' : r.ok ? 'bg-ok/10' : 'bg-surface'}`}>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`font-semibold ${r.ok === false ? 'text-bad' : r.ok ? 'text-ok' : ''}`}>{r.ok === false ? '✗' : r.ok ? '✓' : '•'} {KIND[r.kind] ?? r.kind}</span>
            {showOrder && r.orderId && (
              <Link href={`/admin/orders/${r.orderId}/`} className="text-blue" dir="ltr">
                {r.orderId}
              </Link>
            )}
            {r.sum != null && <span className="tabular-nums text-muted">₪{r.sum}</span>}
            <span className="ms-auto text-xs text-muted tabular-nums">{formatDate(r.at)}</span>
          </p>
          {r.message && <p className="mt-0.5 text-xs text-ink-2">{r.message}</p>}
        </li>
      ))}
    </ul>
  );
}
