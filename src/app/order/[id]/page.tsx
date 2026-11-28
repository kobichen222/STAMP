import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { INK_COLORS } from '@/designer/types';
import { SITE } from '@/lib/config';
import { formatDate, formatPrice } from '@/lib/format';
import { loadOrder, verifyToken } from '@/server/orders/service';
import { orderSteps, statusLabel, STATUS_LABEL, STOPPED_STATUSES } from '@/server/orders/types';
import { headers } from 'next/headers';
import { getPaymentProvider } from '@/server/payments';
import { orderConfirmationSent, trackingLink } from '@/server/notifications';
import { declineReason } from '@/server/payment-log';
import { toChatId } from '@/server/whatsapp';
import { ApprovalBox, CopyOrderId, OrderConfirmation, PaymentWatcher, PayNow, PrintButton } from './OrderActions';
import { PurchaseEvent } from '@/components/analytics/PurchaseEvent';

export const metadata: Metadata = { title: 'ההזמנה שלי', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; new?: string; pay?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t, new: isNew, pay } = await searchParams;
  const o = await loadOrder(id);
  if (!verifyToken(o, t ?? null)) notFound();
  const order = o!;
  const ready = order.items.every((i) => i.preflight.ready);
  const failed = STOPPED_STATUSES.includes(order.status);
  const card = order.paymentMethod !== 'manual';
  const unpaid = card && order.paymentStatus !== 'paid' && ['PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(order.status);
  // Back from a successful payment (new=1) while the bank's confirmation is still on its way: no "pay" button,
  // for as long as it takes (PaymentWatcher tells the customer not to pay again when it is slow).
  const verifying = unpaid && isNew && order.status === 'PAYMENT_PENDING';
  // Why the last card was declined: from the code stored on the order (not the ?pay=failed parameter), so a reload says the same.
  const reason = order.status === 'PAYMENT_FAILED' ? declineReason(order.lastPaymentCode) : null;
  const steps = orderSteps(order);
  // Pickup details while there is still something to pick up (not stopped, refunded, unpaid by card or already collected).
  const pickup = order.shipping.method === 'pickup' && !failed && !unpaid && !['REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status) && !steps[steps.length - 1].reached;
  const link = trackingLink(order);
  const mobile = toChatId(order.customer.phone)?.replace(/@c\.us$/, '');
  const selfWa = mobile?.startsWith('9725') ? `https://wa.me/${mobile}?text=${encodeURIComponent(`ההזמנה שלי ב-${SITE.name}: ${order.id}\n${link}`)}` : undefined;
  let payUrl: string | undefined;
  if (unpaid && !verifying && getPaymentProvider().id === order.paymentMethod) {
    const h = await headers();
    const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
    payUrl = (await getPaymentProvider().start(order, origin)).redirectUrl;
  }

  return (
    <div className="container-x max-w-3xl pt-24 pb-20 print:pt-4">
      {(order.paymentStatus === 'paid' || (!card && !failed)) && (
        <PurchaseEvent
          order={{
            id: order.id,
            value: order.total,
            shipping: order.shippingPrice,
            coupon: order.couponCode,
            items: order.items.map((i) => ({ item_id: i.productSlug ?? i.productName, item_name: i.productName, item_variant: i.size, price: i.unitPrice, quantity: i.quantity })),
          }}
        />
      )}
      {unpaid && !verifying && (
        <div role={pay === 'failed' ? 'alert' : undefined} className={`mb-6 rounded-2xl border p-5 text-center ${pay === 'failed' || order.status === 'PAYMENT_FAILED' ? 'border-bad/30 bg-bad/5' : 'border-blue/30 bg-blue-50'}`}>
          <p className="font-bold">{reason ? 'התשלום לא עבר. לא חויבתם.' : pay === 'failed' || order.status === 'PAYMENT_FAILED' ? 'התשלום לא הושלם' : 'ההזמנה ממתינה לתשלום'}</p>
          {reason && <p className="mt-1 text-sm">{reason}</p>}
          <p className="mt-1 text-sm text-muted">ההזמנה והעיצוב שמורים. אפשר לנסות שוב בכרטיס אחר, או להתקשר אלינו {SITE.phone}.</p>
          {payUrl && <PayNow url={payUrl} />}
        </div>
      )}
      {isNew && !(unpaid && !verifying) && (
        <div className="mb-8 animate-fade-up text-center">
          <span className="mx-auto grid h-16 w-16 animate-pop place-items-center rounded-full bg-ok/10 text-ok">
            <Icon name="check" size={32} />
          </span>
          {verifying && <PaymentWatcher />}
          {!verifying && <h1 className="mt-4 text-3xl font-extrabold">ההזמנה התקבלה</h1>}
          <OrderConfirmation hold={!!verifying} sent={orderConfirmationSent(order)} email={order.customer.email} final={!card} link={link} selfWa={selfWa} />
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
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${failed ? 'bg-bad/10 text-bad' : 'bg-blue-50 text-blue'}`}>{statusLabel(order.status, order.shipping.method)}</span>
        </div>
        {pickup && (
          <div className="mt-4 rounded-xl border border-blue/30 bg-blue-50 p-4 text-sm">
            <p className="font-semibold">איסוף עצמי</p>
            <p className="mt-1 flex items-center gap-2">
              <Icon name="pin" size={16} className="shrink-0" /> {SITE.address}
            </p>
            <p className="mt-1 flex items-center gap-2">
              <Icon name="clock" size={16} className="shrink-0" /> {SITE.hours}
            </p>
            <a href={SITE.waze} target="_blank" rel="noopener" className="mt-2 inline-block text-blue underline">
              ניווט בווייז
            </a>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <strong className="text-base tracking-wide" dir="ltr">
                {order.id}
              </strong>
              <CopyOrderId id={order.id} />
            </div>
            <p className="mt-2 text-muted">באיסוף אמרו את מספר ההזמנה. אפשר גם להראות את הדף הזה.</p>
          </div>
        )}
        {ready && !failed && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
            <Icon name="check" size={18} /> הקובץ עבר בדיקה ומוכן לייצור
          </p>
        )}

        <ol className="mt-6 grid grid-cols-4 gap-1 print:hidden" aria-label="סטטוס ההזמנה">
          {steps.map((s) => (
            <li key={s.key} className="text-center">
              <span className={`mx-auto block h-1.5 rounded-full ${s.reached ? 'bg-blue' : 'bg-line'}`} />
              <span className={`mt-2 block text-[11px] leading-4 ${s.reached ? 'font-medium text-ink' : 'text-muted'}`}>{s.label}</span>
              {s.time && (
                <span className="block text-[11px] leading-4 text-muted" dir="ltr">
                  {s.time}
                </span>
              )}
            </li>
          ))}
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
            <dd>{order.paymentStatus === 'paid' ? (card ? 'שולם בכרטיס אשראי' : 'שולם') : card ? 'טרם שולם' : 'בטלפון / באיסוף'}</dd>
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
      {order.rewardCode && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-blue/40 bg-blue-50 p-5 text-center">
          <p className="font-bold text-blue">מתנה להזמנה הבאה שלכם</p>
          <p className="mt-1 text-sm text-ink-2">קוד אישי לשימוש חד־פעמי – הקלידו אותו בשלב התשלום</p>
          <p className="mt-3 inline-block rounded-xl bg-white px-5 py-2 text-2xl font-extrabold tracking-widest text-ink shadow-soft" dir="ltr">
            {order.rewardCode}
          </p>
        </div>
      )}
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
