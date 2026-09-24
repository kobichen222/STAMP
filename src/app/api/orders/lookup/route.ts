import { NextResponse } from 'next/server';
import { loadOrder } from '@/server/orders/service';
import { rateLimit } from '@/server/rate-limit';

const digits = (s: string) => s.replace(/\D/g, '').slice(-9);

/** Order number + phone → tracking link (for customers without the e-mail link). */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`lookup:${ip}`, 10, 10 * 60_000)) return NextResponse.json({ error: 'יותר מדי ניסיונות' }, { status: 429 });
  const { id, phone } = (await req.json().catch(() => ({}))) as { id?: string; phone?: string };
  const o = id ? await loadOrder(String(id).trim().toUpperCase()) : null;
  if (!o || !phone || digits(o.customer.phone) !== digits(phone)) return NextResponse.json({ error: 'לא נמצאה הזמנה עם הפרטים האלה' }, { status: 404 });
  return NextResponse.json({ url: `/order/${o.id}/?t=${o.token}` });
}
