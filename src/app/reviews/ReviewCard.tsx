import { ReviewAvatar } from '@/components/ReviewAvatar';
import { GoogleG, Stars } from '@/components/reviews/parts';
import type { GoogleReview } from '@/lib/google-reviews';

/** One review: who, how many stars, when, and what they wrote in their own words (line breaks kept). */
export function ReviewCard({ r, className = '' }: { r: GoogleReview; className?: string }) {
  return (
    <article className={`flex flex-col rounded-3xl border border-line bg-white p-5 shadow-soft ${className}`}>
      <div className="flex items-center gap-3">
        <ReviewAvatar name={r.name} src={r.avatar} size={44} />
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
      {/* No label when there is no text: a 1-3 star review may have text on Google, a rating-only one has none. */}
      {r.text ? <p className="mt-2.5 flex-1 text-[15px] leading-relaxed break-words whitespace-pre-line text-ink-2">{r.text}</p> : <div className="flex-1" />}
      <a href={r.profile} target="_blank" rel="noopener nofollow" className="mt-3 self-start text-[13px] font-semibold text-blue hover:underline">
        לביקורות של הכותב/ת בגוגל ←
      </a>
    </article>
  );
}
