'use client';

import { SITE } from '@/lib/config';

/** The ticker bar is gone – the admin message (admin → settings) now shows in the home hero. */
export function showAnnouncement(_pathname: string) {
  void _pathname;
  return false;
}

export function AnnouncementBar() {
  return null;
}

/** "התחדשנו באתר חדש!!! עשינו …" → a bold first sentence and the rest. */
function splitMessage(text: string): [string, string] {
  const m = /^(.*?[!.?]+)\s*(.*)$/s.exec(text.trim());
  return m && m[2] ? [m[1].replace(/!{2,}/, '!'), m[2]] : [text.trim(), ''];
}

/** The admin message as a badge above the hero headline. */
export function HeroAnnouncement() {
  if (!SITE.announcement) return null;
  const [head, rest] = splitMessage(SITE.announcement);
  return (
    <p role="status" className="hero-news mb-3 inline-flex max-w-full animate-fade-up items-center gap-1.5 rounded-2xl p-0.5 pe-2.5 text-[11.5px] shadow-[0_8px_24px_-14px_rgba(36,87,255,.55)] sm:mb-5 sm:gap-2.5 sm:rounded-full sm:p-1 sm:pe-4 sm:text-base">
      <span className="relative inline-flex shrink-0 items-center overflow-hidden rounded-full bg-gradient-to-l from-blue to-violet px-2 py-0.5 text-[10.5px] font-bold text-white sm:px-3 sm:py-1 sm:text-sm">
        חדש
        <span className="hero-news-shine" aria-hidden />
      </span>
      <span className="min-w-0 text-start leading-snug">
        <strong className="font-extrabold text-ink">{head}</strong>
        {rest && <span className="text-ink-2"> {rest}</span>}
      </span>
    </p>
  );
}
