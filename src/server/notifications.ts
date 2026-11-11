import 'server-only';
import { SITE } from '@/lib/config';
import { escapeHtml, MailNotConfiguredError, sendMail } from '@/lib/mail';
import { emailDetails, emailHighlight, emailLayout, emailP, emailSteps, type EmailParts } from '@/lib/email-template';
import type { Order } from './orders/types';

/**
 * Notifications engine (spec §177–179): every event is sent at most once per
 * order+recipient+template, tracked in order.notificationsSent.
 */
export type NotifyEvent = 'order.created' | 'order.awaiting_approval' | 'production.started' | 'order.ready_for_pickup' | 'order.shipped' | 'order.production_error' | 'order.reward';

interface Built {
  subject: string;
  customer?: EmailParts;
  staff?: EmailParts;
}

const money = (n: number) => `₪${(Math.round(n * 100) / 100).toLocaleString('he-IL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const first = (name: string) => escapeHtml(name.trim().split(/\s+/)[0] || name);

function shippingText(o: Order) {
  if (o.shipping.method === 'pickup') return `איסוף עצמי – ${SITE.address}`;
  const a = o.shipping.address;
  return [o.shipping.label, a ? [a.street, a.city].filter(Boolean).join(', ') : ''].filter(Boolean).join(' · ');
}

/** Items + totals, for the order e-mails. */
function orderSummary(o: Order): string {
  const items = emailDetails(o.items.map((i) => [`${i.productName} · ${i.size}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`, money(i.total)]));
  const totals = emailDetails([
    ['סכום ביניים', money(o.subtotal)],
    ['הנחה', o.discount ? `−${money(o.discount)}${o.couponCode ? ` (${o.couponCode})` : ''}` : null],
    ['משלוח', o.shippingPrice ? money(o.shippingPrice) : 'חינם'],
    ['סה״כ לתשלום', money(o.total)],
  ]);
  return items + totals + emailDetails([['מספר הזמנה', o.id], ['משלוח / איסוף', shippingText(o)]]);
}

function build(event: NotifyEvent, o: Order): Built {
  const link = trackingLink(o);
  const name = first(o.customer.name);
  const admin = `${SITE.url}/admin/orders/${o.id}/`;
  const staffSummary = (title: string, badge: string, tone: EmailParts['tone'] = 'blue'): EmailParts => ({
    staff: true,
    badge,
    tone,
    title,
    body:
      emailDetails([
        ['לקוח', o.customer.name],
        ['טלפון', o.customer.phone],
        ['מייל', o.customer.email],
        ['חברה', o.customer.company],
      ]) + orderSummary(o),
    cta: { label: 'פתיחת ההזמנה בניהול', url: admin },
  });
  switch (event) {
    case 'order.created':
      return {
        subject: `תודה! ההזמנה ${o.id} התקבלה`,
        customer: {
          preheader: `קיבלנו את ההזמנה שלך – ${money(o.total)}`,
          badge: '✓ ההזמנה התקבלה',
          tone: 'green',
          title: `תודה ${name}, ההזמנה התקבלה!`,
          body:
            emailP('איזה כיף שבחרת בנו. הקובץ שלך עבר בדיקה אוטומטית ונכנס לתור הייצור – נעדכן אותך בכל שלב.') +
            emailSteps([
              { title: 'ההזמנה התקבלה', text: 'התשלום אושר והעיצוב נשמר', done: true },
              { title: 'ייצור', text: 'החותמת מיוצרת תוך דקות מרגע האישור' },
              { title: o.shipping.method === 'pickup' ? 'מוכן לאיסוף' : 'משלוח', text: shippingText(o) },
            ]) +
            orderSummary(o),
          cta: { label: 'מעקב אחר ההזמנה', url: link },
          note: 'שאלה? פשוט השיבו למייל הזה או כתבו לנו בוואטסאפ.',
        },
        staff: staffSummary(`הזמנה חדשה – ${o.customer.name}`, `🛒 הזמנה חדשה · ${money(o.total)}`, 'green'),
      };
    case 'order.awaiting_approval':
      return {
        subject: `ההגהה להזמנה ${o.id} מחכה לאישורך`,
        customer: {
          badge: 'נדרש אישור',
          tone: 'orange',
          title: `${name}, ההגהה מוכנה`,
          body: emailP('הכנו את קובץ החותמת שלך. עברו עליו ואשרו לייצור – או בקשו תיקון, ואנחנו נטפל מיד.'),
          cta: { label: 'צפייה ואישור ההגהה', url: link },
        },
      };
    case 'production.started':
      return {
        subject: `החותמת שלך בייצור – ${o.id}`,
        customer: {
          badge: '⚙ בייצור',
          title: `${name}, החותמת שלך בייצור`,
          body: emailP(`ההזמנה ${o.id} נכנסה עכשיו לייצור. נעדכן ברגע שהיא מוכנה.`),
          cta: { label: 'מעקב אחר ההזמנה', url: link },
        },
      };
    case 'order.ready_for_pickup':
      return {
        subject: `ההזמנה ${o.id} מוכנה!`,
        customer: {
          badge: '✓ מוכן',
          tone: 'green',
          title: o.shipping.method === 'pickup' ? `${name}, החותמת מחכה לך` : `${name}, החותמת מוכנה ויוצאת אליך`,
          body:
            o.shipping.method === 'pickup'
              ? emailP(`אפשר לבוא לאסוף ב${escapeHtml(SITE.address)}, ${escapeHtml(SITE.hours)}.`) +
                emailP(`<a href="${SITE.waze}" style="color:#2457ff">ניווט ב-Waze ←</a>`)
              : emailP('החותמת יצאה מהייצור ונמסרת לשליח. מספר מעקב יישלח כשהמשלוח ייצא.'),
          cta: { label: 'פרטי ההזמנה', url: link },
        },
      };
    case 'order.shipped':
      return {
        subject: `ההזמנה ${o.id} בדרך אליך 🚚`,
        customer: {
          badge: '🚚 נשלח',
          title: `${name}, החותמת בדרך!`,
          body:
            emailP('ההזמנה נמסרה לשליח.') +
            (o.shipping.trackingNumber ? emailHighlight('מספר מעקב', o.shipping.trackingNumber) : '') +
            emailDetails([['כתובת', shippingText(o)], ['חברת שילוח', o.shipping.carrier]]),
          cta: o.shipping.trackingUrl ? { label: 'מעקב אחר המשלוח', url: o.shipping.trackingUrl } : { label: 'פרטי ההזמנה', url: link },
        },
      };
    case 'order.reward': {
      const pct = o.rewardCode ? `${o.rewardCode.match(/^S2G(\d+)/)?.[1] ?? ''}%` : '';
      return {
        subject: `מתנה: ${pct} הנחה להזמנה הבאה 🎁`,
        customer: {
          badge: '🎁 מתנה',
          tone: 'green',
          title: `תודה ${name}! ${pct} הנחה מחכה לך`,
          body:
            emailP(`תודה שהזמנת מאיתנו (הזמנה ${o.id}). הכנו לך קוד אישי להזמנה הבאה:`) +
            emailHighlight(`${pct} הנחה`, o.rewardCode ?? '') +
            emailP('הקוד אישי ולשימוש חד-פעמי – מזינים אותו בשלב התשלום.'),
          cta: { label: 'לעיצוב החותמת הבאה', url: `${SITE.url}/designer/` },
        },
      };
    }
    case 'order.production_error':
      return {
        subject: `⚠ שגיאה בקובץ ייצור – ${o.id}`,
        staff: {
          ...staffSummary(`שגיאה ביצירת קובץ הייצור`, '⚠ דרוש טיפול', 'red'),
          body: emailP(`יצירת קובץ הייצור נכשלה להזמנה ${o.id} (${escapeHtml(o.customer.name)}). פתחו את ההזמנה ולחצו "ייצור מחדש".`),
        },
      };
  }
}

export function trackingLink(o: Pick<Order, 'id' | 'token'>) {
  return `${SITE.url}/order/${o.id}/?t=${o.token}`;
}

/** Returns the event ids that were actually sent (caller stores them on the order). */
export async function notify(
  order: Order,
  event: NotifyEvent,
  attachments?: { filename: string; content: Buffer; contentType?: string }[],
  opts: { customer?: boolean; staff?: boolean } = {},
): Promise<string[]> {
  const b = build(event, order);
  const sent: string[] = [];
  const jobs: Promise<void>[] = [];
  if (b.customer && order.customer.email && opts.customer !== false) {
    const id = `${event}:customer`;
    if (!order.notificationsSent.includes(id)) {
      jobs.push(sendMail({ to: [order.customer.email!], subject: b.subject, html: emailLayout(b.customer) }).then(() => void sent.push(id)));
    }
  }
  if (b.staff && opts.staff !== false) {
    const id = `${event}:staff`;
    if (!order.notificationsSent.includes(id)) {
      jobs.push(
        sendMail({
          subject: `[${order.id}] ${b.staff.title} – ${order.customer.name}`,
          html: emailLayout(b.staff),
          replyTo: order.customer.email,
          attachments,
        }).then(() => void sent.push(id)),
      );
    }
  }
  // WhatsApp (optional): plug a provider (e.g. Twilio / WhatsApp Cloud API) here, same dedupe ids with ":whatsapp".
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status !== 'rejected') continue;
    if (r.reason instanceof MailNotConfiguredError) console.warn(`[notify] ${event}: e-mail not configured (RESEND_API_KEY)`);
    else console.error('[notify]', event, r.reason);
  }
  return sent;
}
