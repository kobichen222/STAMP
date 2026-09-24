import { NextResponse } from 'next/server';
import { checkoutSchema, CheckoutError, createOrder } from '@/server/orders/service';
import { rateLimit } from '@/server/rate-limit';

export const maxDuration = 60;

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`checkout:${ip}`, 8, 60_000)) return NextResponse.json({ error: 'יותר מדי ניסיונות, נסו שוב בעוד דקה' }, { status: 429 });
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join('.') ?? '';
    const msg = field.startsWith('customer.phone') ? 'מספר טלפון לא תקין' : field.startsWith('customer.name') ? 'נא למלא שם מלא' : field.startsWith('customer.email') ? 'אימייל לא תקין' : 'פרטי ההזמנה אינם תקינים';
    return NextResponse.json({ error: msg, field }, { status: 400 });
  }
  try {
    const order = await createOrder(parsed.data);
    return NextResponse.json({ id: order.id, token: order.token, status: order.status, total: order.total });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[checkout]', e);
    return NextResponse.json({ error: 'לא הצלחנו לשמור את ההזמנה. נסו שוב או התקשרו 03-6733-770' }, { status: 500 });
  }
}
