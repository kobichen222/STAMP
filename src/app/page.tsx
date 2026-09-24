import Link from 'next/link';
import type { Metadata } from 'next';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { AboutSection } from '@/components/home/AboutSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { StampHero } from '@/components/home/StampHero';
import { TemplateStrip } from '@/components/home/TemplateStrip';
import { WHY_FAQ, WhyUs } from '@/components/home/WhyUs';
import { FaqList } from '@/components/site/FaqList';
import { Icon } from '@/components/ui/Icon';
import { CATEGORIES, categoryCard } from '@/lib/catalog';
import { FAQ, faqJsonLd } from '@/lib/faq';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const HOME_CATEGORIES = ['business', 'personal', 'doctors', 'lawyers', 'company', 'round', 'date', 'numbering', 'logo', 'signature', 'large', 'pocket'];

export default function HomePage() {
  const cats = HOME_CATEGORIES.map((s) => CATEGORIES.find((c) => c.slug === s)!).map(categoryCard);
  const faq = FAQ.flatMap((f) => f.items.slice(0, 1)).slice(0, 6);
  return (
    <>
      <StampHero />
      <HowItWorks />
      <WhyUs />

      <section className="border-y border-line bg-surface py-20 sm:py-28">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">קטגוריות</p>
              <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">איזו חותמת אתם צריכים?</h2>
            </div>
            <Link href="/stamps/" className="text-sm font-medium text-blue hover:underline">
              לכל החותמות ←
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {cats.map((c) => (
              <CategoryCard key={c.slug} c={c} />
            ))}
          </div>
        </div>
      </section>

      <TemplateStrip />
      <AboutSection />

      <section className="container-x py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">הבדיקה שלנו, לפני הייצור שלכם</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">אתם מעצבים. המערכת מכינה לייצור. אנחנו מייצרים ושולחים.</h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              כל עיצוב עובר בדיקה אוטומטית: גבולות, גודל גופן מינימלי, עובי קווים ואיכות לוגו. הקובץ שנשלח לייצור הוא וקטורי ומדויק במילימטר – לא צילום מסך.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ['clock', 'מוכנה תוך 2 דקות', 'מכונת לייזר שמייצרת את הגומי ישירות מהקובץ.'],
              ['check', 'בדיקת ייצור אוטומטית', 'המערכת מתקנת בעיות נפוצות בלחיצה.'],
              ['shield', 'תוצרת אוסטריה', 'גופי חותמות איכותיים, בלי חיקויים.'],
              ['truck', 'משלוחים לכל הארץ', 'או איסוף עצמי מהרא״ה 3, רמת גן.'],
            ].map(([i, t, d]) => (
              <li key={t} className="card p-5">
                <Icon name={i} className="text-blue" />
                <h3 className="mt-3 font-bold">{t}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line bg-surface py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">שאלות נפוצות</p>
            <h2 className="mt-2 text-3xl font-extrabold">כל מה שרציתם לדעת</h2>
            <Link href="/faq/" className="btn-outline mt-6">
              לכל השאלות
            </Link>
          </div>
          <FaqList items={faq} schema={false} />
        </div>
      </section>

      {/* One FAQPage for the whole home page (why-us + general questions). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd([...WHY_FAQ, ...faq])) }} />

      <section className="container-x py-24 text-center">
        <h2 className="text-4xl font-extrabold sm:text-5xl">עכשיו תורכם לעצב.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">בחרו תבנית או התחילו מדף ריק. תראו בדיוק מה תקבלו – לפני שאתם משלמים.</p>
        <Link href="/designer/" className="btn-primary btn-lg mt-8">
          יצירת חותמת
        </Link>
      </section>
    </>
  );
}
