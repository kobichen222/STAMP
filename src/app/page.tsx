import Link from 'next/link';
import type { Metadata } from 'next';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { GoogleReviewsSection } from '@/components/home/GoogleReviewsSection';
import { HomeHero } from '@/components/home/HomeHero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { StampBox } from '@/components/home/StampBox';
import { StartBar } from '@/components/home/StartBar';
import { WhyUs } from '@/components/home/WhyUs';
import { FaqList } from '@/components/site/FaqList';
import { Icon } from '@/components/ui/Icon';
import { CATEGORIES, categoryCard } from '@/lib/catalog';
import { site } from '@/lib/content';
import { allFaqItems, faqJsonLd, type FaqItem } from '@/lib/faq';
import { featuredReviews, GOOGLE_REVIEWS } from '@/lib/google-reviews';
import { ensureSettings } from '@/server/settings';

// Same title and description as the WordPress home page (Yoast), so rankings carry over.
const homeSeo = site.pages.find((p) => p.path === '/')?.seo;
export const metadata: Metadata = {
  ...(homeSeo?.title ? { title: { absolute: homeSeo.title } } : {}),
  ...(homeSeo?.description ? { description: homeSeo.description } : {}),
  alternates: { canonical: '/' },
};

const HOME_CATEGORIES = ['business', 'personal', 'doctors', 'lawyers', 'company', 'round', 'date', 'numbering', 'logo', 'signature', 'large', 'pocket'];

// Six existing questions: price, timing, unsure about the text, the preview, logo, a single stamp.
const HOME_FAQ = ['המהירות מייקרת את החותמת?', 'מתי ההזמנה נשלחת?', 'לא בטוחים מה לכתוב או איך לעצב?', 'האם התצוגה המקדימה מדויקת?', 'איזה פורמט לוגו הכי טוב?', 'אפשר להזמין חותמת אחת בלבד?'];

const PROMISES = [
  ['clock', 'מוכנה תוך 2 דקות'],
  ['truck', 'משלוח לכל הארץ או איסוף ברמת גן'],
  ['shield', 'אחריות והחזר כספי'],
] as const;

/** Price shown as "החל מ-X ₪", or null when nothing has a price. */
function priceLabel(prices: (number | null | undefined)[]): string | null {
  const real = prices.filter((p): p is number => typeof p === 'number' && p > 0);
  return real.length ? Math.min(...real).toLocaleString('he-IL', { maximumFractionDigits: 2 }) : null;
}

export default async function HomePage() {
  // Applies the admin's prices, hidden products and added products to the catalogue.
  await ensureSettings();
  const fromPrice = priceLabel(site.products.filter((p) => !p.hidden).map((p) => p.price));
  const cats = HOME_CATEGORIES.map((s) => CATEGORIES.find((c) => c.slug === s)!).map(categoryCard);

  // The Google score, only when the data is really there.
  const ratingOk = typeof GOOGLE_REVIEWS.rating === 'number' && GOOGLE_REVIEWS.rating > 0 && typeof GOOGLE_REVIEWS.count === 'number' && GOOGLE_REVIEWS.count > 0;
  const rating = ratingOk ? GOOGLE_REVIEWS.rating : null;
  const count = ratingOk ? GOOGLE_REVIEWS.count : null;

  const all = allFaqItems();
  const faq = HOME_FAQ.map((q) => all.find((f) => f.q === q)).filter((f): f is FaqItem => !!f);

  return (
    <>
      <HomeHero rating={rating != null ? rating.toFixed(1) : null} fromPrice={fromPrice} />

      <section id="stamps" className="scroll-mt-28 py-12 sm:py-16">
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

      <section aria-label="ההבטחה שלנו" className="border-y border-line bg-surface py-6">
        <ul className="container-x flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[15px] font-semibold text-ink-2 sm:text-lg sm:font-bold">
          {PROMISES.map(([icon, text]) => (
            <li key={text} className="flex items-center gap-2">
              <Icon name={icon} size={20} className="shrink-0 text-blue" />
              {text}
            </li>
          ))}
        </ul>
      </section>

      <HowItWorks />
      <WhyUs />
      <GoogleReviewsSection rating={rating} count={count} reviews={featuredReviews(5)} />

      <section className="border-t border-line bg-surface py-14">
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
      {/* One FAQPage for the home page: exactly the questions shown above. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faq)) }} />

      <section className="container-x py-16" aria-labelledby="end-title">
        <div className="mx-auto max-w-2xl">
          <h2 id="end-title" className="text-center text-4xl font-extrabold sm:text-5xl">
            עכשיו תורכם.
          </h2>
          <div className="mt-8">
            <StampBox idPrefix="end" />
          </div>
        </div>
      </section>

      <StartBar />
    </>
  );
}
