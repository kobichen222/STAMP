import 'server-only';
import { SITE } from '@/lib/config';
import { emailDetails, emailLayout, emailP } from '@/lib/email-template';
import { escapeHtml, sendMail } from '@/lib/mail';
import { trackingLink } from './notifications';
import { checkPaymentsAlive } from './payment-log';
import { getStore } from './store';
import { databaseUrl, db } from './store/neon';

/**
 * Abandoned checkout: the checkout saves the cart once a valid e-mail is typed.
 * 20 minutes later, if no order came in for that e-mail, the customer gets one
 * reminder with a link that puts the same cart back. Card orders that were
 * created but never paid get one "complete your payment" reminder instead.
 */
export const ABANDON_MINUTES = 20;

export interface CartSnapshotItem {
  productSlug?: string;
  productName: string;
  modelId: string;
  size: string;
  design: unknown;
  ink: string;
  bodyColor?: string;
  quantity: number;
  unitPrice: number | null;
  addons?: Record<string, number>;
  previewSvg?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const money = (n: number) => `₪${Math.round(n * 100) / 100}`;
const first = (name?: string | null) => escapeHtml((name ?? '').trim().split(/\s+/)[0] || '');

export async function saveCart(c: { id: string; email: string; name?: string; phone?: string; items: CartSnapshotItem[]; total?: number }) {
  if (!databaseUrl() || !EMAIL.test(c.email) || !/^[\w-]{16,64}$/.test(c.id) || !c.items.length) return;
  const sql = await db();
  const email = c.email.trim().toLowerCase();
  // Someone who asked to stop never gets another reminder.
  const [stop] = await sql`select 1 from s2g_carts where lower(email) = ${email} and unsubscribed limit 1`;
  await sql`insert into s2g_carts (id, email, name, phone, items, total, unsubscribed)
    values (${c.id}, ${email}, ${c.name || null}, ${c.phone || null}, ${JSON.stringify(c.items)}::jsonb, ${c.total ?? null}, ${!!stop})
    on conflict (id) do update set email = excluded.email, name = excluded.name, phone = excluded.phone, items = excluded.items, total = excluded.total, updated_at = now()
    where s2g_carts.sent_at is null and s2g_carts.converted_order is null`;
}

/** An order was placed: no "you forgot" e-mail for this person. */
export async function markCartConverted(email: string | undefined, orderId: string) {
  if (!databaseUrl() || !email) return;
  const sql = await db();
  await sql`update s2g_carts set converted_order = ${orderId} where lower(email) = ${email.trim().toLowerCase()} and converted_order is null`;
}

export async function getCart(id: string): Promise<CartSnapshotItem[] | null> {
  if (!databaseUrl() || !/^[\w-]{16,64}$/.test(id)) return null;
  const sql = await db();
  const [r] = await sql`select items from s2g_carts where id = ${id}`;
  return r ? (r.items as CartSnapshotItem[]) : null;
}

export async function unsubscribeCart(id: string): Promise<boolean> {
  if (!databaseUrl() || !/^[\w-]{16,64}$/.test(id)) return false;
  const sql = await db();
  const [r] = await sql`select email from s2g_carts where id = ${id}`;
  if (!r) return false;
  await sql`update s2g_carts set unsubscribed = true where lower(email) = ${String(r.email)}`;
  return true;
}

export async function listCarts(limit = 50) {
  if (!databaseUrl()) return [];
  const sql = await db();
  const rows = await sql`select id, email, name, phone, items, total, updated_at, sent_at, converted_order, unsubscribed from s2g_carts order by updated_at desc limit ${limit}`;
  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    name: (r.name as string) ?? '',
    phone: (r.phone as string) ?? '',
    items: (r.items as CartSnapshotItem[]).map((i) => `${i.productName}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', '),
    total: r.total == null ? null : Number(r.total),
    updatedAt: new Date(r.updated_at as string).toISOString(),
    sentAt: r.sent_at ? new Date(r.sent_at as string).toISOString() : null,
    convertedOrder: (r.converted_order as string) ?? null,
    unsubscribed: !!r.unsubscribed,
  }));
}

export function cartEmail(c: { id: string; name?: string | null; items: CartSnapshotItem[]; total?: number | null }) {
  const restore = `${SITE.url}/cart/restore/?c=${encodeURIComponent(c.id)}`;
  const stop = `${SITE.url}/api/abandoned/stop/?c=${encodeURIComponent(c.id)}`;
  const name = first(c.name);
  const rows = c.items.map((i) => [`${i.productName}${i.size ? ` · ${i.size}` : ""}`, i.quantity > 1 ? `${i.quantity} יח׳` : '1 יח׳'] as [string, string]);
  return emailLayout({
    preheader: 'העיצוב שלך שמור – נשאר רק לסיים את ההזמנה',
    badge: '🛒 העגלה שלך מחכה',
    tone: 'orange',
    title: name ? `${name}, החותמת שלך כמעט מוכנה` : 'החותמת שלך כמעט מוכנה',
    body:
      emailP('ראינו שהתחלת הזמנה ולא סיימת – אולי משהו הפריע באמצע? שמרנו לך את העיצוב בדיוק כמו שהשארת אותו.') +
      emailDetails([...rows, ...(c.total ? ([['סה״כ', money(c.total)]] as [string, string][]) : [])]) +
      emailP('לחיצה אחת מחזירה אותך לקופה עם אותה עגלה. מרגע האישור החותמת מיוצרת תוך דקות.') +
      emailP(`יש שאלה או שמשהו לא עבד? כתבו לנו <a href="${SITE.whatsapp}" style="color:#12a150">בוואטסאפ</a> או חייגו <a href="${SITE.phoneHref}" style="color:#2457ff">${escapeHtml(SITE.phone)}</a> – נשמח לעזור לסיים.`),
    cta: { label: 'להשלמת ההזמנה', url: restore },
    note: `קיבלת את המייל כי התחלת הזמנה באתר. <a href="${stop}" style="color:#8a94a6">לא לשלוח לי תזכורות</a>`,
  });
}

let lastSweep = 0;

/** Send the reminders that are due. Safe to call often: throttled, and each reminder is claimed once. */
export async function sweepAbandoned(force = false): Promise<{ carts: number; payments: number }> {
  const done = { carts: 0, payments: 0 };
  if (!databaseUrl()) return done;
  if (!force && Date.now() - lastSweep < 60_000) return done;
  lastSweep = Date.now();
  const sql = await db();

  // 1) Carts left at checkout.
  const due = await sql`update s2g_carts set sent_at = now()
    where id in (
      select id from s2g_carts
      where sent_at is null and converted_order is null and not unsubscribed
        and updated_at < now() - make_interval(mins => ${ABANDON_MINUTES})
        and updated_at > now() - interval '2 days'
      order by updated_at limit 20
    ) and sent_at is null
    returning id, email, name, items, total`;
  for (const r of due) {
    const email = String(r.email);
    // An order for the same e-mail since the cart was saved means it wasn't abandoned.
    const [order] = await sql`select id from s2g_orders where lower(customer_email) = ${email} and created_at > now() - interval '3 days' limit 1`;
    if (order) {
      await sql`update s2g_carts set converted_order = ${String(order.id)} where id = ${String(r.id)}`;
      continue;
    }
    try {
      await sendMail({ to: [email], subject: 'שכחת משהו? החותמת שלך מחכה לך 🛒', html: cartEmail({ id: String(r.id), name: r.name as string, items: r.items as CartSnapshotItem[], total: r.total == null ? null : Number(r.total) }) });
      done.carts++;
    } catch (e) {
      console.error('[abandoned] cart mail', email, e);
      await sql`update s2g_carts set sent_at = null where id = ${String(r.id)}`;
    }
  }

  // 2) Card orders created but never paid.
  // Newest first: one reminder per person, for their latest unpaid order only.
  const pending = (await getStore().listOrders({ status: ['PAYMENT_PENDING'], limit: 50 })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const now = Date.now();
  const seen = new Set<string>();
  for (const o of pending) {
    const age = now - new Date(o.createdAt).getTime();
    if (!o.customer.email || o.paymentMethod === 'manual' || age < ABANDON_MINUTES * 60_000 || age > 2 * 864e5 || o.notificationsSent.includes('payment.reminder')) continue;
    const email = o.customer.email.toLowerCase();
    const [stop] = await sql`select 1 from s2g_carts where lower(email) = ${email} and unsubscribed limit 1`;
    // Already reminded about another order, or paid a later one (a retry that went through).
    const [later] = await sql`select 1 from s2g_orders where lower(customer_email) = ${email} and id <> ${o.id} and created_at > now() - interval '3 days'
      and (payment_status = 'paid' or data->'notificationsSent' ? 'payment.reminder') limit 1`;
    const dup = seen.has(email) || !!later;
    seen.add(email);
    o.notificationsSent.push('payment.reminder');
    await getStore().saveOrder(o);
    if (stop || dup) continue;
    try {
      await sendMail({
        to: [o.customer.email],
        subject: `ההזמנה ${o.id} מחכה לתשלום`,
        html: emailLayout({
          preheader: 'ההזמנה והעיצוב שמורים – נשאר רק לשלם',
          badge: '⏳ ממתין לתשלום',
          tone: 'orange',
          title: `${first(o.customer.name) || 'היי'}, נשאר רק צעד אחד`,
          body:
            emailP('ההזמנה שלך נשמרה אבל התשלום עוד לא הושלם. ברגע שהתשלום יאושר, החותמת נכנסת לייצור.') +
            emailDetails([...o.items.map((i) => [`${i.productName} · ${i.size}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`, money(i.total)] as [string, string]), ['סה״כ לתשלום', money(o.total)], ['מספר הזמנה', o.id]]) +
            emailP(`משהו לא עבד בתשלום? כתבו לנו <a href="${SITE.whatsapp}" style="color:#12a150">בוואטסאפ</a> – נסדר יחד.`),
          cta: { label: 'להשלמת התשלום', url: trackingLink(o) },
        }),
      });
      done.payments++;
    } catch (e) {
      console.error('[abandoned] payment mail', o.id, e);
    }
  }
  await checkPaymentsAlive().catch((e) => console.error('[payment-log] alive', e));
  return done;
}
