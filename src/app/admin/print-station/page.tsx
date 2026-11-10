import { requireStaff } from '@/server/staff';
import { AutoPrint } from './AutoPrint';

export const metadata = { title: 'תחנת הדפסה' };
export const dynamic = 'force-dynamic';

export default async function PrintStationPage() {
  await requireStaff(['admin', 'production']);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">תחנת הדפסה אוטומטית</h1>
        <p className="mt-1 text-sm text-muted">כל הזמנה ששולמה ועברה בדיקה נשלחת לבד למכונת הלייזר, בגודל המדויק של החותמת, ועוברת ל״בייצור״.</p>
      </div>
      <AutoPrint />
      <section className="card p-4 text-sm leading-6 sm:p-5">
        <h2 className="font-bold">הגדרה חד־פעמית במחשב של המכונה</h2>
        <ol className="mt-2 list-decimal space-y-1.5 ps-5 text-ink-2">
          <li>
            ב־Windows: הגדרות ← מדפסות וסורקים ← <strong dir="ltr">Trotec Engraver</strong> ← ״הגדר כברירת מחדל״ (ולבטל ״אפשר ל־Windows לנהל את מדפסת ברירת המחדל״).
          </li>
          <li>
            בהעדפות ההדפסה של Trotec: לסמן <strong dir="ltr">Size Optimization</strong> (העבודה נחתכת לגודל החותמת ולא לכל הפלטה), ולבחור את תבנית החומר של גומי החותמות.
          </li>
          <li>
            קיצור דרך על שולחן העבודה שמדפיס בלי חלון הדפסה – מקש ימני ← חדש ← קיצור דרך, ולהדביק:
            <code className="mt-1 block break-all rounded-lg bg-surface p-2 text-xs" dir="ltr">
              &quot;C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe&quot; --kiosk-printing --user-data-dir=C:\Stamp2GoStation https://www.stamp2go.co.il/admin/print-station/
            </code>
          </li>
          <li>לפתוח מהקיצור, להתחבר לניהול פעם אחת וללחוץ ״הפעלת הדפסה אוטומטית״. משאירים את החלון פתוח (אפשר ממוזער).</li>
        </ol>
        <p className="mt-2 text-xs text-muted">בלי הקיצור הדף עדיין עובד, אבל לכל הדפסה ייפתח חלון אישור.</p>
      </section>
    </div>
  );
}
