import { NextResponse } from 'next/server';
import { saveOrder, transition } from '@/server/orders/service';
import { getPaymentProvider } from '@/server/payments';
import { orderFor } from '../fields';

export const dynamic = 'force-dynamic';

/** "Pay now" from the order page – also after a declined card. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const o = await orderFor({ order_id: url.searchParams.get('id') ?? '', otk: url.searchParams.get('t') ?? '' });
  if (!o) return NextResponse.redirect(new URL('/', url.origin), 303);
  const provider = getPaymentProvider();
  if (o.paymentStatus === 'paid' || provider.id === 'manual' || !['PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(o.status)) {
    return NextResponse.redirect(new URL(`/order/${o.id}/?t=${o.token}`, url.origin), 303);
  }
  if (o.status === 'PAYMENT_FAILED') {
    transition(o, 'PAYMENT_PENDING', 'customer', 'ניסיון תשלום חוזר');
    o.paymentStatus = 'pending';
    await saveOrder(o);
  }
  const start = await provider.start(o, url.origin);
  return NextResponse.redirect(start.redirectUrl!, 303);
}
