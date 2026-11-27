import Link from 'next/link';
import type { Metadata } from 'next';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { GoogleReviewsSection } from '@/components/home/GoogleReviewsSection';
import { HomeHero } from '@/components/home/HomeHero';
import { StampBox } from '@/components/home/StampBox';
import { StartBar } from '@/components/home/StartBar';
import { FaqList } from '@/components/site/FaqList';
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

const PROMISES = 'מוכנה תוך 2 דקות · משלוח לכל הארץ או איסוף ברמת גן · אחריות והחזר כספי';

// Links below the first screen stay quiet: the brand blue is kept for the action.
const QUIET_LINK = 'text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink';

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
      <HomeHero fromPrice={fromPrice} />

      <p className="container-x py-8 text-center text-[15px] text-ink-2">{PROMISES}</p>

      <section id="stamps" className="container-x scroll-mt-28 py-16 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-extrabold sm:text-4xl">איזו חותמת אתם צריכים?</h2>
          <Link href="/stamps/" className={QUIET_LINK}>
            לכל החותמות
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => (
            <CategoryCard key={c.slug} c={c} />
          ))}
        </div>
      </section>

      <GoogleReviewsSection rating={rating} count={count} reviews={featuredReviews(3)} />

      <section className="container-x py-16 sm:py-24" aria-labelledby="faq-title">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-10">
          <div>
            <h2 id="faq-title" className="text-3xl font-extrabold sm:text-4xl">
              שאלות נפוצות
            </h2>
            <Link href="/faq/" className={`${QUIET_LINK} mt-4 inline-block`}>
              לכל השאלות
            </Link>
          </div>
          <FaqList items={faq} schema={false} />
        </div>
      </section>
      {/* One FAQPage for the home page: exactly the questions shown above. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faq)) }} />

      <section className="container-x py-16 sm:py-24" aria-labelledby="end-title">
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
