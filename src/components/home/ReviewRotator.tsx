'use client';

import { useEffect, useState } from 'react';
import { ReviewAvatar } from '@/components/ReviewAvatar';
import { GoogleG, Stars } from '@/components/reviews/parts';
import type { GoogleReview } from '@/lib/google-reviews';
import { useMotionReduced } from '@/lib/motion';

const INTERVAL_MS = 7000;
const PER_GROUP = 3;

/** A review the way Google shows it: avatar, name, stars and year, then the reviewer's own words. */
function Card({ r }: { r: GoogleReview }) {
  return (
    <article className="card flex h-full flex-col p-5 shadow-soft">
      <header className="flex items-center gap-3">
        <ReviewAvatar name={r.name} src={r.avatar} size={40} />
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
      {/* Shown exactly as written: line breaks kept, nothing trimmed or shortened. */}
      <p dir="auto" className="mt-4 flex-1 text-base leading-relaxed whitespace-pre-line text-ink-2">
        {r.text}
      </p>
    </article>
  );
}

/**
 * Three reviews at a time; every few seconds the next group cross-fades in.
 * All groups sit in the same grid cell, so the height is always the tallest group's and never jumps.
 * Pauses on hover or keyboard focus; the button stops it for good; with reduced motion it never starts by itself.
 */
export function ReviewRotator({ reviews }: { reviews: GoogleReview[] }) {
  const groups: GoogleReview[][] = [];
  for (let i = 0; i < reviews.length; i += PER_GROUP) groups.push(reviews.slice(i, i + PER_GROUP));

  const reduced = useMotionReduced();
  const [index, setIndex] = useState(0);
  // null = never touched: rotate unless reduced motion; true / false = the visitor's own choice.
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const playing = userPaused === null ? !reduced : !userPaused;
  const running = playing && !hovered && !focused && groups.length > 1;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % groups.length), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [running, index, groups.length]);

  return (
    <div>
      <div
        className="grid"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        {groups.map((g, gi) => {
          const active = gi === index;
          return (
            <div
              key={gi}
              aria-hidden={!active}
              inert={!active}
              className={`col-start-1 row-start-1 grid gap-4 transition-opacity duration-[400ms] sm:grid-cols-3 ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              {g.map((r) => (
                <Card key={r.n} r={r} />
              ))}
            </div>
          );
        })}
      </div>
      {groups.length > 1 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setUserPaused(playing)}
            aria-label={playing ? 'עצירת החלפת הביקורות' : 'הפעלת החלפת הביקורות'}
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-2 transition hover:border-ink/30 hover:text-ink"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
