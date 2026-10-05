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

/**
 * Fallback when the passwords are not in the environment: a temporary admin
 * password stored as a SHA-256 hash (never in plain text, never in the code)
 * with an expiry date, plus a random cookie-signing secret – both in the
 * database row s2g_settings.auth. Cached briefly.
 */
interface DbAuth {
  secret: string;
  tempHash?: string;
  tempExpires?: string;
}
let dbAuthCache: { at: number; value: DbAuth | null } | null = null;

async function dbAuth(): Promise<DbAuth | null> {
  if (dbAuthCache && Date.now() - dbAuthCache.at < 60_000) return dbAuthCache.value;
  let value: DbAuth | null = null;
  try {
    const { databaseUrl, db } = await import('./store/neon');
    if (databaseUrl()) {
      const sql = await db();
      const rows = await sql`select value from s2g_settings where key = 'auth' limit 1`;
      value = (rows[0]?.value as DbAuth) ?? null;
    }
  } catch (e) {
    console.error('[admin-auth]', e);
  }
  dbAuthCache = { at: Date.now(), value };
  return value;
}

async function secret(): Promise<string> {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || (await dbAuth())?.secret || '';
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function tempPasswordActive(a: DbAuth | null): Promise<boolean> {
  return !!a?.tempHash && (!a.tempExpires || new Date(a.tempExpires) > new Date());
}

/** True when staff can log in at all (env passwords or an active temporary password). */
export async function authConfigured(): Promise<boolean> {
  if (process.env.ADMIN_PASSWORD) return true;
  return tempPasswordActive(await dbAuth());
}

async function hmac(data: string): Promise<string> {
  const key0 = await secret();
  if (!key0) return '';
  const key = await crypto.subtle.importKey('raw', enc.encode(key0), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
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
  if (!token || !(await authConfigured())) return null;
  const [exp, role, sig] = token.split('.');
  if (!exp || !sig || (role !== 'admin' && role !== 'production') || Number(exp) < Date.now() / 1000) return null;
  return safeEqual(sig, await hmac(`${exp}.${role}`)) ? role : null;
}

export async function roleForPassword(password: string): Promise<StaffRole | null> {
  if (process.env.ADMIN_PASSWORD && safeEqual(password, process.env.ADMIN_PASSWORD)) return 'admin';
  if (process.env.PRODUCTION_PASSWORD && safeEqual(password, process.env.PRODUCTION_PASSWORD)) return 'production';
  // The temporary password works alongside the environment one until it expires.
  // Forgiving input: surrounding spaces and letter case (phones auto-capitalise) are ignored.
  const a = await dbAuth();
  if (await tempPasswordActive(a)) {
    const typed = password.trim();
    for (const variant of new Set([typed, typed.toUpperCase(), typed.toLowerCase()])) {
      if (safeEqual(await sha256(variant), a!.tempHash!)) return 'admin';
    }
  }
  return null;
}

/** Paths the production role may access. */
export const productionAllowed = (path: string) => /^\/admin\/(production|login|logout)(\/|$)|^\/api\/admin\/(files|export)(\/|$)/.test(path);
