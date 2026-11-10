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
      <section className="card border-blue/30 p-4 text-sm leading-6 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">התקנה בקובץ אחד (Windows XP / 7 / 10 / 11)</h2>
            <p className="text-ink-2">מגדיר הכול לבד: דפדפן, Trotec כמדפסת ברירת מחדל, אייקון בשולחן העבודה ופתיחה אוטומטית בהפעלת המחשב.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/downloads/stamp2go-station-setup.bat" download className="btn-primary">
              הורדת קובץ ההתקנה
            </a>
            <a href="/downloads/stamp2go-station-uninstall.bat" download className="btn-outline">
              קובץ הסרה
            </a>
          </div>
        </div>
        <ol className="mt-3 list-decimal space-y-1.5 ps-5 text-ink-2">
          <li>
            <strong>במחשב XP בלבד:</strong> להוריד במחשב אחר את Supermium (גרסת 32-bit, דפדפן מודרני שעובד על XP SP3) מ־
            <a href="https://github.com/win32ss/supermium/releases" target="_blank" rel="noopener" className="text-blue underline" dir="ltr">
              github.com/win32ss/supermium
            </a>{' '}
            ולשים אותו באותה תיקייה עם קובץ ההתקנה (למשל בדיסק און קי).
          </li>
          <li>ללחוץ פעמיים על <span dir="ltr">stamp2go-station-setup.bat</span> במחשב של המכונה ולעקוב אחרי ההודעות.</li>
          <li>בחלון שנפתח: להתחבר לניהול פעם אחת וללחוץ ״הפעלת הדפסה אוטומטית״.</li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          להסרה: לחיצה כפולה על <span dir="ltr">stamp2go-station-uninstall.bat</span> – סוגר את חלון התחנה, מוחק את האייקון, את הפתיחה האוטומטית ואת תיקיית התחנה. הדפדפן והדרייבר של Trotec נשארים.
        </p>
      </section>

      <section className="card p-4 text-sm leading-6 sm:p-5">
        <h2 className="font-bold">הגדרה ידנית (אם לא משתמשים בקובץ)</h2>
        <ol className="mt-2 list-decimal space-y-1.5 ps-5 text-ink-2">
          <li>
            ב־Windows: הגדרות ← מדפסות וסורקים ← <strong dir="ltr">Trotec Engraver</strong> ← ״הגדר כברירת מחדל״ (ולבטל ״אפשר ל־Windows לנהל את מדפסת ברירת המחדל״).
          </li>
          <li>
            בהעדפות ההדפסה של Trotec: לסמן <strong dir="ltr">Size Optimization</strong> (העבודה נחתכת לגודל החותמת ולא לכל הפלטה), ולבחור את תבנית החומר של גומי החותמות שבה אדום = חיתוך ושחור = חריטה. כל הדפסה כוללת קו חיתוך אדום דק בגודל החותמת המדויק.
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
