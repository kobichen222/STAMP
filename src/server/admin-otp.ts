import 'server-only';
import crypto from 'node:crypto';
import { escapeHtml, sendMail } from '@/lib/mail';
import type { StaffRole } from './admin-auth';

/**
 * Staff login with a one-time code sent by email.
 *   ADMIN_EMAILS       comma-separated, role admin (default: the studio mailboxes)
 *   PRODUCTION_EMAILS  comma-separated, role production (optional)
 * Codes are 6 digits, valid 10 minutes, 5 attempts, stored only as a hash
 * in s2g_settings ("otp:<email>") and deleted once used.
 */
const DEFAULT_ADMINS = ['yosi@stamp2go.co.il', 'mira@stamp2go.co.il'];
const TTL_MS = 10 * 60_000;
const RESEND_MS = 45_000;
const MAX_TRIES = 5;

const list = (v: string | undefined) =>
  (v ?? '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export function roleForEmail(email: string): StaffRole | null {
  const e = normalizeEmail(email);
  const admins = list(process.env.ADMIN_EMAILS);
  if ((admins.length ? admins : DEFAULT_ADMINS).includes(e)) return 'admin';
  if (list(process.env.PRODUCTION_EMAILS).includes(e)) return 'production';
  return null;
}

interface OtpRow {
  hash: string;
  exp: number;
  sentAt: number;
  tries: number;
}

const hashCode = (email: string, code: string) => crypto.createHash('sha256').update(`s2g-otp:${email}:${code}`).digest('hex');

async function sql() {
  const { db } = await import('./store/neon');
  return db();
}

async function load(email: string): Promise<OtpRow | null> {
  const q = await sql();
  const rows = await q`select value from s2g_settings where key = ${'otp:' + email} limit 1`;
  return (rows[0]?.value as OtpRow) ?? null;
}

async function save(email: string, row: OtpRow) {
  const q = await sql();
  await q`insert into s2g_settings (key, value, updated_at) values (${'otp:' + email}, ${JSON.stringify(row)}::jsonb, now())
          on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

async function remove(email: string) {
  const q = await sql();
  await q`delete from s2g_settings where key = ${'otp:' + email}`;
}

/** Sends a code when the address is a staff address. Never reveals whether it is. */
export async function requestLoginCode(rawEmail: string): Promise<'sent' | 'ignored' | 'wait'> {
  const email = normalizeEmail(rawEmail);
  if (!roleForEmail(email)) return 'ignored';
  const prev = await load(email);
  if (prev && Date.now() - prev.sentAt < RESEND_MS) return 'wait';
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await save(email, { hash: hashCode(email, code), exp: Date.now() + TTL_MS, sentAt: Date.now(), tries: 0 });
  await sendMail({
    to: [email],
    subject: `קוד כניסה לניהול: ${code}`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;color:#0b1426">
      <p>קוד הכניסה שלך לניהול האתר:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${escapeHtml(code)}</p>
      <p>הקוד תקף ל-10 דקות. אם לא ביקשת להיכנס – אפשר להתעלם מהמייל.</p>
    </div>`,
  });
  return 'sent';
}

/** Checks a code; returns the staff role on success (the code is then used up). */
export async function verifyLoginCode(rawEmail: string, rawCode: string): Promise<StaffRole | null> {
  const email = normalizeEmail(rawEmail);
  const role = roleForEmail(email);
  const code = rawCode.replace(/\D/g, '');
  if (!role || code.length !== 6) return null;
  const row = await load(email);
  if (!row || row.exp < Date.now() || row.tries >= MAX_TRIES) return null;
  const a = Buffer.from(row.hash);
  const b = Buffer.from(hashCode(email, code));
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
    await remove(email);
    return role;
  }
  await save(email, { ...row, tries: row.tries + 1 });
  return null;
}
