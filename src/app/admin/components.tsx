import Link from 'next/link';
import { STATUS_LABEL, type Order, type OrderStatus } from '@/server/orders/types';

const TONE: Partial<Record<OrderStatus, string>> = {
  PRODUCTION_FILE_ERROR: 'bg-bad/10 text-bad',
  PAYMENT_FAILED: 'bg-bad/10 text-bad',
  CANCELLED: 'bg-line text-muted',
  CHANGE_REQUESTED: 'bg-warn/15 text-warn',
  AWAITING_APPROVAL: 'bg-warn/15 text-warn',
  READY_FOR_PRODUCTION: 'bg-blue-50 text-blue',
  IN_PRODUCTION: 'bg-violet/10 text-violet',
  READY_FOR_SHIPPING: 'bg-ok/10 text-ok',
  SHIPPED: 'bg-ok/10 text-ok',
  DELIVERED: 'bg-ok/10 text-ok',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONE[status] ?? 'bg-surface text-ink-2'}`}>{STATUS_LABEL[status]}</span>;
}

export function Preview({ order, index = 0, className = 'h-16 w-24' }: { order: Order; index?: number; className?: string }) {
  const f = order.items[index]?.files.find((x) => x.kind === 'production-svg');
  return (
    <div className={`grid shrink-0 place-items-center rounded-lg border border-line bg-white p-1 ${className}`}>
      {f ? <img src={`/api/admin/files/?path=${encodeURIComponent(f.path)}&inline=1`} alt="" className="max-h-full max-w-full" /> : <span className="text-xs text-muted">—</span>}
    </div>
  );
}

export function OrderRow({ o }: { o: Order }) {
  const date = new Date(o.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
  const items = o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', ');
  return (
    <Link
      href={`/admin/orders/${o.id}/`}
      className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-0 hover:bg-surface sm:px-4 md:grid md:grid-cols-[auto_1.2fr_1fr_1fr_auto_auto] md:gap-4"
    >
      <Preview order={o} className="h-12 w-16 sm:h-16 sm:w-24" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold sm:text-base" dir="ltr">
          {o.id}
        </p>
        <p className="truncate text-sm text-ink-2">{o.customer.name}</p>
        <p className="truncate text-xs text-muted md:hidden">
          {date} · {items}
        </p>
      </div>
      <p className="hidden truncate text-sm md:block">{items}</p>
      <p className="hidden text-sm text-muted md:block">{date}</p>
      <div className="flex shrink-0 flex-col items-end gap-1 md:contents">
        <StatusBadge status={o.status} />
        <p className="text-sm font-bold tabular-nums md:text-base">₪{o.total}</p>
      </div>
    </Link>
  );
}
