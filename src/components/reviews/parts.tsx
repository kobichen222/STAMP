import type { GoogleReview } from '@/lib/google-reviews';

export function GoogleG({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.600 1.200 9.100 3.600l6.800-6.800C35.800 2.500 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z" />
      <path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.700 6c4.500-4.200 6.900-10.300 6.900-17.700z" />
      <path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.700 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.700-6c-2.200 1.500-5 2.300-8.200 2.300-6.300 0-11.600-4.200-13.500-9.900l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  );
}

const Star = ({ className }: { className: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
    <path d="M10 1.6l2.600 5.300 5.800.8-4.200 4.100 1 5.800L10 14.900l-5.200 2.700 1-5.800L1.600 7.700l5.800-.8z" />
  </svg>
);

export function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <span className="flex" role="img" aria-label={`${value} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={`relative ${className}`}>
            <Star className="absolute inset-0 h-full w-full text-line" />
            <span className="absolute inset-y-0 start-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={`${className} text-[#fbbc04]`} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

const TONES = ['bg-blue', 'bg-violet', 'bg-[#12a150]', 'bg-[#d98a00]', 'bg-[#d6283b]', 'bg-ink-2'];

/** One review: who, how many stars, when, and the summary of what they wrote. */
export function ReviewCard({ r, className = '' }: { r: GoogleReview; className?: string }) {
  return (
    <article className={`flex flex-col rounded-3xl border border-line bg-white p-5 shadow-soft ${className}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold text-white ${TONES[r.n % TONES.length]}`} aria-hidden>
          {r.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            <bdi>{r.name}</bdi>
          </p>
          <p className="text-xs text-muted">ביקורת בגוגל · {r.year}</p>
        </div>
        <GoogleG className="h-5 w-5 shrink-0" />
      </div>
      <div className="mt-3">
        <Stars value={r.rating} />
      </div>
      {r.text ? <p className="mt-2.5 flex-1 text-[15px] leading-relaxed text-ink-2">{r.text}</p> : <p className="mt-2.5 flex-1 text-sm text-muted">דירוג בלי טקסט</p>}
      <a href={r.profile} target="_blank" rel="noopener nofollow" className="mt-3 self-start text-[13px] font-semibold text-blue hover:underline">
        לביקורות של הכותב/ת בגוגל ←
      </a>
    </article>
  );
}
