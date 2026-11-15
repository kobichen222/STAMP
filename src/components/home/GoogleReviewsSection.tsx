'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { GoogleG, Stars } from '@/components/reviews/parts';
import type { GoogleReview } from '@/lib/google-reviews';

// Google's own avatar colours.
const AVATAR = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#12b5cb', '#c5221f', '#5f6368'];

/** A review the way Google shows it: avatar, name, stars and date, then the text. */
function Card({ r }: { r: GoogleReview }) {
  return (
    <article className="flex h-full w-full flex-col rounded-2xl border border-[#dadce0] bg-white p-5 transition hover:shadow-[0_1px_3px_rgba(60,64,67,.2),0_4px_12px_rgba(60,64,67,.12)]">
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

/** Customers on Google, in Google's own clean look: the score with its breakdown, and the latest reviews. */
export function GoogleReviewsSection({ rating, count, reviews, spread, url }: { rating: number; count: number; reviews: GoogleReview[]; spread: { stars: number; count: number }[]; url: string }) {
  const track = useRef<HTMLUListElement>(null);
  // RTL: "next" moves the strip towards the left.
  const move = (dir: 1 | -1) => track.current?.scrollBy({ left: -dir * Math.min(360, track.current.clientWidth * 0.85), behavior: 'smooth' });
  const arrow = 'grid h-10 w-10 place-items-center rounded-full border border-[#dadce0] bg-white text-[#3c4043] transition hover:bg-[#f8f9fa]';
  return (
    <section className="bg-white py-12 sm:py-16" aria-label="ביקורות מגוגל">
      <div className="container-x grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-10">
        {/* The score, like the panel at the top of a Google reviews list */}
        <div className="lg:pt-1">
          <p className="flex items-center gap-2 text-[15px] font-medium text-[#3c4043]">
            <GoogleG className="h-6 w-6" />
            ביקורות ב-Google
          </p>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">מה הלקוחות אומרים עלינו</h2>
          <div className="mt-5 flex items-center gap-5">
            <div className="text-center">
              <p className="text-[3.5rem] leading-none font-medium text-[#202124]">{rating.toFixed(1)}</p>
              <div className="mt-2 flex justify-center">
                <Stars value={rating} className="h-4 w-4" />
              </div>
              <p className="mt-1.5 text-xs text-[#70757a]">{count} ביקורות</p>
            </div>
            <ul className="grid flex-1 gap-1.5" aria-label="התפלגות הדירוגים">
              {spread.map((s) => (
                <li key={s.stars} className="flex items-center gap-2 text-xs text-[#70757a]">
                  <span className="w-2 tabular-nums">{s.stars}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f1f3f4]">
                    <span className="block h-full rounded-full bg-[#fbbc04]" style={{ width: `${Math.max(s.count ? 2 : 0, (s.count / count) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/reviews/" className="inline-flex h-11 items-center rounded-full bg-[#1a73e8] px-5 text-[15px] font-medium text-white transition hover:bg-[#1765cc]">
              לכל {count} הביקורות
            </Link>
            <a href={url} target="_blank" rel="noopener" className="inline-flex h-11 items-center rounded-full border border-[#dadce0] px-5 text-[15px] font-medium text-[#1a73e8] transition hover:bg-[#f8f9fa]">
              פתיחה בגוגל
            </a>
          </div>
        </div>

        <div className="min-w-0">
          <ul ref={track} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:gap-4 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {reviews.map((r) => (
              <li key={r.n} className="flex w-[82%] shrink-0 snap-start sm:w-[19.5rem]">
                <Card r={r} />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-[#70757a]">הטקסטים הם תקצירים של הביקורות; הנוסח המלא מופיע בגוגל.</p>
            <div className="hidden shrink-0 gap-2 sm:flex">
              <button type="button" onClick={() => move(-1)} aria-label="הביקורות הקודמות" className={arrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <button type="button" onClick={() => move(1)} aria-label="הביקורות הבאות" className={arrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
