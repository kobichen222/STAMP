import type { Metadata } from 'next';
import { PageHero } from '@/components/site/PageHero';
import { CookieSettingsButton } from '@/components/site/CookieNotice';
import { SITE } from '@/lib/config';
import { ensureSettings } from '@/server/settings';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות ועוגיות',
  description: 'איזה מידע האתר אוסף, למה, עם מי הוא משותף, אילו עוגיות בשימוש ואיך מממשים את הזכויות שלכם.',
  alternates: { canonical: '/privacy/' },
};

const UPDATED = '12.11.2026';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-3 text-2xl font-bold">{title}</h2>
      <div className="space-y-3 leading-7 text-ink-2">{children}</div>
    </section>
  );
}

const List = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="list-disc space-y-1.5 pe-0 ps-5">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
);

export default async function PrivacyPage() {
  await ensureSettings();
  const TOC = [
    ['who', 'מי אנחנו'],
    ['what', 'איזה מידע נאסף'],
    ['why', 'למה אנחנו משתמשים במידע'],
    ['share', 'עם מי המידע משותף'],
    ['cookies', 'עוגיות ואחסון בדפדפן'],
    ['mail', 'מיילים ודיוור'],
    ['keep', 'שמירה ואבטחה'],
    ['rights', 'הזכויות שלכם'],
    ['contact', 'יצירת קשר'],
  ] as const;
  return (
    <>
      <PageHero eyebrow="מידע משפטי" title="מדיניות פרטיות ועוגיות" lead={`עודכן לאחרונה: ${UPDATED}`} crumbs={[{ label: 'מדיניות פרטיות' }]} />
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
        <nav aria-label="תוכן העניינים" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="chip lg:w-full">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl space-y-10">
          <Section id="who" title="מי אנחנו">
            <p>
              האתר {SITE.url.replace(/^https?:\/\//, '')} מופעל על ידי {SITE.name} – {SITE.hebrewName}, {SITE.address}. המדיניות הזו מסבירה איזה מידע אנחנו אוספים כשאתם גולשים באתר, מעצבים חותמת או מזמינים, מה אנחנו עושים איתו ומה הזכויות שלכם.
            </p>
            <p>אין חובה חוקית למסור לנו מידע, אבל בלי פרטי קשר וכתובת לא נוכל לבצע הזמנה ולשלוח אותה.</p>
          </Section>

          <Section id="what" title="איזה מידע נאסף">
            <List
              items={[
                <>
                  <strong>פרטי הזמנה:</strong> שם, טלפון, מייל, שם עסק וח.פ. (אם מילאתם), כתובת למשלוח והערות להזמנה.
                </>,
                <>
                  <strong>תוכן החותמת:</strong> הטקסט, הלוגו והעיצוב שיצרתם או העליתם. התוכן הזה נדרש לייצור החותמת.
                </>,
                <>
                  <strong>תשלום:</strong> התשלום בכרטיס אשראי נעשה בדף מאובטח של חברת הסליקה טרנזילה. פרטי הכרטיס לא עוברים דרכנו ולא נשמרים אצלנו; אנחנו מקבלים רק אישור על התשלום ומספר אסמכתה.
                </>,
                <>
                  <strong>פניות:</strong> מה שכתבתם בטופס יצירת הקשר, בוואטסאפ או במייל.
                </>,
                <>
                  <strong>הזמנה שלא הושלמה:</strong> אם התחלתם למלא פרטים בדף התשלום ולא סיימתם, הפרטים שהוקלדו נשמרים כדי שנוכל לשלוח לכם תזכורת ולשחזר את העגלה.
                </>,
                <>
                  <strong>נתוני גלישה:</strong> עמודים שנצפו, סוג מכשיר ודפדפן, מקור ההגעה ואזור גיאוגרפי כללי – דרך Google Analytics, ורק אם לא בחרתם ב״עוגיות חיוניות בלבד״.
                </>,
                <>
                  <strong>רישום טכני:</strong> כתובת IP ויומני שרת, לצורכי אבטחה ואיתור תקלות.
                </>,
              ]}
            />
          </Section>

          <Section id="why" title="למה אנחנו משתמשים במידע">
            <List
              items={[
                'לייצר את החותמת, לגבות תשלום, לשלוח את ההזמנה ולעדכן אתכם על מצבה.',
                'לתת שירות: לענות לפניות, לתקן טעויות ולטפל בהחזרות.',
                'להפיק חשבוניות ולעמוד בדרישות החוק.',
                'לשפר את האתר לפי נתוני שימוש כלליים.',
                'למנוע הונאות ושימוש לרעה ולשמור על אבטחת האתר.',
                'לשלוח דיוור – רק אם נרשמתם אליו.',
              ]}
            />
            <p>איננו מוכרים מידע אישי ואיננו מעבירים אותו לגורמים אחרים לצורכי פרסום שלהם.</p>
          </Section>

          <Section id="share" title="עם מי המידע משותף">
            <p>המידע מועבר רק לספקים שנדרשים כדי להפעיל את האתר ולבצע את ההזמנה, ורק במידה הנחוצה:</p>
            <List
              items={[
                <>
                  <strong>טרנזילה</strong> – סליקת כרטיסי אשראי.
                </>,
                <>
                  <strong>זיג זג ו-DataLogics</strong> – חברת השליחויות ומערכת המשלוחים: שם, טלפון, כתובת ותכולת המשלוח.
                </>,
                <>
                  <strong>Vercel ו-Neon</strong> – אחסון האתר ומסד הנתונים (שרתים באירופה).
                </>,
                <>
                  <strong>ספק דואר אלקטרוני</strong> – שליחת אישורי הזמנה ועדכונים.
                </>,
                <>
                  <strong>Google Analytics</strong> – סטטיסטיקת שימוש, בכפוף לבחירת העוגיות שלכם.
                </>,
                'רשויות מוסמכות – אם נידרש לכך על פי דין.',
              ]}
            />
            <p>חלק מהספקים פועלים מחוץ לישראל, ולכן מידע עשוי להישמר או לעבור דרך שרתים בחו״ל.</p>
          </Section>

          <Section id="cookies" title="עוגיות ואחסון בדפדפן">
            <p>עוגיות (Cookies) ואחסון מקומי הם קבצים קטנים שנשמרים בדפדפן שלכם. באתר יש שני סוגים:</p>
            <List
              items={[
                <>
                  <strong>חיוניות</strong> – שומרות בדפדפן שלכם את העגלה, את העיצובים שיצרתם, את העדפות הנגישות ואת בחירת העוגיות. בלעדיהן האתר לא עובד כמו שצריך, ולכן אי אפשר לכבות אותן. דף התשלום של טרנזילה עשוי לשמור עוגיות משלו.
                </>,
                <>
                  <strong>סטטיסטיקה</strong> – Google Analytics, למדידת שימוש באתר. אפשר לסרב להן בלי שהאתר ייפגע.
                </>,
              ]}
            />
            <p>
              אפשר לשנות את הבחירה בכל רגע:{' '}
              <CookieSettingsButton className="font-semibold text-blue underline" />. אפשר גם למחוק או לחסום עוגיות בהגדרות הדפדפן; מחיקה תנקה גם את העגלה ואת העיצובים השמורים במכשיר.
            </p>
          </Section>

          <Section id="mail" title="מיילים ודיוור">
            <List
              items={[
                'מיילים על הזמנה (אישור, עדכוני סטטוס, משלוח) נשלחים כחלק מהשירות.',
                'אם השארתם מייל בדף התשלום ולא השלמתם הזמנה, ייתכן שתקבלו תזכורת. בכל תזכורת יש קישור להסרה.',
                'דיוור שיווקי נשלח רק למי שנרשם אליו, ואפשר להסיר את עצמכם בכל עת בקישור שבמייל או בפנייה אלינו.',
              ]}
            />
          </Section>

          <Section id="keep" title="שמירה ואבטחה">
            <p>המידע נשמר כל עוד הוא נדרש למטרות שלשמן נאסף – למשל כדי שתוכלו להזמין שוב את אותה חותמת – ולתקופות שהחוק מחייב לשמור מסמכי הנהלת חשבונות. אחר כך הוא נמחק או הופך לאנונימי.</p>
            <p>האתר פועל בחיבור מוצפן (HTTPS), הגישה למערכת הניהול מוגבלת לצוות מורשה, ופרטי כרטיסי אשראי אינם נשמרים אצלנו. עם זאת, שום מערכת אינה חסינה לחלוטין, ואיננו יכולים להבטיח אבטחה מוחלטת.</p>
          </Section>

          <Section id="rights" title="הזכויות שלכם">
            <p>לפי חוק הגנת הפרטיות, אתם רשאים:</p>
            <List items={['לעיין במידע שאנחנו מחזיקים עליכם.', 'לבקש לתקן מידע שגוי או לא מעודכן.', 'לבקש למחוק מידע, בכפוף לחובות השמירה שבדין.', 'להסיר את עצמכם מדיוור בכל עת.']} />
            <p>
              כדי לממש זכות, כתבו לנו ל־<a href={`mailto:${SITE.email}`} className="font-semibold text-blue underline">{SITE.email}</a>. נשיב בתוך זמן סביר, ולכל היותר בתוך 30 יום. האתר אינו מיועד לילדים מתחת לגיל 18, ואיננו אוספים ביודעין מידע עליהם.
            </p>
          </Section>

          <Section id="contact" title="יצירת קשר">
            <p>
              שאלות על המדיניות או על המידע שלכם: {SITE.name}, {SITE.address} ·{' '}
              <a href={SITE.phoneHref} className="font-semibold text-blue" dir="ltr">
                {SITE.phone}
              </a>{' '}
              ·{' '}
              <a href={`mailto:${SITE.email}`} className="font-semibold text-blue underline">
                {SITE.email}
              </a>
            </p>
            <p>אנחנו עשויים לעדכן את המדיניות מעת לעת. הגרסה המעודכנת תפורסם בעמוד הזה, עם תאריך העדכון בראשו.</p>
          </Section>
        </article>
      </div>
    </>
  );
}
