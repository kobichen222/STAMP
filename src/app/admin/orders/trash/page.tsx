import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { getStore } from '@/server/store';
import { requireStaff } from '@/server/staff';
import { StatusBadge } from '../../components';
import { TrashActions } from './TrashActions';

export const metadata = { title: 'סל מחזור' };
export const dynamic = 'force-dynamic';

export default async function TrashPage() {
  await requireStaff(['admin']);
  const list = await getStore().listDeleted(200);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link href="/admin/orders/" className="text-sm text-muted hover:text-ink">
          → כל ההזמנות
        </Link>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
          סל מחזור <span className="text-base font-medium text-muted">({list.length})</span>
        </h1>
        <p className="mt-1 text-sm text-muted">הזמנות שנמחקו. שחזור מחזיר את ההזמנה כמו שהייתה, כולל קבצי הייצור.</p>
      </div>
      <ul className="space-y-2">
        {list.map(({ order: o, deletedAt, by }) => (
          <li key={o.id} className="card flex flex-wrap items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-bold">
                <span dir="ltr">{o.id}</span> <StatusBadge status={o.status} method={o.shipping.method} />
              </p>
              <p className="truncate text-sm text-ink-2">
                {o.customer.name} · ₪{o.total} · {o.items.map((i) => i.productName).join(', ')}
              </p>
              <p className="text-xs text-muted">
                נמחקה {formatDate(deletedAt)}
                {by ? ` · ${by}` : ''}
              </p>
            </div>
            <TrashActions id={o.id} />
          </li>
        ))}
        {!list.length && <li className="card p-8 text-center text-sm text-muted">סל המחזור ריק.</li>}
      </ul>
    </div>
  );
}
