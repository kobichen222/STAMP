import type { Metadata } from 'next';
import Link from 'next/link';
import { GoogleG, Stars } from '@/components/reviews/parts';
import { PageHero } from '@/components/site/PageHero';
import { GOOGLE_REVIEWS, GOOGLE_REVIEWS_URL, ratingSpread } from '@/lib/google-reviews';
import { ReviewsList } from './ReviewsList';

export const metadata: Metadata = {
  title: 'ביקורות לקוחות מגוגל',
  description: `${GOOGLE_REVIEWS.count} ביקורות של לקוחות על חותמות תוך 2 דקות בגוגל, דירוג ${GOOGLE_REVIEWS.rating} מתוך 5.`,
  alternates: { canonical: '/reviews/' },
};

export default function ReviewsPage() {
  const { rating, count, reviews } = GOOGLE_REVIEWS;
  const spread = ratingSpread();
  return (
    <>
      <PageHero eyebrow="לקוחות מספרים" title="ביקורות מגוגל" lead="כל הביקורות שלקוחות כתבו עלינו בגוגל – הטובות וגם הפחות טובות." crumbs={[{ label: 'ביקורות' }]} />
      <div className="container-x py-10 sm:py-14">
        <div className="grid gap-5 rounded-3xl border border-line bg-white p-5 shadow-soft sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8 sm:p-7">
          <div className="flex items-center gap-4">
            <GoogleG className="h-12 w-12 shrink-0" />
            <div>
              <p className="flex items-center gap-2.5">
                <b className="text-5xl leading-none font-extrabold">{rating.toFixed(1)}</b>
                <Stars value={rating} className="h-6 w-6" />
              </p>
              <p className="mt-1.5 text-sm text-muted">מבוסס על {count} ביקורות בגוגל</p>
            </div>
          </div>
          <ul className="grid gap-1.5" aria-label="התפלגות הדירוגים">
            {spread.map((s) => (
              <li key={s.stars} className="grid grid-cols-[2.2rem_1fr_2.2rem] items-center gap-2 text-sm">
                <span className="tabular-nums text-muted">{s.stars} ★</span>
                <span className="h-2 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-[#fbbc05]" style={{ width: `${(s.count / count) * 100}%` }} />
                </span>
                <span className="text-end tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener" className="btn-primary justify-center">
              לביקורות בגוגל
            </a>
            <Link href="/designer/" className="btn-outline justify-center">
              לעיצוב חותמת
            </Link>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed break-words text-muted">
          אלה הביקורות של הלקוחות כפי שנכתבו בגוגל.{' '}
          <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener" className="font-semibold text-blue hover:underline">
            לכל הביקורות בגוגל
          </a>
        </p>
        <div className="mt-8">
          <ReviewsList reviews={reviews} spread={spread} googleUrl={GOOGLE_REVIEWS_URL} />
        </div>
      </div>
    </>
  );
}
