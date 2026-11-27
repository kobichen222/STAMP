'use client';

import { useState } from 'react';
import { Stars } from '@/components/reviews/parts';
import type { LayoutContent } from '@/designer/compose';
import { LazyTemplatePreview as TemplatePreview } from '@/designer/LazyTemplatePreview';
import type { StampModel } from '@/designer/types';
import { STAMP_EXAMPLES } from './stamp-examples';
import { StampBox } from './StampBox';

// The most popular rectangular body, the same one the template previews use.
const MODEL: StampModel = { id: 'print-40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
// Stable content objects, so the preview only re-renders when the chip changes.
const CONTENT: Record<string, LayoutContent> = Object.fromEntries(STAMP_EXAMPLES.map((e) => [e.id, { lines: e.lines }]));

/**
 * First screen: the headline, the text box, proof and price, and one static sample imprint
 * that follows the example chip the visitor clicked.
 */
export function HomeHero({ rating, count, fromPrice }: { rating: string | null; count: number | null; fromPrice: string | null }) {
  const [example, setExample] = useState(STAMP_EXAMPLES[0]);

  return (
    <section id="start" aria-labelledby="start-title" className="relative overflow-x-clip">
      <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-surface">
        <div aria-hidden className="pointer-events-none absolute -top-32 left-[-10%] h-[36rem] w-[36rem] rounded-full bg-gradient-to-br from-blue/10 to-violet/10 blur-3xl" />
        {/* Top padding leaves room for the fixed, transparent header. */}
        <div className="container-x relative grid gap-10 pt-24 pb-12 sm:pb-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12 lg:pt-32">
          <div className="min-w-0 max-w-2xl">
            <h1 id="start-title" className="text-[1.85rem] leading-[1.15] font-extrabold max-[360px]:text-[1.65rem] sm:text-5xl lg:text-[2.6rem] lg:leading-[1.15] xl:text-[2.9rem]">
              כתבו מה צריך להיות בחותמת. <span className="grad-text">אנחנו נכין אותה.</span>
            </h1>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-2 sm:text-xl lg:text-lg">איסוף עצמי ברמת גן, או משלוח לכל הארץ.</p>

            <div className="mt-6">
              <StampBox idPrefix="start" onPick={setExample} />
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-2">
              {rating && count ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <Stars value={Number(rating)} className="h-4 w-4" />
                    <strong className="text-ink">{rating}</strong> בגוגל · {count} ביקורות
                  </span>
                  <span aria-hidden className="h-4 w-px bg-line" />
                </>
              ) : null}
              <span className="font-semibold text-ink">קיימים משנת 2001</span>
            </p>
            <p className="mt-2 text-[15px] text-ink-2">
              {fromPrice ? (
                <>
                  החל מ-<strong className="text-base text-ink">{fromPrice} ₪</strong> ·{' '}
                </>
              ) : null}
              מוכנה תוך 2 דקות
            </p>
            <a href="#stamps" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline">
              מעדיפים לבחור? לכל סוגי החותמות ←
            </a>
          </div>

          <figure className="min-w-0">
            <div className="grid aspect-[4/3] place-items-center rounded-3xl border border-line bg-gradient-to-b from-surface to-blue-50/60 p-8 shadow-soft sm:p-12">
              <div className="w-full drop-shadow-[0_10px_18px_rgba(11,20,38,.12)]">
                <TemplatePreview model={MODEL} content={CONTENT[example.id]} style="classic" ink="blue" className="w-full" />
              </div>
            </div>
            <figcaption className="mt-3 text-center text-sm text-muted" aria-live="polite">
              דוגמה: {example.label}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
