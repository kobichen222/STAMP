'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { GoogleG, ReviewCard, Stars } from '@/components/reviews/parts';
import type { GoogleReview } from '@/lib/google-reviews';

/** What customers say on Google: the rating, the newest reviews, and the way to all of them. */
export function GoogleReviewsSection({ rating, count, reviews, url }: { rating: number; count: number; reviews: GoogleReview[]; url: string }) {
  const track = useRef<HTMLUListElement>(null);
  // RTL: "next" moves the strip towards the left.
  const move = (dir: 1 | -1) => track.current?.scrollBy({ left: -dir * Math.min(380, track.current.clientWidth * 0.85), behavior: 'smooth' });
  return (
    <section className="overflow-hidden border-y border-line bg-gradient-to-b from-white to-surface py-12 sm:py-16" aria-label="ביקורות מגוגל">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div>
            <p className="eyebrow">לקוחות מספרים</p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-4xl">מה אומרים עלינו בגוגל</h2>
          </div>
          <a href={url} target="_blank" rel="noopener" className="flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft transition hover:-translate-y-0.5 hover:border-blue/40 max-sm:w-full">
            <GoogleG className="h-9 w-9 shrink-0" />
            <span>
              <span className="flex items-center gap-2">
                <b className="text-3xl leading-none font-extrabold">{rating.toFixed(1)}</b>
                <Stars value={rating} className="h-5 w-5" />
              </span>
              <span className="mt-1 block text-sm text-muted">מבוסס על {count} ביקורות בגוגל</span>
            </span>
          </a>
        </div>

        <div className="relative mt-7">
          <ul ref={track} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {reviews.map((r) => (
              <li key={r.n} className="flex w-[84%] shrink-0 snap-start sm:w-[21rem]">
                <ReviewCard r={r} className="w-full" />
              </li>
            ))}
          </ul>
          <div className="mt-1 hidden justify-end gap-2 sm:flex">
            {([-1, 1] as const).map((d) => (
              <button key={d} type="button" onClick={() => move(d)} aria-label={d === 1 ? 'הביקורות הבאות' : 'הביקורות הקודמות'} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white shadow-soft transition hover:border-blue hover:text-blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={d === 1 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
          <Link href="/reviews/" className="btn-primary justify-center">
            לכל {count} הביקורות
          </Link>
          <a href={url} target="_blank" rel="noopener" className="btn-outline justify-center">
            לביקורות בגוגל
          </a>
        </div>
        <p className="mt-4 text-xs text-muted">הטקסטים הם תקצירים של הביקורות שנכתבו בגוגל; הנוסח המלא מופיע בגוגל.</p>
      </div>
    </section>
  );
}
