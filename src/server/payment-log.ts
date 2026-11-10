import 'server-only';
import { SITE } from '@/lib/config';
import { emailDetails, emailLayout, emailP } from '@/lib/email-template';
import { sendMail } from '@/lib/mail';
import type { Order } from './orders/types';
import { databaseUrl, db } from './store/neon';

/**
 * Card-payment log: every Tranzila answer (notify = server to server, return =
 * the customer coming back from the payment form) and every payment form that
 * was opened. Failures and "no answer at all" e-mail the studio.
 */

/** Tranzila response codes (the common ones), in plain Hebrew. */
const CODES: Record<string, string> = {
  '000': 'אושר',
  '001': 'כרטיס חסום',
  '002': 'כרטיס גנוב',
  '003': 'יש להתקשר לחברת האשראי',
  '004': 'סירוב של חברת האשראי',
  '005': 'כרטיס מזויף',
  '006': 'CVV או תעודת זהות שגויים',
  '033': 'הכרטיס אינו תקין',
  '036': 'פג תוקף הכרטיס',
  '037': 'שגיאה בתשלומים',
  '039': 'מספר כרטיס שגוי',
  '057': 'חסרה תעודת זהות',
  '058': 'חסר CVV',
  '061': 'חסר מספר כרטיס',
  '107': 'הסכום גבוה מהמותר לכרטיס',
  '111': 'אין הרשאה לעסקה',
  '900': 'אימות 3D Secure נכשל',
};
export const codeText = (code?: string | null) => (!code ? 'ללא קוד' : (CODES[code] ?? `קוד ${code}`));

export interface PaymentLogRow {
  id: number;
  at: string;
  orderId: string | null;
  kind: string;
  ok: boolean | null;
  code: string | null;
  sum: number | null;
  message: string | null;
}

/** Fields worth keeping from a Tranzila post (never card data). */
function safeDetail(f: Record<string, string>) {
  const keep = ['Response', 'index', 'ConfirmationCode', 'sum', 'currency', 'cred_type', 'tranmode', 'Tempref', 'error_msg', 'errormsg', 'result'];
  return Object.fromEntries(Object.entries(f).filter(([k]) => keep.includes(k)));
}

export async function logPayment(e: { orderId?: string | null; kind: 'start' | 'notify' | 'return' | 'alert'; ok?: boolean | null; code?: string | null; sum?: number | null; message?: string; fields?: Record<string, string> }) {
  if (!databaseUrl()) return;
  try {
    const sql = await db();
    await sql`insert into s2g_payment_log (order_id, kind, ok, code, sum, message, detail)
      values (${e.orderId ?? null}, ${e.kind}, ${e.ok ?? null}, ${e.code ?? null}, ${e.sum ?? null}, ${e.message ?? null}, ${e.fields ? JSON.stringify(safeDetail(e.fields)) : null}::jsonb)`;
  } catch (err) {
    console.error('[payment-log]', err);
  }
}

export async function paymentLog(opts: { orderId?: string; limit?: number; failuresOnly?: boolean } = {}): Promise<PaymentLogRow[]> {
  if (!databaseUrl()) return [];
  const sql = await db();
  const limit = opts.limit ?? 200;
  const rows = opts.orderId
    ? await sql`select id, at, order_id, kind, ok, code, sum, message from s2g_payment_log where order_id = ${opts.orderId} order by at desc limit ${limit}`
    : opts.failuresOnly
      ? await sql`select id, at, order_id, kind, ok, code, sum, message from s2g_payment_log where ok = false order by at desc limit ${limit}`
      : await sql`select id, at, order_id, kind, ok, code, sum, message from s2g_payment_log order by at desc limit ${limit}`;
  return rows.map((r) => ({
    id: Number(r.id),
    at: new Date(r.at as string).toISOString(),
    orderId: (r.order_id as string) ?? null,
    kind: String(r.kind),
    ok: r.ok == null ? null : !!r.ok,
    code: (r.code as string) ?? null,
    sum: r.sum == null ? null : Number(r.sum),
    message: (r.message as string) ?? null,
  }));
}

/** A card payment failed: tell the studio right away, with the reason and how to reach the customer. */
export async function alertPaymentFailed(o: Order, code: string | undefined, where: string) {
  await sendMail({
    subject: `⚠ תשלום נכשל – ${o.id} · ${o.customer.name}`,
    html: emailLayout({
      staff: true,
      badge: '⚠ תשלום נכשל',
      tone: 'red',
      title: `התשלום בהזמנה ${o.id} לא עבר`,
      body:
        emailP(`סיבה: <strong>${codeText(code)}</strong>${code ? ` (קוד ${code})` : ''} · ${where}`) +
        emailDetails([
          ['לקוח', o.customer.name],
          ['טלפון', o.customer.phone],
          ['מייל', o.customer.email],
          ['סכום', `₪${o.total}`],
        ]) +
        emailP('כדאי לחזור ללקוח – אפשר לשלוח לו שוב את קישור ההזמנה לתשלום, או לגבות בטלפון ולסמן כשולם.'),
      cta: { label: 'פתיחת ההזמנה בניהול', url: `${SITE.url}/admin/orders/${o.id}/` },
    }),
  }).catch((e) => console.error('[payment-log] alert mail', e));
}

/** Health of card payments over the last day (for the dashboard and the payments page). */
export async function paymentHealth() {
  const empty = { lastOk: null as string | null, failures24h: 0, stuck: [] as { id: string; name: string; total: number; createdAt: string }[] };
  if (!databaseUrl()) return empty;
  const sql = await db();
  const [last] = await sql`select max(at) at from s2g_payment_log where ok = true`;
  const [fails] = await sql`select count(*)::int n from s2g_payment_log where ok = false and at > now() - interval '24 hours'`;
  // Card orders opened in the last day (older than 15 minutes) that never got any answer from Tranzila – one query.
  const rows = await sql`select o.id, o.customer_name, o.total, o.created_at from s2g_orders o
    where o.status = 'PAYMENT_PENDING' and coalesce(o.data->>'paymentMethod', '') <> 'manual'
      and o.created_at < now() - interval '15 minutes' and o.created_at > now() - interval '1 day'
      and not exists (select 1 from s2g_payment_log l where l.order_id = o.id and l.kind in ('notify', 'return'))
    order by o.created_at desc limit 50`;
  const stuck = rows.map((r) => ({ id: String(r.id), name: String(r.customer_name), total: Number(r.total), createdAt: new Date(r.created_at as string).toISOString() }));
  return { lastOk: last?.at ? new Date(last.at as string).toISOString() : null, failures24h: Number(fails?.n ?? 0), stuck };
}

/**
 * Several card orders in a row with no answer at all from Tranzila usually
 * means the payment form itself is failing. E-mail the studio (at most every 6 hours).
 */
export async function checkPaymentsAlive() {
  if (!databaseUrl()) return;
  const h = await paymentHealth();
  if (h.stuck.length < 2) return;
  const lastOk = h.lastOk ? new Date(h.lastOk).getTime() : 0;
  if (h.stuck.every((s) => new Date(s.createdAt).getTime() < lastOk)) return; // a payment went through since
  const sql = await db();
  const [prev] = await sql`select at from s2g_payment_log where kind = 'alert' order by at desc limit 1`;
  if (prev && Date.now() - new Date(prev.at as string).getTime() < 6 * 3600_000) return;
  await logPayment({ kind: 'alert', ok: false, message: `${h.stuck.length} הזמנות באשראי בלי תשובה מטרנזילה` });
  await sendMail({
    subject: `⚠ ייתכן שהסליקה לא עובדת – ${h.stuck.length} הזמנות בלי תשלום`,
    html: emailLayout({
      staff: true,
      badge: '⚠ בדיקת סליקה',
      tone: 'red',
      title: 'לקוחות פתחו תשלום ולא קיבלנו תשובה מטרנזילה',
      body:
        emailP('ההזמנות האלה נפתחו לתשלום באשראי ולא הגיעה עליהן שום תשובה – לא אישור ולא סירוב. כשזה קורה לכמה לקוחות ברצף, בדרך כלל טופס התשלום עצמו נכשל.') +
        emailDetails(h.stuck.map((s) => [`${s.id} · ${s.name}`, `₪${s.total}`] as [string, string])) +
        emailP(h.lastOk ? `התשלום האחרון שאושר: ${new Date(h.lastOk).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}` : 'עדיין לא נרשם תשלום מאושר ביומן.') +
        emailP('מה לעשות: לנסות תשלום קטן באתר, ואם יש שגיאה – לפנות לטרנזילה עם מספר המסוף.'),
      cta: { label: 'ללוג הסליקה', url: `${SITE.url}/admin/payments/` },
    }),
  }).catch((e) => console.error('[payment-log] alive mail', e));
}
