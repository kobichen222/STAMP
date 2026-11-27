import Link from 'next/link';
import { GoogleG, Stars } from '@/components/reviews/parts';
import { Icon } from '@/components/ui/Icon';
import type { GoogleReview } from '@/lib/google-reviews';
import { ReviewRotator } from './ReviewRotator';

/**
 * Home page: the Google score and nine real reviews in the customers' own words,
 * three at a time (the rotation lives in ReviewRotator). The score is left out when the rating data is missing.
 */
export function GoogleReviewsSection({ rating, count, reviews }: { rating: number | null; count: number | null; reviews: GoogleReview[] }) {
  return (
    <section className="bg-white py-12 sm:py-16" aria-labelledby="reviews-title">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="reviews-title" className="text-3xl font-extrabold sm:text-4xl">
              מה הלקוחות אומרים עלינו
            </h2>
            {rating != null && count != null && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-ink-2">
                <GoogleG className="h-5 w-5" />
                <strong className="text-lg text-ink">{rating.toFixed(1)}</strong>
                <Stars value={rating} className="h-4 w-4" />
                <span className="text-sm text-muted">{count} ביקורות בגוגל</span>
              </p>
            )}
          </div>
          <Link href="/reviews/" className="inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline">
            לכל הביקורות <Icon name="arrowLeft" size={15} />
          </Link>
        </div>
        <div className="mt-8">
          <ReviewRotator reviews={reviews} />
        </div>
      </div>
    </section>
  );
}
