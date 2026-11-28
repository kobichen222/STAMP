import 'server-only';
import { SITE } from '@/lib/config';
import { escapeHtml, MailNotConfiguredError, sendMail } from '@/lib/mail';
import { emailDetails, emailHighlight, emailLayout, emailP, emailSteps, type EmailParts } from '@/lib/email-template';
import type { Order } from './orders/types';
import { whatsappCustomer, whatsappStaff } from './whatsapp';

/**
 * Notifications engine (spec §177–179): every event is sent at most once per
 * order+recipient+template, tracked in order.notificationsSent.
 */
export type NotifyEvent = 'order.created' | 'order.awaiting_approval' | 'production.started' | 'order.ready_for_pickup' | 'order.shipped' | 'order.production_error' | 'order.reward';

interface Built {
  subject: string;
  customer?: EmailParts;
  /** Plain-text part of the customer's e-mail (sent with the HTML). */
  customerText?: string;
  customerReplyTo?: string;
  staff?: EmailParts;
}

const money = (n: number) => `₪${(Math.round(n * 100) / 100).toLocaleString('he-IL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const first = (name: string) => escapeHtml(name.trim().split(/\s+/)[0] || name);

function shippingText(o: Order) {
  if (o.shipping.method === 'pickup') return `איסוף עצמי – ${SITE.address}`;
  const a = o.shipping.address;
  return [o.shipping.label, a ? [a.street, a.city].filter(Boolean).join(', ') : ''].filter(Boolean).join(' · ');
}

/**
 * The payment sentence of the customer's "order received" texts, from the order's real payment state:
 * a manual-payment order is received (and may go to production) before anything is paid.
 */
export function orderPaymentText(o: Pick<Order, 'paymentStatus'>): string {
  return o.paymentStatus === 'paid' ? 'התשלום אושר והעיצוב נשמר' : 'ההזמנה התקבלה והעיצוב נשמר. התשלום עוד לא בוצע: נציג יחזור אליכם לתשלום בטלפון, או שתשלמו באיסוף.';
}

/**
 * What the customer really got for "order received" (the ids notify() stores): the e-mail,
 * else the WhatsApp message, else nothing.
 */
export function orderConfirmationSent(o: Pick<Order, 'notificationsSent' | 'customer'>): 'email' | 'whatsapp' | null {
  if (o.customer.email && o.notificationsSent.includes('order.created:customer')) return 'email';
  if (o.notificationsSent.includes('order.created:customer:wa')) return 'whatsapp';
  return null;
}

/**
 * First line of the studio's "new order" e-mail: how and when the customer gets the order (the time text
 * stored on the order when it was placed), and the address on the next line for methods that have one.
 */
export function staffShippingHead(o: Pick<Order, 'shipping'>): string {
  const a = o.shipping.address;
  const address = a ? [a.street, a.city].filter(Boolean).join(', ') : '';
  const how = [o.shipping.label, o.shipping.eta].filter(Boolean).join(' · ');
  return `<p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0b1426">${escapeHtml(how)}</p>${address ? `<p style="margin:0 0 12px;font-size:15px;color:#1c2a44">${escapeHtml(address)}</p>` : ''}`;
}

/**
 * A picture of each stamp for the studio (PNG from the order preview route – e-mail clients do not show SVG).
 * Only items that already have their production files, and only with an absolute site address.
 */
function stampPictures(o: Order): string {
  return o.items.map((_, i) => stampPicture(o, i)).join('');
}

/** The picture of item `i` (see stampPictures), or '' when it has no production files yet or the site address is not absolute. */
function stampPicture(o: Order, i: number): string {
  const it = o.items[i];
  if (!/^https?:\/\//.test(SITE.url) || !it.files.some((f) => f.kind === 'master-svg')) return '';
  return `<p style="margin:12px 0;text-align:center"><img src="${SITE.url}/api/orders/${o.id}/preview/?t=${o.token}&amp;i=${i + 1}&amp;format=png" width="320" alt="${escapeHtml(`${it.productName} · ${it.size}`)}" style="max-width:100%;height:auto;border:1px solid #e3e8ef;border-radius:10px;background:#ffffff"></p>`;
}

const FONT = "Heebo,'Segoe UI',Arial,Helvetica,sans-serif"; // the layout's font stack

/** The layout's call-to-action button, placed inside the body (the layout itself puts its button after the body). */
const emailButton = (label: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto 8px"><tr><td style="border-radius:14px;background:#2457ff;box-shadow:0 10px 24px -10px rgba(36,87,255,.8)">
        <a href="${url}" style="display:inline-block;padding:15px 30px;font:700 16px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:14px">${escapeHtml(label)} ←</a>
      </td></tr></table>`;

const emailHeading = (text: string) => `<p style="margin:24px 0 0;font:700 16px/1.4 ${FONT};color:#0b1426">${escapeHtml(text)}</p>`;

/** "חותמת אחת" / "3 חותמות", by the number of stamps (quantities summed). */
const stampsCount = (o: Pick<Order, 'items'>) => {
  const n = o.items.reduce((s, i) => s + i.quantity, 0);
  return n === 1 ? 'חותמת אחת' : `${n} חותמות`;
};

/**
 * The customer's "order received" e-mail. The body runs: opening and payment sentence, the tracking button, how the
 * order is received, the stamps (with a PNG of each when the studio e-mail would have one), the totals, and a contact
 * line. Each section starts with an HTML comment marker (`<!--section:id-->`). `text` is the plain-text part with the
 * same sections in the same order.
 */
export function orderCreatedCustomer(o: Order): { parts: EmailParts; text: string } {
  const link = trackingLink(o);
  const rawName = o.customer.name.trim().split(/\s+/)[0] || o.customer.name;
  const title = `תודה ${rawName}, ההזמנה התקבלה!`;
  const opening = 'איזה כיף שבחרת בנו. הקובץ שלך עבר בדיקה אוטומטית ונכנס לתור הייצור – נעדכן אותך בכל שלב.';
  const steps = [
    { title: 'ההזמנה התקבלה', text: orderPaymentText(o), done: true },
    { title: 'ייצור', text: 'החותמת מיוצרת תוך דקות מרגע האישור' },
    { title: o.shipping.method === 'pickup' ? 'מוכן לאיסוף' : 'משלוח', text: shippingText(o) },
  ];

  const a = o.shipping.address;
  const how: [string, string][] =
    o.shipping.method === 'pickup'
      ? [
          ['איסוף עצמי', SITE.address],
          ['שעות פתיחה', SITE.hours],
        ]
      : ([
          ['אופן המשלוח', o.shipping.label],
          ['כתובת', a ? [a.street, a.city, a.zip].filter(Boolean).join(', ') : ''],
        ].filter(([, v]) => v) as [string, string][]);

  const itemLine = (it: Order['items'][number]) => `${it.productName} · ${it.size} · כמות ${it.quantity} · ${money(it.total)}`;
  const pictures = o.items.map((_, i) => stampPicture(o, i));
  const stampsHtml = pictures.some(Boolean)
    ? o.items
        .map(
          (it, i) =>
            pictures[i] +
            `<p style="margin:0 0 16px;text-align:center;font:14px/1.6 ${FONT};color:#1c2a44"><strong style="color:#0b1426">${escapeHtml(it.productName)}</strong><br>${escapeHtml(`${it.size} · כמות ${it.quantity} · ${money(it.total)}`)}</p>`,
        )
        .join('')
    : emailDetails(o.items.map((it) => [`${it.productName} · ${it.size}`, `כמות ${it.quantity} · ${money(it.total)}`]));

  const totals: [string, string | null][] = [
    ['סכום ביניים', money(o.subtotal)],
    ['הנחה', o.discount ? `−${money(o.discount)}${o.couponCode ? ` (${o.couponCode})` : ''}` : null],
    ['משלוח', o.shippingPrice ? money(o.shippingPrice) : 'חינם'],
    ['סה״כ לתשלום', money(o.total)],
    ['מספר הזמנה', o.id],
  ];
  const contactText = `שאלה? אפשר להשיב למייל הזה, להתקשר ל-${SITE.phone} או לכתוב ל-${SITE.email}.`;
  const contactHtml = `שאלה? אפשר להשיב למייל הזה, להתקשר ל-<a href="${SITE.phoneHref}" style="color:#2457ff;text-decoration:none">${escapeHtml(SITE.phone)}</a> או לכתוב ל-<a href="mailto:${escapeHtml(SITE.email)}" style="color:#2457ff;text-decoration:none">${escapeHtml(SITE.email)}</a>.`;
  const rows = (r: [string, string | null][]) => r.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');

  const sections: { id: string; html: string; text: string }[] = [
    {
      id: 'opening',
      html: emailP(escapeHtml(opening)) + emailSteps(steps),
      text: [opening, ...steps.map((s, i) => `${s.done ? '✓' : `${i + 1}.`} ${s.title}: ${s.text}`)].join('\n'),
    },
    { id: 'button', html: emailButton('מעקב אחר ההזמנה', link), text: `מעקב אחר ההזמנה:\n${link}` },
    { id: 'how', html: emailHeading('קבלת ההזמנה') + emailDetails(how), text: `קבלת ההזמנה\n${rows(how)}` },
    { id: 'stamps', html: emailHeading('החותמות בהזמנה') + stampsHtml, text: `החותמות בהזמנה\n${o.items.map((it) => `• ${itemLine(it)}`).join('\n')}` },
    { id: 'totals', html: emailDetails(totals), text: rows(totals) },
    { id: 'contact', html: emailP(contactHtml), text: contactText },
  ];

  return {
    parts: {
      preheader: `מספר הזמנה ${o.id} · ${stampsCount(o)} · ${money(o.total)}`,
      badge: '✓ ההזמנה התקבלה',
      tone: 'green',
      title,
      body: sections.map((s) => `<!--section:${s.id}-->${s.html}`).join(''),
    },
    text: [title, ...sections.map((s) => s.text), `${SITE.hebrewName}\n${SITE.url}`].join('\n\n'),
  };
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
  const staffSummary = (title: string, badge: string, tone: EmailParts['tone'] = 'blue', lead = '', pictures = ''): EmailParts => ({
    staff: true,
    badge,
    tone,
    title,
    body:
      lead +
      emailDetails([
        ['לקוח', o.customer.name],
        ['טלפון', o.customer.phone],
        ['מייל', o.customer.email],
        ['חברה', o.customer.company],
      ]) +
      pictures +
      orderSummary(o),
    cta: { label: 'פתיחת ההזמנה בניהול', url: admin },
  });
  switch (event) {
    case 'order.created': {
      const mail = orderCreatedCustomer(o);
      return {
        subject: `תודה! ההזמנה ${o.id} התקבלה`,
        customer: mail.parts,
        customerText: mail.text,
        // a reply reaches the studio's monitored mailbox
        customerReplyTo: SITE.email,
        staff: staffSummary(`הזמנה חדשה – ${o.customer.name}`, `🛒 הזמנה חדשה · ${money(o.total)}`, 'green', staffShippingHead(o), stampPictures(o)),
      };
    }
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

/**
 * The same events as short WhatsApp texts (plain text, *bold* is WhatsApp's own). Only the events
 * worth a message on the phone: the customer's order steps, and what the studio must see right away.
 */
export function whatsappText(event: NotifyEvent, o: Order): { customer?: string; staff?: string } {
  const name = o.customer.name.trim().split(/\s+/)[0] || o.customer.name;
  const link = trackingLink(o);
  const items = o.items.map((i) => `• ${i.productName} ${i.size}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`).join('\n');
  const sign = `\n\n${SITE.name}`;
  switch (event) {
    case 'order.created':
      return {
        customer: `שלום ${name}, תודה! ההזמנה *${o.id}* התקבלה ✅\n${items}\nסה״כ: ${money(o.total)}\n${shippingText(o)}\n\nמעקב אחר ההזמנה:\n${link}${sign}`,
        staff: `🛒 *הזמנה חדשה* ${o.id} · ${money(o.total)}\n${o.customer.name} · ${o.customer.phone}\n${items}\n${shippingText(o)}\n${SITE.url}/admin/orders/${o.id}/`,
      };
    case 'order.awaiting_approval':
      return { customer: `שלום ${name}, ההגהה להזמנה *${o.id}* מוכנה ומחכה לאישור שלך:\n${link}${sign}` };
    case 'order.ready_for_pickup':
      return {
        customer:
          o.shipping.method === 'pickup'
            ? `שלום ${name}, ההזמנה *${o.id}* מוכנה לאיסוף ✅\n${SITE.address}, ${SITE.hours}\nניווט: ${SITE.waze}${sign}`
            : `שלום ${name}, ההזמנה *${o.id}* מוכנה ונמסרת לשליח. נעדכן כשהיא יוצאת.${sign}`,
      };
    case 'order.shipped':
      return {
        customer: `שלום ${name}, ההזמנה *${o.id}* בדרך אליך 🚚${o.shipping.trackingNumber ? `\nמספר מעקב: ${o.shipping.trackingNumber}` : ''}\n${o.shipping.trackingUrl || link}${sign}`,
      };
    case 'order.production_error':
      return { staff: `⚠ *שגיאה בקובץ ייצור* – ${o.id} (${o.customer.name})\nפתחו את ההזמנה ולחצו "ייצור מחדש":\n${SITE.url}/admin/orders/${o.id}/` };
    default:
      return {};
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
      jobs.push(
        sendMail({
          to: [order.customer.email!],
          subject: b.subject,
          html: emailLayout(b.customer),
          ...(b.customerText ? { text: b.customerText } : {}),
          ...(b.customerReplyTo ? { replyTo: b.customerReplyTo } : {}),
        }).then(() => void sent.push(id)),
      );
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
  // WhatsApp (Green API): the same once-only rule, with its own ids. Does nothing until an instance is configured.
  const wa = whatsappText(event, order);
  if (wa.customer && opts.customer !== false) {
    const id = `${event}:customer:wa`;
    if (!order.notificationsSent.includes(id)) jobs.push(whatsappCustomer(order.customer.phone, wa.customer).then((ok) => void (ok && sent.push(id))));
  }
  if (wa.staff && opts.staff !== false) {
    const id = `${event}:staff:wa`;
    if (!order.notificationsSent.includes(id)) jobs.push(whatsappStaff(wa.staff).then((n) => void (n && sent.push(id))));
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status !== 'rejected') continue;
    if (r.reason instanceof MailNotConfiguredError) console.warn(`[notify] ${event}: e-mail not configured (RESEND_API_KEY)`);
    else console.error('[notify]', event, r.reason);
  }
  return sent;
}
