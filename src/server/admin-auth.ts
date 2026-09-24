/**
 * Staff authentication. Two roles for the MVP:
 *   admin      – ADMIN_PASSWORD       – everything
 *   production – PRODUCTION_PASSWORD  – production queue + file downloads only
 * The role is signed into an HMAC cookie (ADMIN_SECRET). Works in Edge and Node.
 * Per-user accounts and the full permission matrix (spec §170–171) come with
 * the Supabase Auth integration.
 */
export const ADMIN_COOKIE = 's2g_admin';
export const ADMIN_MAX_AGE = 60 * 60 * 12;
export type StaffRole = 'admin' | 'production';

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
  if (!secret) return '';
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
}

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function createAdminToken(role: StaffRole): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE;
  return `${exp}.${role}.${await hmac(`${exp}.${role}`)}`;
}

export async function verifyAdminToken(token?: string): Promise<StaffRole | null> {
  if (!token || !process.env.ADMIN_PASSWORD) return null;
  const [exp, role, sig] = token.split('.');
  if (!exp || !sig || (role !== 'admin' && role !== 'production') || Number(exp) < Date.now() / 1000) return null;
  return safeEqual(sig, await hmac(`${exp}.${role}`)) ? role : null;
}

export function roleForPassword(password: string): StaffRole | null {
  if (process.env.ADMIN_PASSWORD && safeEqual(password, process.env.ADMIN_PASSWORD)) return 'admin';
  if (process.env.PRODUCTION_PASSWORD && safeEqual(password, process.env.PRODUCTION_PASSWORD)) return 'production';
  return null;
}

/** Paths the production role may access. */
export const productionAllowed = (path: string) => /^\/admin\/(production|login|logout)(\/|$)|^\/api\/admin\/files(\/|$)/.test(path);
