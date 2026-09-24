import { NextResponse } from 'next/server';
import { fieldsTable, MailNotConfiguredError, sendMail } from '@/lib/mail';

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
  try {
    await sendMail({
      subject: `פנייה חדשה מהאתר – ${name}`,
      replyTo: body.email || undefined,
      html: fieldsTable({ שם: name, טלפון: phone, אימייל: body.email, הודעה: String(body.message || '').slice(0, 5000), עמוד: body.page }),
    });
  } catch (e) {
    console.error(e);
    const status = e instanceof MailNotConfiguredError ? 503 : 502;
    return NextResponse.json({ error: 'השליחה נכשלה, נא להתקשר 03-6733-770' }, { status });
  }
  return NextResponse.json({ ok: true });
}
