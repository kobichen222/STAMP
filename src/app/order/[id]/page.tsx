import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { INK_COLORS } from '@/designer/types';
import { SITE } from '@/lib/config';
import { formatDate, formatPrice } from '@/lib/format';
import { loadOrder, verifyToken } from '@/server/orders/service';
import { STATUS_LABEL, TIMELINE } from '@/server/orders/types';
import { ApprovalBox, PrintButton } from './OrderActions';

export const metadata: Metadata = { title: 'ההזמנה שלי', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; new?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t, new: isNew } = await searchParams;
  const o = await loadOrder(id);
  if (!verifyToken(o, t ?? null)) notFound();
  const order = o!;
  const ready = order.items.every((i) => i.preflight.ready);
  const failed = ['PAYMENT_FAILED', 'PRODUCTION_FILE_ERROR', 'CANCELLED'].includes(order.status);

  return (
    <div className="container-x max-w-3xl pt-24 pb-20 print:pt-4">
      {isNew && (
        <div className="mb-8 animate-fade-up text-center">
          <span className="mx-auto grid h-16 w-16 animate-pop place-items-center rounded-full bg-ok/10 text-ok">
            <Icon name="check" size={32} />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold">ההזמנה התקבלה</h1>
          <p className="mt-2 text-muted">שלחנו אישור {order.customer.email ? `ל־${order.customer.email}` : 'בהודעה'} ונעדכן בכל שלב.</p>
        </div>
      )}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">מספר הזמנה</p>
            <p className="text-2xl font-extrabold tracking-wide" dir="ltr">
              {order.id}
            </p>
            <p className="mt-1 text-sm text-muted">{formatDate(order.createdAt)}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${failed ? 'bg-bad/10 text-bad' : 'bg-blue-50 text-blue'}`}>{STATUS_LABEL[order.status]}</span>
        </div>
        {ready && !failed && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
            <Icon name="check" size={18} /> הקובץ עבר בדיקה ומוכן לייצור
          </p>
        )}

        <ol className="mt-6 grid grid-cols-6 gap-1 print:hidden" aria-label="סטטוס ההזמנה">
          {TIMELINE.map((s) => {
            const done = s.reached.includes(order.status) && !failed;
            return (
              <li key={s.key} className="text-center">
                <span className={`mx-auto block h-1.5 rounded-full ${done ? 'bg-blue' : 'bg-line'}`} />
                <span className={`mt-2 block text-[11px] leading-4 ${done ? 'font-medium text-ink' : 'text-muted'}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>

        {order.status === 'AWAITING_APPROVAL' && <ApprovalBox id={order.id} token={order.token} />}

        <ul className="mt-6 divide-y divide-line">
          {order.items.map((it, i) => (
            <li key={it.id} className="flex items-center gap-4 py-4">
              <div className="grid h-20 w-28 shrink-0 place-items-center rounded-lg bg-[#fdfcf8] p-2">
                <img src={`/api/orders/${order.id}/preview/?t=${order.token}&i=${i + 1}`} alt={`הגהה – ${it.productName}`} className="max-h-full max-w-full" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold">{it.productName}</p>
                <p className="text-muted">
                  {it.size} · דיו {INK_COLORS[it.ink].label} · כמות {it.quantity}
                </p>
              </div>
              <p className="font-semibold">{formatPrice(it.total)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
          {order.discount > 0 && (
            <div className="flex justify-between text-ok">
              <dt>הנחה</dt>
              <dd>−{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">{order.shipping.label}</dt>
            <dd>{order.shippingPrice ? formatPrice(order.shippingPrice) : 'חינם'}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>סה״כ</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">תשלום</dt>
            <dd>{order.paymentStatus === 'paid' ? 'שולם' : 'בטלפון / באיסוף'}</dd>
          </div>
        </dl>
        {order.shipping.trackingNumber && (
          <p className="mt-4 text-sm">
            מספר משלוח: <strong dir="ltr">{order.shipping.trackingNumber}</strong>{' '}
            {order.shipping.trackingUrl && (
              <a href={order.shipping.trackingUrl} target="_blank" rel="noopener" className="text-blue underline">
                למעקב אצל חברת המשלוחים
              </a>
            )}
          </p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <Link href={`/order/${order.id}/?t=${order.token}`} className="btn-primary">
          מעקב אחר ההזמנה
        </Link>
        <PrintButton />
        <Link href="/account/" className="btn-ghost">
          האזור שלי
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted">
        שאלות? {SITE.phone} · {SITE.email}
      </p>
    </div>
  );
}
