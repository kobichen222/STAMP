import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { ADMIN_COOKIE, ADMIN_MAX_AGE, createAdminToken, roleForPassword } from '@/server/admin-auth';
import { rateLimit } from '@/server/rate-limit';

export const metadata: Metadata = { title: 'כניסת צוות', robots: { index: false } };

async function login(formData: FormData) {
  'use server';
  if (!rateLimit('admin-login', 20, 10 * 60_000)) redirect('/admin/login/?e=rate');
  const role = roleForPassword(String(formData.get('password') ?? ''));
  if (!role) redirect('/admin/login/?e=1');
  (await cookies()).set(ADMIN_COOKIE, await createAdminToken(role), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: ADMIN_MAX_AGE });
  redirect(role === 'production' ? '/admin/production/' : '/admin/');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const configured = !!process.env.ADMIN_PASSWORD;
  return (
    <div className="grid min-h-dvh place-items-center bg-surface p-4">
      <form action={login} className="card w-full max-w-sm p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 text-xl font-bold">כניסת צוות</h1>
        {!configured && <p className="mt-3 rounded-lg bg-warn/10 p-3 text-sm text-warn">יש להגדיר ADMIN_PASSWORD במשתני הסביבה של Vercel.</p>}
        <label className="mt-5 block">
          <span className="label">סיסמה</span>
          <input name="password" type="password" required autoFocus className="input" autoComplete="current-password" />
        </label>
        {e && <p className="mt-2 text-sm text-bad">{e === 'rate' ? 'יותר מדי ניסיונות' : 'סיסמה שגויה'}</p>}
        <button className="btn-primary mt-5 w-full" disabled={!configured}>
          כניסה
        </button>
      </form>
    </div>
  );
}
