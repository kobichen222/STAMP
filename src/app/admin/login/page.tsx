import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
  authConfigured,
  createAdminToken,
  roleForPassword,
  type StaffRole,
} from "@/server/admin-auth";
import {
  normalizeEmail,
  requestLoginCode,
  verifyLoginCode,
} from "@/server/admin-otp";
import { rateLimit } from "@/server/rate-limit";
import { OtpInput } from "./OtpInput";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "כניסת צוות",
  robots: { index: false },
};

const q = (params: Record<string, string>) =>
  "/admin/login/?" + new URLSearchParams(params).toString();

async function startSession(role: StaffRole): Promise<never> {
  (await cookies()).set(ADMIN_COOKIE, await createAdminToken(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  redirect(role === "production" ? "/admin/production/" : "/admin/");
}

async function sendCode(formData: FormData) {
  "use server";
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email.includes("@")) redirect(q({ e: "email" }));
  if (!rateLimit("admin-otp-send", 10, 10 * 60_000)) redirect(q({ e: "rate" }));
  try {
    const r = await requestLoginCode(email);
    if (r === "wait") redirect(q({ step: "code", email, e: "wait" }));
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // redirect()
    console.error("[admin-otp] send", err);
    redirect(q({ e: "mail" }));
  }
  redirect(q({ step: "code", email }));
}

async function checkCode(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  if (!rateLimit("admin-otp-check", 30, 10 * 60_000))
    redirect(q({ step: "code", email, e: "rate" }));
  const role = await verifyLoginCode(email, String(formData.get("code") ?? ""));
  if (!role) redirect(q({ step: "code", email, e: "code" }));
  await startSession(role);
}

/** Emergency access while email codes are new: the existing staff password. */
async function passwordLogin(formData: FormData) {
  "use server";
  if (!rateLimit("admin-login", 20, 10 * 60_000))
    redirect(q({ mode: "password", e: "rate" }));
  const role = await roleForPassword(String(formData.get("password") ?? ""));
  if (!role) redirect(q({ mode: "password", e: "pw" }));
  await startSession(role);
}

const ERRORS: Record<string, string> = {
  email: "יש להזין כתובת מייל",
  rate: "יותר מדי ניסיונות – נסו שוב בעוד כמה דקות",
  mail: "שליחת המייל נכשלה – נסו שוב בעוד רגע",
  wait: "קוד כבר נשלח – בדקו את תיבת המייל (גם בספאם)",
  code: "הקוד שגוי או שפג תוקפו",
  pw: "סיסמה שגויה",
};

function Field({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <>
      {children}
      {error && (
        <p
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl bg-bad/8 px-3 py-2 text-sm font-medium text-bad"
        >
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </>
  );
}

const Arrow = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    e?: string;
    step?: string;
    email?: string;
    mode?: string;
  }>;
}) {
  const { e, step, email = "", mode } = await searchParams;
  const error = e ? ERRORS[e] : "";
  const password = mode === "password";
  const codeStep = !password && step === "code";
  const title = password
    ? "כניסה עם סיסמה"
    : codeStep
      ? "בדקו את המייל"
      : "כניסת צוות";
  const lead = password
    ? "כניסת חירום למקרה שאין גישה למייל."
    : codeStep
      ? null
      : "הזינו את המייל שלכם ונשלח קוד כניסה חד-פעמי.";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel – a banner on phones, the side half on desktop */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-[#1a44d6] via-blue to-violet px-6 pt-10 pb-24 text-white lg:flex lg:flex-col lg:justify-between lg:p-14 lg:pb-14">
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet/40 blur-3xl"
          aria-hidden
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[.07]"
          aria-hidden
        >
          <defs>
            <pattern
              id="dots"
              width="22"
              height="22"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.6" fill="#fff" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        <div className="relative mx-auto max-w-md text-center lg:mx-0 lg:max-w-lg lg:text-start">
          <span className="inline-block rounded-2xl bg-white px-4 py-2.5 text-ink shadow-[0_10px_30px_-12px_rgba(0,0,0,.4)]">
            <Logo />
          </span>
          <h2 className="mt-7 text-[1.7rem] leading-tight font-extrabold sm:text-4xl lg:mt-16 lg:text-5xl">
            ניהול האתר
            <br />
            <span className="text-white/80">חותמות תוך 2 דקות</span>
          </h2>
          <p className="mt-3 text-base text-white/80 lg:mt-5 lg:text-lg">
            הזמנות, ייצור, משלוחים ולקוחות – הכל במקום אחד.
          </p>
        </div>

        <ul className="relative mt-10 hidden gap-4 text-white/90 lg:grid">
          {[
            ["🔒", "כניסה מאובטחת בקוד חד-פעמי"],
            ["📦", "הזמנות וקבצי ייצור בזמן אמת"],
            ["🚚", "שידור משלוחים לזיג זג"],
          ].map(([icon, text]) => (
            <li
              key={text}
              className="flex items-center gap-3 text-lg font-medium"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-xl backdrop-blur"
                aria-hidden
              >
                {icon}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      {/* Form */}
      <main className="relative z-10 -mt-14 px-4 pb-12 lg:mt-0 lg:grid lg:place-items-center lg:p-10">
        <div className="w-full">
          <div className="mx-auto w-full max-w-[26rem] animate-fade-up rounded-3xl border border-line/70 bg-white p-6 shadow-[0_30px_70px_-30px_rgba(11,20,38,.35)] sm:p-9">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue">
              {codeStep ? (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="m3.5 7 8.5 6 8.5-6" />
                </svg>
              ) : (
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
                  <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
                </svg>
              )}
            </div>
            <h1 className="mt-5 text-2xl font-extrabold sm:text-[1.7rem]">
              {title}
            </h1>
            {lead && (
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {lead}
              </p>
            )}

            {password ? (
              <form action={passwordLogin} className="mt-6">
                <Field error={error}>
                  <label className="block">
                    <span className="label">סיסמה</span>
                    <input
                      name="password"
                      type="password"
                      required
                      autoFocus
                      className="input !h-13 !rounded-xl !text-base"
                      autoComplete="current-password"
                    />
                  </label>
                </Field>
                <button
                  className="btn-primary group mt-6 !h-13 w-full !rounded-xl !text-base font-bold"
                  disabled={!(await authConfigured())}
                >
                  כניסה <Arrow />
                </button>
                <a
                  href="/admin/login/"
                  className="mt-5 block text-center text-sm font-semibold text-blue hover:underline"
                >
                  חזרה לכניסה עם קוד במייל
                </a>
              </form>
            ) : codeStep ? (
              <form action={checkCode} className="mt-2">
                <p className="text-[15px] leading-relaxed text-muted">
                  שלחנו קוד בן 6 ספרות אל
                  <br />
                  <strong dir="ltr" className="font-bold text-ink">
                    {email}
                  </strong>
                  <br />
                  הקוד תקף ל-10 דקות. לא הגיע? בדקו גם בספאם.
                </p>
                <input type="hidden" name="email" value={email} />
                <div className="mt-6">
                  <Field error={error}>
                    <OtpInput />
                  </Field>
                </div>
                <button className="btn-primary group mt-6 !h-13 w-full !rounded-xl !text-base font-bold">
                  כניסה לניהול <Arrow />
                </button>
                <div className="mt-5 flex items-center justify-between text-sm font-semibold">
                  <a
                    href={`/admin/login/?email=${encodeURIComponent(email)}`}
                    className="text-muted hover:text-ink"
                  >
                    ← מייל אחר
                  </a>
                  <button
                    formAction={sendCode}
                    name="email"
                    value={email}
                    formNoValidate
                    className="text-blue hover:underline"
                  >
                    שליחת קוד חדש
                  </button>
                </div>
              </form>
            ) : (
              <form action={sendCode} className="mt-6">
                <Field error={error}>
                  <label className="block">
                    <span className="label">מייל</span>
                    <input
                      name="email"
                      type="email"
                      required
                      autoFocus
                      dir="ltr"
                      placeholder="name@stamp2go.co.il"
                      className="input !h-13 !rounded-xl !text-base"
                      autoComplete="email"
                      defaultValue={email}
                    />
                  </label>
                </Field>
                <button className="btn-primary group mt-6 !h-13 w-full !rounded-xl !text-base font-bold">
                  שליחת קוד <Arrow />
                </button>
                <a
                  href="/admin/login/?mode=password"
                  className="mt-6 block text-center text-xs text-muted hover:text-ink hover:underline"
                >
                  אין גישה למייל? כניסה עם סיסמה
                </a>
              </form>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-muted">
            © חותמות תוך 2 דקות · אזור צוות בלבד
          </p>
        </div>
      </main>
    </div>
  );
}
