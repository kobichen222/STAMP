import { NextResponse } from 'next/server';
import { newsletterEmails } from '@/server/emails';
import { rateLimit } from '@/server/rate-limit';
import { addSubscriber } from '@/server/store/neon';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; website?: string; page?: string };
  if (body.website) return NextResponse.json({ ok: true }); // honeypot
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'כתובת מייל לא תקינה' }, { status: 400 });
  if (!rateLimit('newsletter', 30, 10 * 60_000)) return NextResponse.json({ error: 'נסו שוב בעוד כמה דקות' }, { status: 429 });
  let added = true;
  try {
    added = await addSubscriber(email, String(body.page || '').slice(0, 200));
  } catch (e) {
    console.error('[newsletter]', e);
    return NextResponse.json({ error: 'ההרשמה נכשלה, נסו שוב' }, { status: 502 });
  }
  if (added) await newsletterEmails(email).catch((e) => console.error('[newsletter] mail', e));
  return NextResponse.json({ ok: true, already: !added });
}
