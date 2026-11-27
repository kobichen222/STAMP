import Link from 'next/link';
import { GoogleG, Stars } from '@/components/reviews/parts';
import { Icon } from '@/components/ui/Icon';
import type { GoogleReview } from '@/lib/google-reviews';

// Google's own avatar colours (as the earlier reviews section used them).
const AVATAR = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#12b5cb', '#c5221f', '#5f6368'];

/** A review the way Google shows it: avatar, name, stars and year, then the text. */
function Card({ r }: { r: GoogleReview }) {
  return (
    <article className="card flex h-full flex-col p-5 shadow-soft">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[17px] font-medium text-white" style={{ background: AVATAR[r.n % AVATAR.length] }} aria-hidden>
          {r.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">
            <bdi>{r.name}</bdi>
          </p>
          <p className="flex items-center gap-2 text-xs text-muted">
            <Stars value={r.rating} className="h-3.5 w-3.5" />
            {r.year}
          </p>
        </div>
        <GoogleG className="h-5 w-5 shrink-0" />
      </header>
      <p className="mt-4 flex-1 text-base leading-relaxed text-ink-2">{r.text}</p>
    </article>
  );
}

/**
 * Home page: the Google score and three real reviews as a static grid (no carousel, no outbound links).
 * The score is left out when the rating data is missing.
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
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {reviews.map((r) => (
            <Card key={r.n} r={r} />
          ))}
        </div>
        {/* Required by the data file: the texts are summaries, not the reviewers' own words. */}
        <p className="mt-3 text-xs text-muted">הטקסטים הם תקצירים של הביקורות; הנוסח המלא מופיע בגוגל.</p>
      </div>
    </section>
  );
}
