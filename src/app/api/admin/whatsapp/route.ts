import { NextResponse } from 'next/server';
import { requireStaff } from '@/server/staff';
import { sendWhatsApp, staffChats, toChatId, WhatsAppError, whatsappConfigured, whatsappState } from '@/server/whatsapp';

export const dynamic = 'force-dynamic';

const guard = async () => {
  try {
    await requireStaff(['admin']);
    return null;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
};

/** The state of the WhatsApp instance (configured / linked phone / staff numbers). */
export async function GET() {
  return (await guard()) ?? NextResponse.json(await whatsappState());
}

/** Sends a test message: to the number given, or to the staff numbers. */
export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  if (!whatsappConfigured()) return NextResponse.json({ error: 'עוד לא הוגדר מופע Green API (GREEN_API_INSTANCE, GREEN_API_TOKEN)' }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const given = String(body.phone ?? '').trim();
  const chats = given ? [toChatId(given)].filter((c): c is string => !!c) : staffChats();
  if (!chats.length) return NextResponse.json({ error: given ? 'מספר לא תקין – צריך מספר נייד' : 'לא הוגדרו מספרי צוות (WHATSAPP_ADMIN_TO)' }, { status: 400 });
  try {
    for (const c of chats) await sendWhatsApp(c, 'הודעת בדיקה מאתר Stamp2Go ✅\nהתראות הוואטסאפ מחוברות.');
    return NextResponse.json({ ok: true, sent: chats.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof WhatsAppError ? e.message : 'השליחה נכשלה' }, { status: 502 });
  }
}
