'use client';

import { useState } from 'react';
import { ReviewCard } from '@/components/reviews/parts';
import type { GoogleReview } from '@/lib/google-reviews';

const PAGE = 30;

/** Every review, with a star filter and "show more". */
export function ReviewsList({ reviews, spread }: { reviews: GoogleReview[]; spread: { stars: number; count: number }[] }) {
  const [stars, setStars] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const list = stars ? reviews.filter((r) => r.rating === stars) : reviews;
  const pick = (s: number) => {
    setStars(s);
    setShown(PAGE);
  };
  const chip = (on: boolean) => `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40'}`;
  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="סינון לפי דירוג">
        <button type="button" role="tab" aria-selected={!stars} className={chip(!stars)} onClick={() => pick(0)}>
          הכל · {reviews.length}
        </button>
        {spread
          .filter((s) => s.count)
          .map((s) => (
            <button key={s.stars} type="button" role="tab" aria-selected={stars === s.stars} className={chip(stars === s.stars)} onClick={() => pick(s.stars)}>
              {s.stars} ★ · {s.count}
            </button>
          ))}
      </div>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.slice(0, shown).map((r) => (
          <li key={r.n} className="flex">
            <ReviewCard r={r} className="w-full" />
          </li>
        ))}
      </ul>
      {shown < list.length && (
        <div className="mt-6 text-center">
          <button type="button" className="btn-outline" onClick={() => setShown(shown + PAGE)}>
            הצגת עוד ביקורות ({list.length - shown} נוספות)
          </button>
        </div>
      )}
    </>
  );
}
