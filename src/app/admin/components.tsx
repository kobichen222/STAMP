import Link from 'next/link';
import { statusLabel, STATUS_LABEL, type Order, type OrderStatus } from '@/server/orders/types';
import { ageText, ageTone, orderTime } from '@/lib/age';
import { Icon } from '@/components/ui/Icon';

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

export function StatusBadge({ status, method }: { status: OrderStatus; method?: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONE[status] ?? 'bg-surface text-ink-2'}`}>{statusLabel(status, method)}</span>;
}

export function Preview({ order, index = 0, className = 'h-16 w-24' }: { order: Order; index?: number; className?: string }) {
  const item = order.items[index];
  const f = item?.files.find((x) => x.kind === 'production-svg');
  return (
    <div className={`grid shrink-0 place-items-center rounded-lg border border-line bg-white p-1 ${className}`}>
      {f ? <img src={`/api/admin/files/?path=${encodeURIComponent(f.path)}&inline=1&v=${encodeURIComponent(item.designVersionId)}`} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full" /> : <span className="text-xs text-muted">—</span>}
    </div>
  );
}

/** "🕒 10.11, 22:00 · לפני 3 ש׳" – older open orders in orange / red. */
export function OrderAge({ o, className = '', stacked = false }: { o: Pick<Order, 'createdAt' | 'status'>; className?: string; stacked?: boolean }) {
  const closed = ['DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(o.status);
  const tone = closed ? 'fresh' : ageTone(o.createdAt);
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {orderTime(o.createdAt)}
      {stacked ? <br /> : ' · '}
      <span className={tone === 'old' ? 'font-bold text-bad' : tone === 'day' ? 'font-semibold text-warn' : ''}>{ageText(o.createdAt)}</span>
    </span>
  );
}

/** "שולם" / "לא שולם" next to the amount. */
export function PaidBadge({ o }: { o: Pick<Order, 'paymentStatus' | 'status'> }) {
  if (['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(o.status)) return null;
  const paid = o.paymentStatus === 'paid';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${paid ? 'bg-ok/10 text-ok' : 'bg-warn/15 text-warn'}`}>{paid ? '✓ שולם' : 'לא שולם'}</span>;
}

/** "הוזמן שליח" – a shipment was created with the courier (there is a tracking number). */
export function CourierBadge({ o }: { o: Pick<Order, 'shipping'> }) {
  if (o.shipping.method === 'pickup' || !o.shipping.trackingNumber) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-blue" title={`מספר משלוח ${o.shipping.trackingNumber}`}>
      <Icon name="truck" size={11} /> הוזמן שליח
    </span>
  );
}

export function OrderRow({ o }: { o: Order }) {
  const items = o.items.map((i) => `${i.productName} ×${i.quantity} ₪${i.total}`).join(', ');
  const price = <span className="shrink-0 text-sm font-bold tabular-nums xl:text-base">₪{o.total}</span>;
  return (
    // Phones: picture + details, the amount beside the order number, and one wrapping row of tags underneath.
    // From xl: a table-like row – picture | order | items | time | tags | amount.
    <Link
      href={`/admin/orders/${o.id}/`}
      className="block border-b border-line px-3 py-3 last:border-0 hover:bg-surface sm:px-4 xl:grid xl:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1fr)_auto_minmax(0,13rem)_auto] xl:items-center xl:gap-4"
    >
      <div className="flex items-start gap-3 xl:contents">
        <Preview order={o} className="h-12 w-16 sm:h-16 sm:w-24" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-bold sm:text-base" dir="ltr">
              {o.id}
            </span>
            <span className="xl:hidden">{price}</span>
          </p>
          <p className="truncate text-sm text-ink-2">{o.customer.company || o.customer.name}</p>
          <p className="truncate text-xs text-muted xl:hidden">
            {items} · {o.shipping.label}
          </p>
          <p className="text-xs text-muted xl:hidden">
            <OrderAge o={o} className="!whitespace-normal" />
          </p>
        </div>
        <p className="hidden min-w-0 truncate text-sm xl:block">{items}</p>
        <p className="hidden text-sm text-muted xl:block">
          <OrderAge o={o} stacked />
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 xl:mt-0 xl:justify-end">
        <StatusBadge status={o.status} method={o.shipping.method} />
        <PaidBadge o={o} />
        <CourierBadge o={o} />
        {o.urgent && <span className="rounded-full bg-bad px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-white">דחוף</span>}
      </div>
      <span className="hidden xl:block">{price}</span>
    </Link>
  );
}
