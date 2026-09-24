/**
 * Minimal e-mail sender for form submissions, using the Resend HTTP API
 * (https://resend.com) so no SMTP server or extra dependency is needed.
 *
 * Environment:
 *   RESEND_API_KEY   – required in production
 *   ORDERS_EMAIL_TO  – comma separated recipients (default mira@stamp2go.co.il)
 *   MAIL_FROM        – verified sender, e.g. "Stamp2Go <orders@stamp2go.co.il>"
 */
export interface Attachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface Mail {
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
}

export class MailNotConfiguredError extends Error {}

export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = (process.env.ORDERS_EMAIL_TO || 'mira@stamp2go.co.il').split(',').map((s) => s.trim());
  const from = process.env.MAIL_FROM || 'Stamp2Go <onboarding@resend.dev>';

  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new MailNotConfiguredError('RESEND_API_KEY is not set');
    console.warn('[mail] RESEND_API_KEY missing – printing message instead of sending\n', mail.subject, '\n', mail.html);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      subject: mail.subject,
      html: mail.html,
      reply_to: mail.replyTo,
      attachments: mail.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString('base64'),
        content_type: a.contentType,
      })),
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

export const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function fieldsTable(fields: Record<string, unknown>): string {
  const rows = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:right;padding:4px 8px;background:#f5f5f5">${escapeHtml(k)}</th><td style="padding:4px 8px;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  return `<table dir="rtl" style="border-collapse:collapse;font-family:Arial,sans-serif">${rows}</table>`;
}
