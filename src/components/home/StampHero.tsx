'use client';

import Link from 'next/link';
import { useCallback, useRef } from 'react';
import { useMotionReduced } from '@/lib/motion';
import { StampAssembly } from './StampAssembly';

/** Captions under the headline, keyed to the animation's progress (0..1). */
const STORY = [
  { from: 0, to: 0.08, eyebrow: 'חותמות 2 דקות', title: null },
  { from: 0.1, to: 0.5, eyebrow: 'מבפנים', title: 'כל רכיב מדויק. כל חותמת נבנית להחזיק שנים.' },
  { from: 0.5, to: 0.68, eyebrow: 'הרכבה', title: 'מוכנה תוך 2 דקות מרגע האישור.' },
  { from: 0.68, to: 1.01, eyebrow: 'עכשיו תורכם', title: 'עכשיו תורכם לעצב.' },
];

export function StampHero() {
  const storyRef = useRef<HTMLDivElement>(null);
  // Re-mounts the animation when the accessibility menu stops / restarts motion.
  const motionOff = useMotionReduced();

  const onProgress = useCallback((p: number) => {
    const story = storyRef.current;
    if (!story) return;
    story.querySelectorAll<HTMLElement>('[data-from]').forEach((n) => {
      const a = +n.dataset.from!;
      const b = +n.dataset.to!;
      const on = p >= a && p < b;
      n.style.opacity = on ? '1' : '0';
      n.style.transform = on ? 'none' : 'translateY(10px)';
    });
  }, []);

  return (
    <section className="relative overflow-x-clip" aria-label="מעצבים חותמת אונליין">
      {/* Shorter than the screen on purpose: the next section peeks in, so it's clear the page goes on. */}
      <div className="relative flex items-start overflow-hidden bg-gradient-to-b from-white via-white to-surface lg:min-h-[calc(100dvh-12rem)]">
        <div className="container-x relative grid w-full content-start gap-2 pt-[4.5rem] pb-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-6 lg:pt-28 lg:pb-16">
          <div className="relative z-10 max-w-xl lg:max-w-2xl">
            <p className="mb-3 inline-flex animate-fade-up items-center gap-2 rounded-full border border-blue/20 bg-blue/5 px-3.5 py-1 text-sm font-bold text-blue sm:text-base">
              <span aria-hidden>❄️</span> חורף בריא
            </p>
            <h1 className="animate-fade-up text-[1.85rem] leading-[1.15] font-extrabold max-[360px]:text-[1.65rem] sm:text-5xl lg:text-[2.6rem] lg:leading-[1.15] xl:text-[2.9rem]">
              מעצבים חותמת אונליין,
              <br />
              <span className="grad-text">החותמת מוכנה תוך&nbsp;2&nbsp;דקות.</span>
            </h1>
            <ul className="mt-3 flex animate-fade-up flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold text-ink-2 sm:gap-x-4 sm:text-2xl sm:font-bold">
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue sm:h-2.5 sm:w-2.5" aria-hidden /> איסוף עצמי ברמת גן
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue sm:h-2.5 sm:w-2.5" aria-hidden /> משלוחים לכל הארץ
              </li>
            </ul>
            <div className="mt-6 flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-3 sm:mt-9">
              <Link
                href="/designer/"
                className="btn-primary cta-glow group !h-12 !rounded-xl !px-6 !text-base font-bold shadow-[0_14px_30px_-12px_rgba(36,87,255,.8)] sm:!h-[4.25rem] sm:!rounded-2xl sm:!px-9 sm:!text-[1.35rem]"
              >
                עצבו חותמת עכשיו
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:-translate-x-1" aria-hidden>
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
              </Link>
              <Link href="/how-it-works/" className="font-semibold text-blue underline-offset-4 hover:underline max-sm:hidden sm:px-3">
                איך זה עובד?
              </Link>
            </div>
            <div ref={storyRef} className="relative mt-10 hidden h-20 lg:block" aria-hidden>
              {STORY.filter((s) => s.title).map((s) => (
                <div key={s.from} data-from={s.from} data-to={s.to} className="absolute inset-0 opacity-0 transition duration-500">
                  <p className="text-sm font-semibold text-blue">{s.eyebrow}</p>
                  <p className="mt-1 text-2xl font-bold">{s.title}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative -mx-4 h-[320px] max-[380px]:h-[280px] sm:mx-0 sm:h-[420px] lg:h-[70vh] lg:min-h-[440px]">
            <StampAssembly key={String(motionOff)} onProgress={onProgress} />
          </div>
        </div>

        <a
          href="#how"
          className="group absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-blue/25 bg-white/90 py-1.5 ps-4 pe-1.5 text-sm font-semibold whitespace-nowrap text-blue shadow-soft backdrop-blur transition hover:bg-blue hover:text-white sm:py-2 sm:ps-5 sm:pe-2 sm:text-base sm:font-bold"
        >
          איך זה עובד? גללו למטה
          <span className="cue-nudge grid h-7 w-7 place-items-center rounded-full bg-blue sm:h-8 sm:w-8 text-white group-hover:bg-white group-hover:text-blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </a>
      </div>
    </section>
  );
}
