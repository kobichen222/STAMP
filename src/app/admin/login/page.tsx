import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { ADMIN_COOKIE, ADMIN_MAX_AGE, authConfigured, createAdminToken, roleForPassword, type StaffRole } from '@/server/admin-auth';
import { normalizeEmail, requestLoginCode, verifyLoginCode } from '@/server/admin-otp';
import { rateLimit } from '@/server/rate-limit';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'כניסת צוות', robots: { index: false } };

const q = (params: Record<string, string>) => '/admin/login/?' + new URLSearchParams(params).toString();

async function startSession(role: StaffRole): Promise<never> {
  (await cookies()).set(ADMIN_COOKIE, await createAdminToken(role), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: ADMIN_MAX_AGE });
  redirect(role === 'production' ? '/admin/production/' : '/admin/');
}

async function sendCode(formData: FormData) {
  'use server';
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (!email.includes('@')) redirect(q({ e: 'email' }));
  if (!rateLimit('admin-otp-send', 10, 10 * 60_000)) redirect(q({ e: 'rate' }));
  try {
    const r = await requestLoginCode(email);
    if (r === 'wait') redirect(q({ step: 'code', email, e: 'wait' }));
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err; // redirect()
    console.error('[admin-otp] send', err);
    redirect(q({ e: 'mail' }));
  }
  redirect(q({ step: 'code', email }));
}

async function checkCode(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '');
  if (!rateLimit('admin-otp-check', 30, 10 * 60_000)) redirect(q({ step: 'code', email, e: 'rate' }));
  const role = await verifyLoginCode(email, String(formData.get('code') ?? ''));
  if (!role) redirect(q({ step: 'code', email, e: 'code' }));
  await startSession(role);
}

/** Emergency access while email codes are new: the existing staff password. */
async function passwordLogin(formData: FormData) {
  'use server';
  if (!rateLimit('admin-login', 20, 10 * 60_000)) redirect(q({ mode: 'password', e: 'rate' }));
  const role = await roleForPassword(String(formData.get('password') ?? ''));
  if (!role) redirect(q({ mode: 'password', e: 'pw' }));
  await startSession(role);
}

const ERRORS: Record<string, string> = {
  email: 'יש להזין כתובת מייל',
  rate: 'יותר מדי ניסיונות – נסו שוב בעוד כמה דקות',
  mail: 'שליחת המייל נכשלה – נסו שוב בעוד רגע',
  wait: 'קוד כבר נשלח – בדקו את תיבת המייל (גם בספאם)',
  code: 'הקוד שגוי או שפג תוקפו',
  pw: 'סיסמה שגויה',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string; step?: string; email?: string; mode?: string }> }) {
  const { e, step, email = '', mode } = await searchParams;
  const error = e ? ERRORS[e] : '';
  const password = mode === 'password';
  return (
    <div className="grid min-h-dvh place-items-center bg-surface p-4">
      <div className="card w-full max-w-sm p-8 shadow-soft">
        <Logo />
        <h1 className="mt-6 text-xl font-bold">כניסת צוות</h1>

        {password ? (
          <form action={passwordLogin}>
            <label className="mt-5 block">
              <span className="label">סיסמה</span>
              <input name="password" type="password" required autoFocus className="input" autoComplete="current-password" />
            </label>
            {error && <p className="mt-2 text-sm text-bad">{error}</p>}
            <button className="btn-primary mt-5 w-full" disabled={!(await authConfigured())}>
              כניסה
            </button>
            <a href="/admin/login/" className="mt-4 block text-center text-sm text-blue hover:underline">
              כניסה עם קוד במייל
            </a>
          </form>
        ) : step === 'code' ? (
          <form action={checkCode}>
            <p className="mt-3 text-sm text-muted">
              אם <strong dir="ltr">{email}</strong> מורשה לניהול, נשלח אליו קוד בן 6 ספרות. הקוד תקף ל-10 דקות.
            </p>
            <input type="hidden" name="email" value={email} />
            <label className="mt-5 block">
              <span className="label">קוד מהמייל</span>
              <input
                name="code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                dir="ltr"
                className="input text-center text-2xl font-bold tracking-[0.4em]"
              />
            </label>
            {error && <p className="mt-2 text-sm text-bad">{error}</p>}
            <button className="btn-primary mt-5 w-full">כניסה</button>
            <div className="mt-4 flex justify-between text-sm">
              <a href="/admin/login/" className="text-blue hover:underline">
                מייל אחר
              </a>
              <button formAction={sendCode} name="email" value={email} formNoValidate className="text-blue hover:underline">
                שליחת קוד חדש
              </button>
            </div>
          </form>
        ) : (
          <form action={sendCode}>
            <p className="mt-3 text-sm text-muted">נשלח לכם קוד כניסה חד-פעמי למייל.</p>
            <label className="mt-5 block">
              <span className="label">מייל</span>
              <input name="email" type="email" required autoFocus dir="ltr" className="input" autoComplete="email" defaultValue={email} />
            </label>
            {error && <p className="mt-2 text-sm text-bad">{error}</p>}
            <button className="btn-primary mt-5 w-full">שליחת קוד</button>
            <a href="/admin/login/?mode=password" className="mt-4 block text-center text-xs text-muted hover:underline">
              אין גישה למייל? כניסה עם סיסמה
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
