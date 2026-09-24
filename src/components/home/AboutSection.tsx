import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';

const THEN_NOW: { topic: string; then: string; now: string }[] = [
  { topic: 'הכנת הגלופה', then: 'פולימר נוזלי – שעה ויותר', now: 'חריטת לייזר ישירה – עד 20 שניות' },
  { topic: 'הזמנה', then: 'איחוד כמה הזמנות והמתנה של ימים', now: 'גם חותמת אחת – מוכנה מיד' },
  { topic: 'ביקורים', then: 'פעמיים, ואם נפלה טעות – שלוש', now: 'פעם אחת, או משלוח עד הבית' },
  { topic: 'עמידות', then: 'שחיקה גבוהה, חיים קצרים', now: 'שחיקה כמעט אפסית' },
  { topic: 'מחיר המהירות', then: 'תוספת "דחוף"', now: 'בלי תוספת – זה הסטנדרט' },
];

const VALUES = [
  { icon: 'shield', title: 'איכות בלי פשרות', text: 'גופי חותמות COLOP מאוסטריה ודיו מהמפעל המוביל באירופה. בלי מוצרים מסין שאיננו יודעים ממה הם עשויים.' },
  { icon: 'user', title: 'יחס אישי לכל חותמת', text: 'ייעוץ על התוכן, עיצוב לפי הדרישות וסקיצה לאישור – ורק כשאתם מרוצים, מייצרים.' },
  { icon: 'clock', title: 'מהירות כסטנדרט', text: 'כל חותמת אצלנו "דחופה": מיוצרת במקום תוך 2 דקות מרגע האישור.' },
];

export function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden border-y border-line bg-gradient-to-b from-white to-surface py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-blue/10 to-violet/10 blur-3xl" />
      <div className="container-x relative">
        {/* Story */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">אודות</p>
            <h2 className="mt-2 text-3xl leading-tight font-extrabold sm:text-5xl">
              מה שלקח פעם ימים –
              <br />
              <span className="grad-text">אצלנו לוקח 2 דקות.</span>
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              אנחנו סטודיו לחותמות ברמת גן. במשך שנים ייצרנו חותמות בשיטה הישנה – גלופות מפולימר נוזלי, המתנה והגעה חוזרת. אחרי מאמצים רבים הבאנו לרמת גן את מכונת הלייזר החכמה והחזקה בעולם, ומאז כל חותמת נחרטת ישירות מהקובץ ומוכנה לשימוש מיד.
            </p>
          </div>
          <figure className="relative rounded-3xl bg-ink p-7 text-white shadow-lift sm:p-8">
            <span aria-hidden className="absolute -top-5 right-7 font-serif text-7xl leading-none text-blue">”</span>
            <blockquote className="text-xl leading-9 font-semibold sm:text-2xl">כשיצרן המכונה הבטיח שהייצור ייקח לכל היותר 20 שניות – לא האמנו. עד שראינו אותה בפעולה ועמדנו המומים.</blockquote>
            <figcaption className="mt-4 text-sm text-white/60">צוות חותמות 2 דקות · רמת גן</figcaption>
          </figure>
        </div>

        {/* Then vs now */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          <div className="grid grid-cols-[1fr_1fr] border-b border-line text-sm font-semibold sm:grid-cols-[10rem_1fr_1fr]">
            <span className="hidden px-5 py-4 text-muted sm:block" />
            <span className="flex items-center gap-2 bg-surface px-5 py-4 text-muted">
              <Icon name="history" size={17} /> פעם – פולימר
            </span>
            <span className="flex items-center gap-2 bg-blue-50 px-5 py-4 text-blue">
              <Icon name="sparkles" size={17} /> היום – לייזר
            </span>
          </div>
          <ul className="divide-y divide-line">
            {THEN_NOW.map((r) => (
              <li key={r.topic} className="grid grid-cols-[1fr_1fr] text-[15px] sm:grid-cols-[10rem_1fr_1fr]">
                <span className="col-span-2 px-5 pt-4 text-xs font-semibold text-muted sm:col-span-1 sm:py-4 sm:text-sm sm:text-ink">{r.topic}</span>
                <span className="flex items-start gap-2 px-5 py-3 text-muted line-through decoration-muted/40 sm:py-4">{r.then}</span>
                <span className="flex items-start gap-2 bg-blue-50/40 px-5 py-3 font-medium sm:py-4">
                  <Icon name="check" size={16} className="mt-1 shrink-0 text-ok" />
                  {r.now}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Values + visit */}
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {VALUES.map((v) => (
            <div key={v.title} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue">
                <Icon name={v.icon} size={22} />
              </span>
              <h3 className="mt-4 text-lg font-bold">{v.title}</h3>
              <p className="mt-1.5 text-[15px] leading-7 text-muted">{v.text}</p>
            </div>
          ))}
          <div className="flex flex-col rounded-2xl bg-gradient-to-br from-blue to-[#1a33b8] p-6 text-white shadow-lift">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
              <Icon name="pin" size={22} />
            </span>
            <h3 className="mt-4 text-lg font-bold">בואו לראות את המכונה</h3>
            <p className="mt-1.5 text-[15px] leading-7 text-white/80">
              מעימוד הגרפיקה ועד החותמת ביד – 2 דקות.
              <br />
              {SITE.address} · <span className="whitespace-nowrap">א׳–ה׳ <bdi dir="ltr">09:00–17:00</bdi></span>
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <a href={SITE.waze} target="_blank" rel="noopener" className="btn btn-sm bg-white text-ink hover:bg-white/90">
                ניווט ב-Waze
              </a>
              <a href={SITE.phoneHref} className="btn btn-sm border border-white/40 text-white hover:bg-white/10" dir="ltr">
                {SITE.phone}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/about/" className="inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline">
            עוד עלינו <Icon name="arrowLeft" size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
