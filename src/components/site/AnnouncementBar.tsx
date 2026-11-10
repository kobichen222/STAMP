'use client';

import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/config';

/** Site-wide message from admin → settings (hidden in the editor and the admin). */
export function showAnnouncement(pathname: string) {
  return !!SITE.announcement && !pathname.startsWith('/designer') && !pathname.startsWith('/admin');
}

/** The message as an endless ticker: two identical halves slide by one half, so the loop never jumps. */
export function AnnouncementBar() {
  const pathname = usePathname();
  if (!showAnnouncement(pathname)) return null;
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
        <div className="ticker-track flex w-max" aria-hidden>
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
