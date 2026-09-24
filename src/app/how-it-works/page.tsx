import type { Metadata } from 'next';
import { HowItWorksPaths, HowItWorksStory } from '@/components/home/HowItWorksStory';
import { LaserArt } from '@/components/home/WhyUs';
import { PageHero } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'איך זה עובד – מעיצוב אונליין לחותמת ביד תוך 2 דקות',
  description: 'בוחרים חותמת, מעצבים או שולחים לנו את התוכן, מאשרים – והגומי נחרט בלייזר תוך 20 שניות. איסוף ברמת גן או משלוח עד הבית.',
  alternates: { canonical: '/how-it-works/' },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="איך זה עובד"
        title="מעיצוב אונליין לחותמת ביד"
        lead="לא צריך Photoshop, Illustrator או Corel – ולא צריך להזמין מראש. בוחרים, מעצבים, מאשרים, והחותמת מוכנה תוך 2 דקות."
        crumbs={[{ label: 'איך זה עובד' }]}
      />
      <HowItWorksStory />
      <section className="border-t border-line bg-surface py-14 sm:py-20">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">מאחורי הקלעים</p>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-4xl">בלי גלופה. בלי המתנה.</h2>
            <p className="mt-4 text-[15px] leading-7 text-muted sm:text-lg sm:leading-8">
              פעם הכנת חותמת התחילה בגלופה מפולימר נוזלי – שעה ויותר, איחוד הזמנות והגעה חוזרת. היום מכונת הלייזר חורטת את הגומי ישירות מהקובץ תוך 20 שניות, והחותמת עמידה יותר: כמעט בלי שחיקה.
            </p>
          </div>
          <LaserArt />
        </div>
      </section>
      <section className="container-x py-14 sm:py-20">
        <h2 className="text-center text-2xl font-extrabold sm:text-3xl">איך תרצו להתחיל?</h2>
        <div className="mx-auto mt-8 max-w-4xl">
          <HowItWorksPaths />
        </div>
      </section>
    </>
  );
}
