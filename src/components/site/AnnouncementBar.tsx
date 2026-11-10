'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { SITE } from '@/lib/config';

/** Site-wide message from admin → settings (hidden in the editor and the admin). */
export function showAnnouncement(pathname: string) {
  return !!SITE.announcement && !pathname.startsWith('/designer') && !pathname.startsWith('/admin');
}

/** The message as an endless ticker: two identical halves slide by one half, so the loop never jumps. */
/** Pixels per second – the same calm pace whatever the length of the message (slower on narrow phone screens). */
const speed = () => (window.innerWidth < 640 ? 38 : 55);

export function AnnouncementBar() {
  const pathname = usePathname();
  const track = useRef<HTMLDivElement>(null);
  const show = showAnnouncement(pathname);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const fit = () => el.style.setProperty('--ticker-duration', `${Math.max(12, el.scrollWidth / 2 / speed())}s`);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [show]);
  if (!show) return null;
  const half = (
    <span className="flex shrink-0 items-center">
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className="flex shrink-0 items-center whitespace-nowrap">
          <span className="px-6">{SITE.announcement}</span>
          <span aria-hidden className="text-white/70">
            ✦
          </span>
        </span>
      ))}
    </span>
  );
  return (
    <>
      <div role="status" aria-label={SITE.announcement} className="ticker fixed inset-x-0 top-0 z-[51] flex h-8 items-center overflow-hidden bg-gradient-to-l from-blue to-violet text-[13px] font-medium text-white">
        <div ref={track} className="ticker-track flex w-max" aria-hidden>
          {half}
          {half}
        </div>
        <span className="ticker-static truncate px-4">{SITE.announcement}</span>
      </div>
      {/* Keeps the page below the bar. */}
      <div className="h-8" aria-hidden />
    </>
  );
}
