import { SITE } from './config';
import { escapeHtml } from './mail';

/**
 * Branded e-mail layout: table-based, inline styles and RTL – renders the same
 * in Gmail, Outlook and phone mail apps. The logo is HTML (no image to block).
 */
export interface EmailParts {
  /** Hidden preview line shown in the inbox list. */
  preheader?: string;
  /** Small coloured label above the title, e.g. "ההזמנה התקבלה". */
  badge?: string;
  tone?: 'blue' | 'green' | 'orange' | 'red';
  title: string;
  /** Trusted HTML (callers escape their own values). */
  body: string;
  cta?: { label: string; url: string };
  /** Shown under the button in small print. */
  note?: string;
  /** Staff e-mails get a slimmer footer. */
  staff?: boolean;
}

const TONES = {
  blue: { bg: '#eef3ff', fg: '#2457ff' },
  green: { bg: '#e8f7ee', fg: '#12a150' },
  orange: { bg: '#fff4e0', fg: '#b76e00' },
  red: { bg: '#fdecee', fg: '#d6283b' },
};

const FONT = "Heebo,'Segoe UI',Arial,Helvetica,sans-serif";

export function emailLayout(p: EmailParts): string {
  const tone = TONES[p.tone ?? 'blue'];
  const logo = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td style="font:900 italic 26px/1 ${FONT};color:#0b1426;letter-spacing:-.5px">חותמות</td>
    </tr><tr><td style="padding-top:4px;text-align:center;font:700 13px/1 ${FONT};color:#1c2a44">
      תוך <span style="display:inline-block;background:#2457ff;color:#fff;border-radius:6px;padding:3px 7px;margin:0 2px">2</span> דקות
    </td></tr></table>`;
  const button = p.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0"><tr><td style="border-radius:14px;background:#2457ff;box-shadow:0 10px 24px -10px rgba(36,87,255,.8)">
        <a href="${p.cta.url}" style="display:inline-block;padding:15px 30px;font:700 16px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:14px">${escapeHtml(p.cta.label)} ←</a>
      </td></tr></table>`
    : '';
  const footer = p.staff
    ? `<p style="margin:0;font:12px/1.6 ${FONT};color:#8a94a6">הודעת מערכת · ${escapeHtml(SITE.hebrewName)} · <a href="${SITE.url}/admin/" style="color:#2457ff">ניהול האתר</a></p>`
    : `<p style="margin:0 0 6px;font:700 14px/1.6 ${FONT};color:#1c2a44">${escapeHtml(SITE.hebrewName)}</p>
       <p style="margin:0;font:13px/1.8 ${FONT};color:#5b6678">
         ${escapeHtml(SITE.address)} · ${escapeHtml(SITE.hours)}<br>
         <a href="${SITE.phoneHref}" style="color:#2457ff;text-decoration:none">${escapeHtml(SITE.phone)}</a> ·
         <a href="${SITE.whatsapp}" style="color:#12a150;text-decoration:none">וואטסאפ</a> ·
         <a href="${SITE.url}" style="color:#2457ff;text-decoration:none">stamp2go.co.il</a>
       </p>`;
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(p.title)}</title></head>
<body style="margin:0;padding:0;background:#f2f5fa">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(p.preheader ?? p.title)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5fa"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px" dir="rtl">
    <tr><td style="height:6px;border-radius:20px 20px 0 0;background:linear-gradient(90deg,#2457ff,#7b4dff);background-color:#2457ff"></td></tr>
    <tr><td style="background:#ffffff;padding:30px 28px 8px;text-align:center">${logo}</td></tr>
    <tr><td style="background:#ffffff;padding:18px 28px 34px;text-align:right" dir="rtl">
      ${p.badge ? `<p style="margin:0 0 12px;text-align:center"><span style="display:inline-block;background:${tone.bg};color:${tone.fg};font:700 13px/1 ${FONT};padding:8px 14px;border-radius:999px">${escapeHtml(p.badge)}</span></p>` : ''}
      <h1 style="margin:0 0 16px;text-align:center;font:800 26px/1.3 ${FONT};color:#0b1426">${escapeHtml(p.title)}</h1>
      <div style="font:16px/1.75 ${FONT};color:#1c2a44">${p.body}</div>
      ${button}
      ${p.note ? `<p style="margin:14px 0 0;text-align:center;font:12.5px/1.6 ${FONT};color:#8a94a6">${p.note}</p>` : ''}
    </td></tr>
    <tr><td style="background:#f8fafd;border-top:1px solid #e3e8ef;border-radius:0 0 20px 20px;padding:22px 28px;text-align:center">${footer}</td></tr>
  </table>
  <p style="margin:16px 0 0;font:11px/1.6 ${FONT};color:#a0a9b8">© ${new Date().getFullYear()} Stamp2Go</p>
</td></tr></table>
</body></html>`;
}

/** Highlighted box (code, order number, reward…). */
export function emailHighlight(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td style="background:#f5f8ff;border:1px dashed #b9c8ff;border-radius:14px;padding:16px;text-align:center">
    <div style="font:13px/1.4 ${FONT};color:#5b6678">${escapeHtml(label)}</div>
    <div style="margin-top:6px;font:800 30px/1.2 ${FONT};color:#0b1426;letter-spacing:4px" dir="ltr">${escapeHtml(value)}</div>
  </td></tr></table>`;
}

/** Two-column details table (label → value). Values are escaped. */
export function emailDetails(rows: [string, string | number | undefined | null][]): string {
  const tr = rows
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 14px;border-bottom:1px solid #eef1f6;font:14px/1.5 ${FONT};color:#5b6678;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:10px 14px;border-bottom:1px solid #eef1f6;font:600 14px/1.5 ${FONT};color:#0b1426;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #e3e8ef;border-radius:14px;border-collapse:separate;overflow:hidden" dir="rtl">${tr}</table>`;
}

/** Steps strip: what happens next. */
export function emailSteps(steps: { title: string; text: string; done?: boolean }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 4px">${steps
    .map(
      (s, i) => `<tr><td width="38" style="vertical-align:top;padding:6px 0">
        <div style="width:28px;height:28px;border-radius:50%;background:${s.done ? '#12a150' : '#eef3ff'};color:${s.done ? '#fff' : '#2457ff'};font:700 14px/28px ${FONT};text-align:center">${s.done ? '✓' : i + 1}</div>
      </td><td style="padding:6px 0 10px;vertical-align:top">
        <div style="font:700 15px/1.4 ${FONT};color:#0b1426">${escapeHtml(s.title)}</div>
        <div style="font:14px/1.6 ${FONT};color:#5b6678">${escapeHtml(s.text)}</div>
      </td></tr>`,
    )
    .join('')}</table>`;
}

export const emailP = (html: string) => `<p style="margin:0 0 12px">${html}</p>`;
