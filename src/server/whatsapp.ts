import 'server-only';

/**
 * WhatsApp notifications through Green API (green-api.com) – an instance linked to the studio's
 * WhatsApp number. Nothing is sent until the instance is set in the environment:
 *
 *   GREEN_API_INSTANCE   the instance id (idInstance)
 *   GREEN_API_TOKEN      the instance token (apiTokenInstance)
 *   GREEN_API_URL        the instance's API address, when the console shows one (default https://api.green-api.com)
 *   WHATSAPP_ADMIN_TO    staff numbers that get the alerts, comma separated (e.g. 0501234567,0527654321)
 *   WHATSAPP_CUSTOMER    "0" turns off the messages to customers (staff alerts stay on)
 */
const env = (k: string) => (process.env[k] ?? '').trim().split(/\s+/)[0] ?? '';

export const whatsappConfigured = () => !!(env('GREEN_API_INSTANCE') && env('GREEN_API_TOKEN'));
export const whatsappCustomerOn = () => whatsappConfigured() && env('WHATSAPP_CUSTOMER') !== '0';

/**
 * A phone number as a WhatsApp chat id. Israeli mobiles in any spelling (050-123 4567, +972 50…, 97250…),
 * or a full international number written with "+". Landlines and anything unclear give null – no message is sent.
 */
export function toChatId(phone: string | null | undefined): string | null {
  const raw = String(phone ?? '').trim();
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('972')) d = d;
  else if (d.startsWith('0')) d = `972${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('5')) d = `972${d}`;
  else if (!raw.startsWith('+')) return null;
  if (d.startsWith('972')) {
    d = `972${d.slice(3).replace(/^0/, '')}`;
    return /^9725\d{8}$/.test(d) ? `${d}@c.us` : null;
  }
  return /^\d{8,15}$/.test(d) ? `${d}@c.us` : null;
}

/** The staff numbers for alerts (WHATSAPP_ADMIN_TO), as chat ids. */
export function staffChats(): string[] {
  const list = (process.env.WHATSAPP_ADMIN_TO ?? '').split(/[,;\n]/).map((p) => toChatId(p));
  return [...new Set(list.filter((c): c is string => !!c))];
}

const endpoint = (method: string) => `${(env('GREEN_API_URL') || 'https://api.green-api.com').replace(/\/+$/, '')}/waInstance${env('GREEN_API_INSTANCE')}/${method}/${env('GREEN_API_TOKEN')}`;

export class WhatsAppError extends Error {}

/** Sends one text message. Throws WhatsAppError (never with the token in the text). */
export async function sendWhatsApp(chatId: string, message: string): Promise<string> {
  if (!whatsappConfigured()) throw new WhatsAppError('WhatsApp is not configured');
  let res: Response;
  try {
    res = await fetch(endpoint('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message: message.slice(0, 4000) }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new WhatsAppError(`no answer from Green API (${e instanceof Error ? e.name : 'error'})`);
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new WhatsAppError(`Green API answered ${res.status}: ${text.slice(0, 200)}`);
  try {
    return String((JSON.parse(text) as { idMessage?: string }).idMessage ?? '');
  } catch {
    return '';
  }
}

/** To the customer: quietly does nothing when off, or when the number is not a mobile. Returns whether it was sent. */
export async function whatsappCustomer(phone: string | null | undefined, message: string): Promise<boolean> {
  const chat = whatsappCustomerOn() ? toChatId(phone) : null;
  if (!chat) return false;
  await sendWhatsApp(chat, message);
  return true;
}

/** To every staff number. Returns how many got it; failures are logged, never thrown. */
export async function whatsappStaff(message: string): Promise<number> {
  if (!whatsappConfigured()) return 0;
  const results = await Promise.allSettled(staffChats().map((c) => sendWhatsApp(c, message)));
  for (const r of results) if (r.status === 'rejected') console.error('[whatsapp] staff', r.reason instanceof Error ? r.reason.message : r.reason);
  return results.filter((r) => r.status === 'fulfilled').length;
}

/** The instance's state, for the admin screens: "authorized" means the phone is linked and messages go out. */
export async function whatsappState(): Promise<{ configured: boolean; state?: string; error?: string; staff: number }> {
  const staff = staffChats().length;
  if (!whatsappConfigured()) return { configured: false, staff };
  try {
    const res = await fetch(endpoint('getStateInstance'), { signal: AbortSignal.timeout(8_000), cache: 'no-store' });
    if (!res.ok) return { configured: true, error: `Green API answered ${res.status}`, staff };
    return { configured: true, state: String(((await res.json()) as { stateInstance?: string }).stateInstance ?? ''), staff };
  } catch (e) {
    return { configured: true, error: e instanceof Error ? e.name : 'error', staff };
  }
}
