import { databaseUrl } from '@/server/store/neon';
import { getSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { SiteEditor } from './SiteEditor';

export const metadata = { title: 'הגדרות אתר' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireStaff(['admin']);
  const s = await getSettings(true);
  const checks: [string, boolean, string][] = [
    ['מסד נתונים (Neon)', !!databaseUrl(), 'DATABASE_URL לא מוגדר – השינויים לא יישמרו לצמיתות'],
    ['שליחת מיילים (Resend)', !!process.env.RESEND_API_KEY, 'RESEND_API_KEY לא מוגדר – מיילים לא נשלחים'],
    ['עוזר עיצוב AI', !!process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY לא מוגדר – העוזר עובד במצב מקומי'],
    ['סיסמת צוות ייצור', !!process.env.PRODUCTION_PASSWORD, 'PRODUCTION_PASSWORD לא מוגדר – אין כניסה נפרדת לעובדי ייצור'],
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">הגדרות אתר</h1>
        <p className="mt-1 text-sm text-muted">פרטי הקשר מתעדכנים בכל האתר – בכותרת, בתחתית, בכפתורי וואטסאפ ובמיילים.</p>
      </div>
      <SiteEditor initial={s.site} />
      <section className="card p-5">
        <h2 className="text-lg font-bold">חיבורים</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {checks.map(([label, ok, warn]) => (
            <li key={label} className="flex items-center justify-between gap-3 py-2.5">
              <span>{label}</span>
              <span className={ok ? 'font-medium text-ok' : 'text-warn'}>{ok ? 'מחובר' : warn}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">משתני סביבה מוגדרים ב־Vercel → Settings → Environment Variables (ואחר כך Redeploy).</p>
      </section>
    </div>
  );
}
