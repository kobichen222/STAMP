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
    <p role="status" className="hero-news mb-4 inline-flex max-w-full animate-fade-up items-center gap-2.5 rounded-2xl sm:rounded-full p-1 pe-4 text-sm shadow-[0_10px_30px_-14px_rgba(36,87,255,.55)] sm:mb-5 sm:text-base">
      <span className="relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full bg-gradient-to-l from-blue to-violet px-3 py-1 text-xs font-bold text-white sm:text-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6zM19 14l.9 2.6L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.4zM5 15l.7 1.8L7.5 17.5l-1.8.6L5 20l-.7-1.9-1.8-.6 1.8-.7z" />
        </svg>
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
