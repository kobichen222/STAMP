import { NextResponse } from 'next/server';
import { fieldsTable, MailNotConfiguredError, sendMail } from '@/lib/mail';
import { saveContact } from '@/server/store/neon';

export async function POST(req: Request) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true }); // honeypot
  const name = String(body.name || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 50);
  if (!name || !/^[\d\s+()-]{7,}$/.test(phone)) {
    return NextResponse.json({ error: 'נא למלא שם וטלפון תקין' }, { status: 400 });
  }
  const email = String(body.email || '').trim().slice(0, 200);
  const message = String(body.message || '').slice(0, 5000);
  const page = String(body.page || '').slice(0, 300);
  let mailError: unknown = null;
  try {
    await sendMail({
      subject: `פנייה חדשה מהאתר – ${name}`,
      replyTo: email || undefined,
      html: fieldsTable({ שם: name, טלפון: phone, אימייל: email, הודעה: message, עמוד: page }),
    });
  } catch (e) {
    console.error(e);
    mailError = e;
  }
  // Every lead is kept in the database – even when the e-mail could not be sent.
  let saved = false;
  try {
    await saveContact({ name, phone, email, message, page, mailed: !mailError });
    saved = true;
  } catch (e) {
    console.error(e);
  }
  if (mailError && !saved) {
    const status = mailError instanceof MailNotConfiguredError ? 503 : 502;
    return NextResponse.json({ error: 'השליחה נכשלה, נא להתקשר 03-6733-770' }, { status });
  }
  return NextResponse.json({ ok: true });
}
