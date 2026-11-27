import Link from 'next/link';
import { GoogleG, Stars } from '@/components/reviews/parts';
import type { GoogleReview } from '@/lib/google-reviews';

// Google's own avatar colours.
const AVATAR = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#12b5cb', '#c5221f', '#5f6368'];

/** A review the way Google shows it: avatar, name, stars and date, then the text. */
function Card({ r }: { r: GoogleReview }) {
  return (
    <article className="flex h-full w-full flex-col rounded-2xl border border-[#dadce0] bg-white p-5">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[17px] font-medium text-white" style={{ background: AVATAR[r.n % AVATAR.length] }} aria-hidden>
          {r.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#202124]">
            <bdi>{r.name}</bdi>
          </p>
          <p className="flex items-center gap-2 text-xs text-[#70757a]">
            <Stars value={r.rating} className="h-3.5 w-3.5" />
            {r.year}
          </p>
        </div>
        <GoogleG className="h-5 w-5 shrink-0" />
      </header>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#3c4043]">{r.text}</p>
      <a href={r.profile} target="_blank" rel="noopener nofollow" className="mt-3 self-start text-[13px] font-medium text-[#1a73e8] hover:underline">
        לביקורת בגוגל
      </a>
    </article>
  );
}

/**
 * Home page: the Google score and a few real reviews as a static grid (no carousel).
 * The score is left out when the rating data is missing.
 */
export function GoogleReviewsSection({ rating, count, reviews }: { rating: number | null; count: number | null; reviews: GoogleReview[] }) {
  const hasScore = rating != null && count != null;
  return (
    <section className="bg-white py-12 sm:py-16" aria-labelledby="reviews-title">
      <div className="container-x">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {/* The score, like the panel at the top of a Google reviews list */}
          <div className="flex flex-col justify-center pb-3 sm:pb-0 lg:pe-4">
            <p className="flex items-center gap-2 text-[15px] font-medium text-[#3c4043]">
              <GoogleG className="h-6 w-6" />
              ביקורות ב-Google
            </p>
            <h2 id="reviews-title" className="mt-3 text-2xl font-extrabold sm:text-3xl">
              מה הלקוחות אומרים עלינו
            </h2>
            {rating != null && count != null && (
              <div className="mt-4 flex items-center gap-3">
                <p className="text-[2.75rem] leading-none font-medium text-[#202124]">{rating.toFixed(1)}</p>
                <div>
                  <Stars value={rating} className="h-4 w-4" />
                  <p className="mt-1 text-xs text-[#70757a]">{count} ביקורות</p>
                </div>
              </div>
            )}
            <Link href="/reviews/" className="mt-5 inline-flex h-11 items-center self-start rounded-full bg-[#1a73e8] px-5 text-[15px] font-medium text-white transition hover:bg-[#1765cc]">
              {hasScore ? `לכל ${count} הביקורות` : 'לכל הביקורות'}
            </Link>
          </div>
          {reviews.map((r) => (
            <Card key={r.n} r={r} />
          ))}
        </div>
        <p className="mt-3 text-xs text-[#70757a]">הטקסטים הם תקצירים של הביקורות; הנוסח המלא מופיע בגוגל.</p>
      </div>
    </section>
  );
}
