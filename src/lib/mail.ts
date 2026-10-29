import { SITE } from './config';
/**
 * E-mail sender (server only). Two ways, the first one configured wins:
 *
 *   SMTP – the studio's own mailbox (e.g. hosted at JoinWeb):
 *     SMTP_HOST   e.g. mail.stamp2go.co.il
 *     SMTP_PORT   465 (SSL, default) or 587 (STARTTLS)
 *     SMTP_USER   the full mailbox address, e.g. orders@stamp2go.co.il
 *     SMTP_PASS   the mailbox password
 *   Resend HTTP API (https://resend.com):
 *     RESEND_API_KEY
 *
 *   ORDERS_EMAIL_TO  – comma separated recipients (default mira@stamp2go.co.il)
 *   MAIL_FROM        – sender, e.g. "Stamp2Go <orders@stamp2go.co.il>" (default: SMTP_USER)
 */
export interface Attachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface Mail {
  /** Defaults to the studio inbox (ORDERS_EMAIL_TO). */
  to?: string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
}

export class MailNotConfiguredError extends Error {}

const env = (k: string) => process.env[k]?.trim() || undefined;

export const smtpConfigured = () => !!(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'));

async function sendSmtp(mail: Mail, to: string[]): Promise<void> {
  const nodemailer = await import('nodemailer');
  const port = Number(env('SMTP_PORT') ?? 465);
  const user = env('SMTP_USER')!;
  const transport = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: { user, pass: env('SMTP_PASS') },
    connectionTimeout: 15_000,
  });
  await transport.sendMail({
    from: env('MAIL_FROM') ?? `Stamp2Go <${user}>`,
    to,
    subject: mail.subject,
    html: mail.html,
    replyTo: mail.replyTo,
    attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
}

export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  // Studio inbox: admin settings → ORDERS_EMAIL_TO → default.
  const studio = SITE.ordersEmail || process.env.ORDERS_EMAIL_TO || 'mira@stamp2go.co.il';
  const to = mail.to ?? studio.split(',').map((s) => s.trim()).filter(Boolean);
  const from = process.env.MAIL_FROM || 'Stamp2Go <onboarding@resend.dev>';

  if (smtpConfigured()) return sendSmtp(mail, to);

  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new MailNotConfiguredError('E-mail is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY)');
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
