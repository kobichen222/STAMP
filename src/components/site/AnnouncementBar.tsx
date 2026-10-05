'use client';

import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/config';

/** Site-wide message from admin → settings (hidden in the editor and the admin). */
export function showAnnouncement(pathname: string) {
  return !!SITE.announcement && !pathname.startsWith('/designer') && !pathname.startsWith('/admin');
}

export function AnnouncementBar() {
  const pathname = usePathname();
  if (!showAnnouncement(pathname)) return null;
  return (
    <>
      <div role="status" className="fixed inset-x-0 top-0 z-[51] flex h-8 items-center justify-center bg-ink px-4 text-center text-[13px] font-medium text-white">
        <span className="truncate">{SITE.announcement}</span>
      </div>
      {/* Keeps the page below the bar. */}
      <div className="h-8" aria-hidden />
    </>
  );
}
