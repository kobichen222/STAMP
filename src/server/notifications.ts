import 'server-only';
import { SITE } from '@/lib/config';
import { escapeHtml, MailNotConfiguredError, sendMail } from '@/lib/mail';
import { STATUS_LABEL, type Order } from './orders/types';

/**
 * Notifications engine (spec §177–179): every event is sent at most once per
 * order+recipient+template, tracked in order.notificationsSent.
 */
export type NotifyEvent = 'order.created' | 'order.awaiting_approval' | 'production.started' | 'order.ready_for_pickup' | 'order.shipped' | 'order.production_error';

const TEMPLATES: Record<NotifyEvent, { subject: string; body: string; toCustomer: boolean; toStaff: boolean }> = {
  'order.created': {
    subject: 'ההזמנה {{order_number}} התקבלה',
    body: 'שלום {{customer_name}},<br>קיבלנו את ההזמנה שלך ({{product_name}}). הקובץ עבר בדיקה ונכנס לתור הייצור.<br>מעקב אחר ההזמנה: {{tracking_link}}',
    toCustomer: true,
    toStaff: true,
  },
  'order.awaiting_approval': {
    subject: 'ההגהה להזמנה {{order_number}} מחכה לאישורך',
    body: 'שלום {{customer_name}},<br>ההגהה מוכנה. אשרו לייצור או בקשו תיקון כאן: {{tracking_link}}',
    toCustomer: true,
    toStaff: false,
  },
  'production.started': {
    subject: 'החותמת שלך נכנסה לייצור',
    body: 'שלום {{customer_name}},<br>ההזמנה {{order_number}} נכנסה לייצור. נעדכן כשהיא מוכנה.',
    toCustomer: true,
    toStaff: false,
  },
  'order.ready_for_pickup': {
    subject: 'ההזמנה {{order_number}} מוכנה',
    body: 'שלום {{customer_name}},<br>ההזמנה מוכנה {{shipping_text}}.<br>מעקב: {{tracking_link}}',
    toCustomer: true,
    toStaff: false,
  },
  'order.shipped': {
    subject: 'ההזמנה {{order_number}} יצאה אליך',
    body: 'שלום {{customer_name}},<br>ההזמנה נשלחה. מספר מעקב: {{tracking_number}}.<br>{{tracking_link}}',
    toCustomer: true,
    toStaff: false,
  },
  'order.production_error': {
    subject: '⚠ שגיאה ביצירת קובץ ייצור – {{order_number}}',
    body: 'יצירת קובץ הייצור נכשלה להזמנה {{order_number}}. יש לבדוק במערכת הניהול.',
    toCustomer: false,
    toStaff: true,
  },
};

export function trackingLink(o: Pick<Order, 'id' | 'token'>) {
  return `${SITE.url}/order/${o.id}/?t=${o.token}`;
}

function fill(tpl: string, o: Order) {
  const vars: Record<string, string> = {
    customer_name: escapeHtml(o.customer.name),
    order_number: o.id,
    product_name: escapeHtml(o.items.map((i) => i.productName).join(', ')),
    tracking_number: escapeHtml(o.shipping.trackingNumber ?? ''),
    tracking_link: `<a href="${trackingLink(o)}">${trackingLink(o)}</a>`,
    shipping_text: o.shipping.method === 'pickup' ? `לאיסוף ב${SITE.address}` : 'ויוצאת למשלוח',
    status: STATUS_LABEL[o.status],
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

/** Returns the event ids that were actually sent (caller stores them on the order). */
export async function notify(order: Order, event: NotifyEvent, attachments?: { filename: string; content: Buffer; contentType?: string }[]): Promise<string[]> {
  const t = TEMPLATES[event];
  const sent: string[] = [];
  const wrap = (html: string) => `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${html}<p style="color:#888">Stamp2Go · ${SITE.phone}</p></div>`;
  const jobs: Promise<void>[] = [];
  if (t.toCustomer && order.customer.email) {
    const id = `${event}:customer`;
    if (!order.notificationsSent.includes(id)) {
      jobs.push(sendMail({ to: [order.customer.email!], subject: fill(t.subject, order), html: wrap(fill(t.body, order)) }).then(() => void sent.push(id)));
    }
  }
  if (t.toStaff) {
    const id = `${event}:staff`;
    if (!order.notificationsSent.includes(id)) {
      jobs.push(
        sendMail({
          subject: `[${order.id}] ${fill(t.subject, order)} – ${order.customer.name}`,
          html: wrap(`${fill(t.body, order)}<br><br>ניהול: <a href="${SITE.url}/admin/orders/${order.id}/">${SITE.url}/admin/orders/${order.id}/</a>`),
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
