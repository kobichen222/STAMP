import { after, NextResponse } from 'next/server';
import { markCartConverted } from '@/server/abandoned';
import { logPayment } from '@/server/payment-log';
import { checkoutFieldErrors, type CheckoutFieldErrors } from '@/lib/checkout-rules';
import { checkoutSchema, CheckoutError, createOrder, pricingRulesFor } from '@/server/orders/service';
import { getPaymentProvider } from '@/server/payments';
import { rateLimit } from '@/server/rate-limit';

export const maxDuration = 60;

/** Every failing form field of a request the schema refused, with the message the form shows next to it. */
async function fieldErrorsOf(body: unknown): Promise<CheckoutFieldErrors> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, Record<string, unknown> | undefined>;
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const customer = b.customer ?? {};
  const shipping = b.shipping ?? {};
  const address = (shipping.address && typeof shipping.address === 'object' ? shipping.address : {}) as Record<string, unknown>;
  let method;
  try {
    method = (await pricingRulesFor()).shipping.find((s) => s.id === shipping.method);
  } catch (e) {
    console.error('[checkout] shipping rules', e);
  }
  return checkoutFieldErrors({
    name: str(customer.name),
    phone: str(customer.phone),
    email: str(customer.email),
    company: str(customer.company),
    companyId: str(customer.companyId),
    poNumber: str(customer.poNumber),
    street: str(address.street),
    city: str(address.city),
    zip: str(address.zip),
    notes: str(b.notes),
    coupon: str(b.couponCode),
    shipping: method,
  });
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`checkout:${ip}`, 8, 60_000)) return NextResponse.json({ error: 'יותר מדי ניסיונות, נסו שוב בעוד דקה' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join('.') ?? '';
    const fields = await fieldErrorsOf(body);
    return NextResponse.json({ error: Object.values(fields)[0] ?? 'פרטי ההזמנה אינם תקינים', field, fields }, { status: 400 });
  }
  try {
    const order = await createOrder(parsed.data);
    after(() => markCartConverted(order.customer.email, order.id).catch((e) => console.error('[abandoned] convert', e)));
    // Card payment: the browser continues to the payment page.
    const provider = getPaymentProvider();
    let paymentUrl: string | undefined;
    if (provider.id !== 'manual' && order.paymentMethod === provider.id && order.paymentStatus !== 'paid') {
      paymentUrl = (await provider.start(order, new URL(req.url).origin)).redirectUrl;
      after(() => logPayment({ orderId: order.id, kind: 'start', sum: order.total, message: 'נפתח טופס תשלום בקופה' }));
    }
    return NextResponse.json({ id: order.id, token: order.token, status: order.status, total: order.total, paymentUrl });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message, fields: e.field ? { [e.field]: e.message } : undefined }, { status: e.status });
    console.error('[checkout]', e);
    return NextResponse.json({ error: 'לא הצלחנו לשמור את ההזמנה. נסו שוב או התקשרו 03-6733-770' }, { status: 500 });
  }
}
