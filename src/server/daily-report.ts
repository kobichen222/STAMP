import 'server-only';
import { SITE } from '@/lib/config';
import { ageText, ageTone, orderTime } from '@/lib/age';
import { emailLayout } from '@/lib/email-template';
import { escapeHtml, sendMail } from '@/lib/mail';
import { statusLabel, type Order, type OrderStatus } from './orders/types';
import { getStore } from './store';
import { databaseUrl, db } from './store/neon';

/**
 * The morning production-queue report (08:00 Israel time): every open order grouped by what has to
 * happen with it today, the new ones on top – so the studio knows its day at a glance.
 */

const FONT = "Heebo,'Segoe UI',Arial,Helvetica,sans-serif";
const CLOSED: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

type Group = { key: string; title: string; hint: string; color: string; match: (o: Order) => boolean };

/** In the order the day goes: problems first, then production, then what leaves the studio. */
const GROUPS: Group[] = [
  { key: 'error', title: 'שגיאות לטיפול', hint: 'קובץ ייצור שלא נוצר – לבדוק ולתקן', color: '#d6283b', match: (o) => o.status === 'PRODUCTION_FILE_ERROR' },
  { key: 'change', title: 'התבקש שינוי', hint: 'הלקוח ביקש תיקון בעיצוב', color: '#d6283b', match: (o) => o.status === 'CHANGE_REQUESTED' },
  { key: 'approval', title: 'ממתין לאישור סקיצה', hint: 'מחכה לאישור הלקוח', color: '#b76e00', match: (o) => o.status === 'AWAITING_APPROVAL' },
  { key: 'check', title: 'שולם – לבדיקת קובץ', hint: 'נכנסו ועוד לא עברו בדיקה', color: '#b76e00', match: (o) => o.status === 'PAID' || o.status === 'PREFLIGHT' },
  { key: 'ready', title: 'מחכה לייצור', hint: 'מוכן להדפסה – להכניס לייצור', color: '#2457ff', match: (o) => o.status === 'READY_FOR_PRODUCTION' },
  { key: 'production', title: 'בייצור', hint: 'בעבודה עכשיו', color: '#2457ff', match: (o) => o.status === 'IN_PRODUCTION' || o.status === 'QUALITY_CHECK' },
  { key: 'pickup', title: 'מוכן לאיסוף', hint: 'הלקוח אוסף מהסטודיו', color: '#12a150', match: (o) => o.status === 'READY_FOR_SHIPPING' && o.shipping.method === 'pickup' },
  { key: 'ship', title: 'מוכן למשלוח', hint: 'לשדר לזיג זג ולמסור לשליח (איסוף 13:00–17:00)', color: '#12a150', match: (o) => o.status === 'READY_FOR_SHIPPING' && o.shipping.method !== 'pickup' },
  { key: 'shipped', title: 'נשלח – בדרך ללקוח', hint: 'לעקוב עד המסירה', color: '#5b6678', match: (o) => o.status === 'SHIPPED' },
  { key: 'unpaid', title: 'ממתין לתשלום', hint: 'הזמנות מהשבוע האחרון שלא שולמו', color: '#8a94a6', match: (o) => (o.status === 'PAYMENT_PENDING' || o.status === 'PAYMENT_FAILED') && Date.now() - Date.parse(o.createdAt) < 7 * 86_400_000 },
];

const ilDate = (d: Date) => d.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
const ilTime = orderTime;
/** Older orders stand out: grey under a day, orange from a day, red from 3 days. */
const ageColor = (iso: string) => ({ fresh: '#5b6678', day: '#b76e00', old: '#d6283b' })[ageTone(iso)];

function row(o: Order, showStatus = false): string {
  const items = o.items.map((i) => `${i.productName} ${i.size} ×${i.quantity}`).join(', ');
  const urgent = o.urgent ? `<span style="background:#d6283b;color:#fff;border-radius:6px;padding:1px 6px;font-size:11px;font-weight:700;margin-inline-start:6px">דחוף</span>` : '';
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #eef1f6;vertical-align:top;font:14px/1.5 ${FONT};color:#0b1426">
      <a href="${SITE.url}/admin/orders/${o.id}/" style="font-weight:700;color:#2457ff;text-decoration:none" dir="ltr">${escapeHtml(o.id)}</a>${urgent}<br>
      <span style="font-weight:600">${escapeHtml(o.customer.company || o.customer.name)}</span> · <a href="tel:${escapeHtml(o.customer.phone)}" style="color:#1c2a44;text-decoration:none" dir="ltr">${escapeHtml(o.customer.phone)}</a><br>
      <span style="color:#5b6678;font-size:13px">${escapeHtml(items)}</span><br>
      <span style="color:#5b6678;font-size:12.5px">${showStatus ? `<b style="color:#2457ff">${escapeHtml(statusLabel(o.status, o.shipping.method))}</b> · ` : ''}${escapeHtml(o.shipping.label)} · ${o.paymentStatus === 'paid' ? 'שולם' : 'לא שולם'}</span><br>
      <span style="color:#1c2a44;font-size:12.5px">🕒 נקלטה ${escapeHtml(ilTime(o.createdAt))} · <b style="color:${ageColor(o.createdAt)}">${escapeHtml(ageText(o.createdAt))}</b></span>
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #eef1f6;vertical-align:top;text-align:left;white-space:nowrap;font:700 14px/1.5 ${FONT};color:#0b1426">₪${o.total}</td>
  </tr>`;
}

function section(title: string, hint: string, color: string, orders: Order[]): string {
  if (!orders.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border:1px solid #e3e8ef;border-radius:14px;border-collapse:separate;overflow:hidden" dir="rtl">
    <tr><td colspan="2" style="background:#f8fafd;border-bottom:2px solid ${color};padding:10px 12px;font:800 16px/1.4 ${FONT};color:${color}">
      ${escapeHtml(title)} <span style="display:inline-block;background:${color};color:#fff;border-radius:999px;padding:1px 9px;font-size:13px;margin-inline-start:4px">${orders.length}</span>
      <div style="font:400 12.5px/1.4 ${FONT};color:#5b6678;margin-top:2px">${escapeHtml(hint)}</div>
    </td></tr>
    ${orders.map((o) => row(o)).join('')}
  </table>`;
}

const byUrgencyThenAge = (a: Order, b: Order) => Number(!!b.urgent) - Number(!!a.urgent) || a.createdAt.localeCompare(b.createdAt);

export async function buildDailyReport(now = new Date()) {
  const all = await getStore().listOrders({ limit: 500 });
  const open = all.filter((o) => !CLOSED.includes(o.status));
  const fresh = all
    .filter((o) => now.getTime() - Date.parse(o.createdAt) < 24 * 3_600_000 && !(o.status === 'PAYMENT_PENDING' && o.paymentMethod !== 'manual'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const groups = GROUPS.map((g) => ({ ...g, orders: open.filter(g.match).sort(byUrgencyThenAge) }));
  const work = groups.filter((g) => !['shipped', 'unpaid'].includes(g.key)).reduce((n, g) => n + g.orders.length, 0);
  const urgent = open.filter((o) => o.urgent).length;

  const tile = (label: string, value: number, color: string) =>
    `<td width="33%" style="padding:4px"><div style="background:#f5f8ff;border-radius:12px;padding:12px 6px;text-align:center">
      <div style="font:800 26px/1 ${FONT};color:${color}">${value}</div><div style="margin-top:4px;font:12.5px/1.3 ${FONT};color:#5b6678">${escapeHtml(label)}</div></div></td>`;
  const summary = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr>
    ${tile('חדשות ב-24 שעות', fresh.length, '#2457ff')}${tile('פתוחות לטיפול היום', work, '#0b1426')}${tile('דחופות', urgent, urgent ? '#d6283b' : '#8a94a6')}
  </tr></table>`;

  const freshList = fresh.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border:1px solid #c9d6ff;border-radius:14px;border-collapse:separate;overflow:hidden;background:#fbfcff" dir="rtl">
        <tr><td colspan="2" style="background:#eef3ff;border-bottom:2px solid #2457ff;padding:10px 12px;font:800 16px/1.4 ${FONT};color:#2457ff">
          חדשות מאתמול <span style="display:inline-block;background:#2457ff;color:#fff;border-radius:999px;padding:1px 9px;font-size:13px;margin-inline-start:4px">${fresh.length}</span>
          <div style="font:400 12.5px/1.4 ${FONT};color:#5b6678;margin-top:2px">הזמנות שנכנסו ב-24 השעות האחרונות</div>
        </td></tr>
        ${fresh.map((o) => row(o, true)).join('')}
      </table>`
    : `<p style="margin:18px 0 0;text-align:center;font:14px/1.6 ${FONT};color:#5b6678">לא נכנסו הזמנות חדשות ב-24 השעות האחרונות.</p>`;

  const body = summary + freshList + groups.map((g) => section(g.title, g.hint, g.color, g.orders)).join('') + (open.length ? '' : `<p style="text-align:center">אין הזמנות פתוחות 🎉</p>`);
  const title = `סדר היום – ${ilDate(now)}`;
  return {
    subject: `☀️ סדר יום ייצור · ${work} לטיפול · ${fresh.length} חדשות`,
    html: emailLayout({
      staff: true,
      badge: 'דוח בוקר · תור ייצור',
      title,
      preheader: `${work} הזמנות לטיפול היום, ${fresh.length} חדשות${urgent ? `, ${urgent} דחופות` : ''}`,
      body,
      cta: { label: 'לתור הייצור', url: `${SITE.url}/admin/production/` },
    }),
    counts: { fresh: fresh.length, work, urgent, open: open.length },
  };
}

/** Who gets it: DAILY_REPORT_TO, else the admin mailboxes. */
export function reportRecipients(): string[] {
  const raw = process.env.DAILY_REPORT_TO || process.env.ADMIN_EMAILS || 'yosi@stamp2go.co.il,mira@stamp2go.co.il';
  return [...new Set(raw.split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.includes('@')))];
}

/** Marks a job key as done; false when it already ran (one morning report per day, whatever calls the endpoint). */
export async function claimOnce(key: string): Promise<boolean> {
  if (!databaseUrl()) return true;
  const sql = await db();
  const rows = await sql`insert into s2g_jobs (key) values (${key}) on conflict (key) do nothing returning key`;
  return rows.length > 0;
}

export async function sendDailyReport(opts: { to?: string[]; force?: boolean; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const day = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  if (!opts.force && !(await claimOnce(`daily-report:${day}`))) return { sent: false, reason: 'already sent today' };
  const r = await buildDailyReport(now);
  const to = opts.to?.length ? opts.to : reportRecipients();
  await sendMail({ to, subject: opts.force ? `[בדיקה] ${r.subject}` : r.subject, html: r.html });
  return { sent: true, to, ...r.counts };
}
