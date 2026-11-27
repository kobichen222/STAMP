import Link from 'next/link';
import type { GoogleReview } from '@/lib/google-reviews';

/**
 * Home page: the Google score and a few real reviews, quietly (no carousel, no outbound links).
 * The score is left out when the rating data is missing.
 */
export function GoogleReviewsSection({ rating, count, reviews }: { rating: number | null; count: number | null; reviews: GoogleReview[] }) {
  return (
    <section className="container-x py-16 sm:py-24" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-title" className="text-3xl font-extrabold sm:text-4xl">
            מה הלקוחות אומרים עלינו
          </h2>
          {rating != null && count != null && (
            <p className="mt-2 text-muted">
              {rating.toFixed(1)} בגוגל · {count} ביקורות
            </p>
          )}
        </div>
        <Link href="/reviews/" className="text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
          לכל הביקורות
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.n} className="card flex flex-col p-5">
            <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-2">{r.text}</blockquote>
            <figcaption className="mt-3 text-sm text-muted">
              <bdi>{r.name}</bdi> · {r.year}
            </figcaption>
          </figure>
        ))}
      </div>
      {/* Required by the data file: the texts are summaries, not the reviewers' own words. */}
      <p className="mt-3 text-xs text-muted">הטקסטים הם תקצירים של הביקורות; הנוסח המלא מופיע בגוגל.</p>
    </section>
  );
}
