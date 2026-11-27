import Link from 'next/link';
import type { Metadata } from 'next';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { GoogleReviewsSection } from '@/components/home/GoogleReviewsSection';
import { HomeHero } from '@/components/home/HomeHero';
import { StartBlock } from '@/components/home/StartBlock';
import { StartBar } from '@/components/home/StartBar';
import { HomeFaq } from '@/components/home/HomeFaq';
import { Icon } from '@/components/ui/Icon';
import { CATEGORIES, categoryCard } from '@/lib/catalog';
import { site } from '@/lib/content';
import { SITE } from '@/lib/config';
import { allFaqItems, faqJsonLd, type FaqItem } from '@/lib/faq';
import { GOOGLE_REVIEWS, homeReviews } from '@/lib/google-reviews';
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

// The site's usual text-link style (blue, arrow); these stay text links, never buttons.
const SECTION_LINK = 'inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline';

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
      {/* The first screen ends with the white promise band; the bands below alternate surface and white. */}
      <HomeHero fromPrice={fromPrice} announcement={!!SITE.announcement} />

      <section id="stamps" className="scroll-mt-28 bg-surface py-12 sm:py-16">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-extrabold sm:text-4xl">איזו חותמת אתם צריכים?</h2>
            <Link href="/stamps/" className={SECTION_LINK}>
              לכל החותמות <Icon name="arrowLeft" size={15} />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {cats.map((c) => (
              <CategoryCard key={c.slug} c={c} />
            ))}
          </div>
        </div>
      </section>

      <GoogleReviewsSection rating={rating} count={count} reviews={homeReviews()} />

      <section className="bg-surface py-12 sm:py-16" aria-labelledby="faq-title">
        <div className="container-x">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="faq-title" className="text-3xl font-extrabold sm:text-4xl">
                שאלות נפוצות
              </h2>
              <Link href="/faq/" className={SECTION_LINK}>
                לכל השאלות <Icon name="arrowLeft" size={15} />
              </Link>
            </div>
            <div className="mt-8">
              <HomeFaq items={faq} />
            </div>
          </div>
        </div>
      </section>
      {/* One FAQPage for the home page: exactly the questions shown above. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faq)) }} />

      {/* The final call to act, on a soft brand-blue tint (blue-50, about 8% blue on white) so it reads apart
          from the grey FAQ band and footer. The 1px overlap covers the footer's top border, so the tint meets
          the footer's surface directly. */}
      <section className="relative z-[1] -mb-px bg-blue-50 py-20 sm:py-28" aria-labelledby="end-title">
        <div className="container-x flex justify-center">
          <StartBlock as="h2" idPrefix="end" fromPrice={fromPrice} />
        </div>
      </section>

      <StartBar />
    </>
  );
}
