/**
 * Minimal admin authentication: one shared password (ADMIN_PASSWORD) and an
 * HMAC-signed cookie (ADMIN_SECRET). Works in the Edge middleware and in Node.
 */
export const ADMIN_COOKIE = 's2g_admin';
const MAX_AGE = 60 * 60 * 12;

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
  if (!secret) return '';
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
}

export async function createAdminToken(): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyAdminToken(token?: string): Promise<boolean> {
  if (!token || !process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const expected = await hmac(exp);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < password.length; i++) diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export const ADMIN_MAX_AGE = MAX_AGE;
