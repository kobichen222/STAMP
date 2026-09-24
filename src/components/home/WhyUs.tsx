import Link from 'next/link';
import { FaqList } from '@/components/site/FaqList';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';
import type { FaqItem } from '@/lib/faq';

/** "Why only here" – the studio's story, split into questions and answers. */
export const WHY_FAQ: FaqItem[] = [
  {
    q: 'למה רק אצלנו החותמת מוכנה תוך 2 דקות?',
    a: 'כי מכונת הלייזר החכמה והחזקה ביותר בעולם נחתה סוף סוף ברמת גן, אחרי מאמצים רבים שהשקענו. יצרן המכונה הבטיח שזמן הייצור יימשך לכל היותר 20 שניות – ולא האמנו לו עד שראינו את המכונה בפעולה. היום, עם הטכנולוגיה הזו, אנחנו חוסכים לכם את כל כאב הראש שהיה כרוך בהכנת חותמת.',
  },
  {
    q: 'איך הכינו חותמות לפני טכנולוגיית הלייזר?',
    a: 'התהליך היה ארוך ומסורבל: קודם היה צריך לייצר גלופה מפולימר נוזלי – תהליך שנמשך שעה ויותר. לכן לא השתלם לייצר חותמת אחת, ואיחדו כמה הזמנות יחד. הלקוח היה צריך להגיע פעמיים כדי לקבל את ההזמנה – ואם נפלה טעות, גם פעם שלישית.',
  },
  {
    q: 'צריך להזמין מראש? אני צריך חותמת דחופה',
    a: 'הכנת חותמת דחופה היא כבר נחלת העבר – אצלנו כל החותמות "דחופות", כי כולן מיוצרות במקום תוך 2 דקות מרגע ההזמנה. לא משנה איך תקראו לזה: חותמת דחופה, חותמת מהירה או חותמת אקספרס – אין צורך להזמין מראש ולחכות כמה ימים.',
  },
  {
    q: 'המהירות מייקרת את החותמת?',
    a: 'לא. אצלנו מהירות היא סטנדרט עבודה קבוע, לא תוספת. להפך – עם הטכנולוגיה שלנו אתם מקבלים את החותמות הטובות ביותר בעולם במחיר רגיל. המחיר נקבע לפי גודל ודגם החותמת: חותמת גדולה וחותמת כיס קטנה אינן זהות בגודלן, ולכן גם המחיר שונה.',
  },
  {
    q: 'מה ההבדל בין חותמת לייזר לחותמת מפולימר?',
    a: 'חותמות לייזר כמו שלנו מצטיינות ברמת שחיקה כמעט אפסית. לחותמות מפולימר יש רמת שחיקה גבוהה מאוד – ולכן גם אורך החיים שלהן קצר בהרבה.',
  },
  {
    q: 'מאיפה מגיעות החותמות והדיו?',
    a: 'אנחנו לא מחזיקים חותמות תוצרת סין ולא מוכנים להתפשר על האיכות. כל החותמות שלנו מיוצרות באוסטריה על ידי חברת COLOP ועומדות בתקנים האירופיים המחמירים. גם הדיו – החלק החשוב ביותר – מיוצר במפעל המוביל באירופה, ללא פשרות על בטיחות השימוש. אצלנו תמצאו גם כריות דיו חלופיות לכל סוגי החותמות.',
  },
  {
    q: 'אפשר להזמין חותמת אחת בלבד?',
    a: 'בהחלט. אפשר להזמין כל כמות – גם חותמת אישית אחת. עורכי דין שסיימו עכשיו את ההסמכה יכולים לקבל את החותמת מיד, בלי זמן המתנה ובאיכות הגבוהה ביותר.',
  },
  {
    q: 'לא בטוחים מה לכתוב או איך לעצב?',
    a: 'כל חותמת מקבלת אצלנו יחס אישי, כולל ייעוץ לגבי התוכן הנדרש. אפשר לעצב לבד באתר, או לשלוח לנו את התוכן – נעצב לפי הדרישות שלכם, נשלח סקיצה לתיקונים, ורק כשתהיו מרוצים נבצע את ההזמנה. החותמת מוכנה תוך דקות מרגע האישור. חותמת עם כתובת העסק חוסכת המון זמן כתיבה ונותנת תוצאה אסתטית על כל מסמך.',
  },
  {
    q: 'אתם מייצרים חותמת חתימה?',
    a: 'כן. חותמת עם חתימה ידנית חוסכת זמן כשצריך לחתום על מסמכים רבים, או כשרוצים להשאיר את החתימה במשרד.',
  },
  {
    q: 'אפשר לראות את מכונת הלייזר בפעולה?',
    a: `אנחנו מזמינים אתכם לראות ולחוות את תהליך הייצור – משלב עימוד הגרפיקה ועד המוצר הסופי. זכרו: 2 דקות בלבד. הסטודיו נמצא ב${SITE.address}.`,
  },
  {
    q: 'איך מקבלים את החותמת?',
    a: `איסוף עצמי מ${SITE.address}. משלוח בגוש דן מגיע תוך שעות ספורות, ומחוץ לגוש דן – שליח עד הבית תוך יום או יומיים. מחפשים חותמות בתל אביב או במרכז? אנחנו היחידים שמספקים חותמת תוך 2 דקות.`,
  },
];

/** Animated laser engraving a rubber plate (pure SVG + CSS, no JS). */
function LaserArt() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-ink to-[#15213d] p-6 text-white shadow-lift sm:p-8">
      <style>{`
        @keyframes laser-x { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-236px) } }
        @keyframes laser-reveal { 0% { clip-path: inset(0 0 0 100%) } 70%,100% { clip-path: inset(0 0 0 0) } }
        @keyframes laser-spark { 0%,100% { opacity: .2 } 50% { opacity: 1 } }
        .laser-head { animation: laser-x 4s ease-in-out infinite }
        .laser-text { animation: laser-reveal 4s linear infinite }
        .laser-spark { animation: laser-spark .18s linear infinite }
        @media (prefers-reduced-motion: reduce) { .laser-head, .laser-text, .laser-spark { animation: none } }
      `}</style>
      <div className="flex items-center justify-between text-xs text-white/60">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d4d]" /> חריטת לייזר · בזמן אמת
        </span>
        <span className="tabular-nums">00:20</span>
      </div>
      <svg viewBox="0 0 320 170" className="mt-4 w-full" aria-hidden>
        {/* gantry */}
        <rect x="20" y="16" width="280" height="8" rx="4" fill="#2a3a5e" />
        <g className="laser-head" style={{ transformBox: 'view-box' }}>
          <rect x="262" y="10" width="30" height="26" rx="5" fill="#dfe6f2" />
          <rect x="272" y="36" width="10" height="10" rx="2" fill="#9aa8c2" />
          <path d="M277 46 L271 118 L283 118 Z" fill="url(#beam)" />
          <circle cx="277" cy="118" r="5" fill="#ff6b6b" className="laser-spark" />
          <circle cx="277" cy="118" r="12" fill="#ff4d4d" opacity=".25" className="laser-spark" />
        </g>
        {/* rubber plate */}
        <rect x="40" y="94" width="240" height="56" rx="6" fill="#6f2923" />
        <rect x="46" y="100" width="228" height="44" rx="3" fill="#7e2f29" />
        <g className="laser-text">
          <rect x="52" y="105" width="216" height="34" rx="2" fill="none" stroke="#e7b7a8" strokeWidth="2.5" />
          <text x="160" y="122" textAnchor="middle" fontSize="15" fontWeight="800" fill="#e7b7a8" style={{ fontFamily: 'Heebo, Arial' }}>
            ישראל ישראלי
          </text>
          <text x="160" y="135" textAnchor="middle" fontSize="9" fill="#e7b7a8" style={{ fontFamily: 'Heebo, Arial' }}>
            עורך דין ונוטריון · מ.ר. 12345
          </text>
        </g>
        <defs>
          <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ff4d4d" stopOpacity=".1" />
            <stop offset="1" stopColor="#ff4d4d" stopOpacity=".9" />
          </linearGradient>
        </defs>
      </svg>
      <p className="mt-3 text-center text-sm text-white/70">הגומי נחרט ישירות מהקובץ – בלי גלופה, בלי המתנה.</p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        {[
          ['20', 'שניות ייצור'],
          ['2', 'דקות עד חותמת ביד'],
          ['100%', 'תוצרת אוסטריה'],
        ].map(([n, l]) => (
          <div key={l} className="rounded-2xl bg-white/5 px-2 py-3 ring-1 ring-white/10">
            <p className="text-3xl font-extrabold tabular-nums">{n}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-white/60">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhyUs() {
  return (
    <section id="why" className="container-x py-20 sm:py-28">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">למה רק אצלנו?</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">מכונת הלייזר החזקה בעולם. ברמת גן.</h2>
          <p className="mt-4 text-lg leading-8 text-muted">
            בלי גלופות, בלי הזמנה מראש ובלי לחזור פעמיים. החותמת נחרטת בלייזר ומוכנה לשימוש תוך 2 דקות – על גוף חותמת COLOP מאוסטריה.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm">
            {[
              ['shield', 'תוצרת אוסטריה · COLOP'],
              ['check', 'דיו בתקן אירופי'],
              ['clock', 'כל חותמת "דחופה"'],
              ['pin', 'איסוף ברמת גן'],
            ].map(([i, t]) => (
              <li key={t} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-medium">
                <Icon name={i} size={15} className="text-blue" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <LaserArt />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/designer/" className="btn-primary">
              עיצוב חותמת עכשיו
            </Link>
            <a href={SITE.whatsapp} target="_blank" rel="noopener" className="btn-outline">
              <Icon name="whatsapp" size={17} /> שלחו לנו את התוכן
            </a>
          </div>
        </div>
        <div className="self-start">
          <FaqList items={WHY_FAQ} schema={false} openFirst />
        </div>
      </div>
    </section>
  );
}
