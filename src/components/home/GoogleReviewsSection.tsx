'use client';

import { useRef, useState } from 'react';
import type { GoogleReviews } from '@/server/google-reviews';

function GoogleG({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.600 1.200 9.100 3.600l6.800-6.800C35.800 2.500 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z" />
      <path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.700 6c4.500-4.200 6.900-10.300 6.900-17.700z" />
      <path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.700 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.700-6c-2.200 1.500-5 2.300-8.200 2.300-6.300 0-11.600-4.200-13.500-9.900l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <span className="flex" role="img" aria-label={`${value} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={`relative ${className}`}>
            <Star className="absolute inset-0 h-full w-full text-line" />
            <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${className} text-[#fbbc05]`} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
const Star = ({ className }: { className: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
    <path d="M10 1.6l2.600 5.300 5.800.8-4.200 4.100 1 5.800L10 14.900l-5.200 2.700 1-5.800L1.600 7.700l5.800-.8z" />
  </svg>
);

const TONES = ['bg-blue', 'bg-violet', 'bg-[#12a150]', 'bg-[#d98a00]', 'bg-[#d6283b]'];

function ReviewCard({ r, i }: { r: GoogleReviews['reviews'][number]; i: number }) {
  const [open, setOpen] = useState(false);
  const long = r.text.length > 190;
  return (
    <li className="flex w-[84%] shrink-0 snap-start flex-col rounded-3xl border border-line bg-white p-5 shadow-soft sm:w-[22rem] sm:p-6">
      <div className="flex items-center gap-3">
        {r.photo ? (
          <img src={r.photo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-11 w-11 shrink-0 rounded-full" />
        ) : (
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${TONES[i % TONES.length]}`} aria-hidden>
            {r.author.trim().charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{r.author}</p>
          <p className="text-xs text-muted">{r.when}</p>
        </div>
        <GoogleG className="h-5 w-5 shrink-0" />
      </div>
      <div className="mt-3">
        <Stars value={r.rating} />
      </div>
      <p className={`mt-2.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-2 ${open ? '' : 'line-clamp-5'}`}>{r.text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-2 self-start text-sm font-semibold text-blue hover:underline">
          {open ? 'פחות' : 'קראו עוד'}
        </button>
      )}
    </li>
  );
}

/** What customers say on Google: the live rating, the latest reviews, and the way to all of them. */
export function GoogleReviewsSection({ data }: { data: GoogleReviews }) {
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
          <a
            href={data.url}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft transition hover:-translate-y-0.5 hover:border-blue/40 max-sm:w-full"
          >
            <GoogleG className="h-9 w-9 shrink-0" />
            <span>
              <span className="flex items-center gap-2">
                <b className="text-3xl leading-none font-extrabold">{data.rating.toFixed(1)}</b>
                <Stars value={data.rating} className="h-5 w-5" />
              </span>
              <span className="mt-1 block text-sm text-muted">מבוסס על {data.count.toLocaleString('he-IL')} ביקורות בגוגל</span>
            </span>
          </a>
        </div>

        {data.reviews.length > 0 && (
          <div className="relative mt-7">
            <ul ref={track} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {data.reviews.map((r, i) => (
                <ReviewCard key={`${r.author}-${i}`} r={r} i={i} />
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
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
          <a href={data.url} target="_blank" rel="noopener" className="btn-primary justify-center">
            לכל {data.count.toLocaleString('he-IL')} הביקורות בגוגל
          </a>
          <a href={data.writeUrl} target="_blank" rel="noopener" className="btn-outline justify-center">
            כתבו ביקורת
          </a>
        </div>
      </div>
    </section>
  );
}
