import Link from 'next/link';
import type { Metadata } from 'next';
import { Blocks } from '@/components/Blocks';
import { PageHero } from '@/components/site/PageHero';
import { editorialBlocks } from '@/lib/catalog';
import { getPage } from '@/lib/content';

export const metadata: Metadata = {
  title: 'אודות – כך אנחנו הופכים עיצוב דיגיטלי לחותמת אמיתית',
  description: 'Stamp2Go ברמת גן: מכונת לייזר לייצור חותמות גומי תוך 2 דקות, גופי חותמות מאוסטריה ולמעלה מ־20 שנות ניסיון.',
  alternates: { canonical: '/about/' },
};

const PROCESS = [
  ['קובץ וקטורי', 'העיצוב שלכם נשמר כקובץ וקטורי במידות אמיתיות – טקסט מומר לקווים, שחור 100%.'],
  ['בדיקה מוקדמת', 'בדיקה אוטומטית של גבולות, גופנים ועובי קווים לפני שהקובץ מגיע אלינו.'],
  ['חריטת לייזר', 'מכונת לייזר חורטת את הגומי ישירות מהקובץ – בלי גלופות ובלי המתנה.'],
  ['הרכבה ובדיקה', 'הגומי מורכב על גוף החותמת, נבדק בהחתמה – ומוכן לאיסוף או למשלוח.'],
];

export default function AboutPage() {
  const about = getPage('מי-אנחנו');
  const history = getPage('היסטוריה');
  return (
    <>
      <PageHero eyebrow="אודות" title="כך אנחנו הופכים עיצוב דיגיטלי לחותמת אמיתית" lead="חותמות זה הדבר היחיד שאנחנו מייצרים – ואת זה אנחנו עושים הכי טוב, כבר למעלה מ־20 שנה." crumbs={[{ label: 'אודות' }]} />
      <section className="container-x py-16">
        <h2 className="text-3xl font-extrabold">תהליך העבודה</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {PROCESS.map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="font-mono text-sm text-blue">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-[15px] leading-7 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="border-y border-line bg-surface py-16">
        <div className="container-x grid gap-6 md:grid-cols-3">
          {[
            ['2 דקות', 'מאישור ההגהה ועד חותמת מוכנה'],
            ['20+', 'שנות ניסיון בייצור חותמות'],
            ['100%', 'קבצי ייצור וקטוריים במידה אמיתית'],
          ].map(([n, t]) => (
            <div key={t} className="text-center">
              <p className="text-5xl font-extrabold text-blue">{n}</p>
              <p className="mt-2 text-muted">{t}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="container-x max-w-3xl py-16">
        {about && <Blocks blocks={editorialBlocks(about.blocks)} />}
        {history && (
          <p className="mt-8">
            <Link href="/היסטוריה/" className="text-blue hover:underline">
              להיסטוריה של החותמת ←
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
