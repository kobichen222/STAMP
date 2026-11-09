'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Official WhatsApp glyph. */
const WA_PATH =
  'M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.96-3.48-.23-.36a9.44 9.44 0 0 1-1.44-5.03c0-5.22 4.25-9.46 9.47-9.46 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.25 9.46-9.46 9.46m8.05-17.52A11.32 11.32 0 0 0 12.05.65C5.78.65.67 5.76.67 12.03c0 2 .52 3.96 1.52 5.69L.57 23.65l6.06-1.59a11.37 11.37 0 0 0 5.42 1.38h.01c6.27 0 11.38-5.11 11.38-11.38 0-3.04-1.18-5.9-3.33-8.05';

const HIDDEN = ['/designer', '/checkout', '/cart', '/admin'];

/** Floating WhatsApp button for phones: soft pulse, a gentle wiggle and a one-time "chat with us" bubble. */
export function WhatsAppFab({ href }: { href: string }) {
  const pathname = usePathname() ?? '/';
  const [hint, setHint] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('wa-hint') === '1';
    } catch {}
    if (seen) return;
    const show = setTimeout(() => setHint(true), 3500);
    const hide = setTimeout(() => {
      setHint(false);
      try {
        sessionStorage.setItem('wa-hint', '1');
      } catch {}
    }, 9500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;
  const product = pathname.startsWith('/stamp/');

  return (
    <div className={`fixed right-3 z-[2147483590] lg:hidden ${product ? 'bottom-[88px]' : 'bottom-3'}`}>
      <span
        className={`wa-hint pointer-events-none absolute top-1/2 right-[4.25rem] -translate-y-1/2 rounded-2xl rounded-br-sm bg-white px-3.5 py-2 text-sm font-bold whitespace-nowrap text-ink shadow-[0_10px_30px_-10px_rgba(11,20,38,.45)] transition duration-500 ${hint ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`}
        aria-hidden
      >
        יש שאלה? דברו איתנו 👋
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        aria-label="שיחה בוואטסאפ"
        className="wa-fab group relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#5cf57f] to-[#1ebe5b] text-white shadow-[0_12px_28px_-8px_rgba(30,190,91,.8)] ring-2 ring-white transition active:scale-95"
      >
        <span className="wa-ring absolute inset-0 rounded-full bg-[#25d366]" aria-hidden />
        <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" className="wa-icon relative drop-shadow-[0_1px_1px_rgba(0,0,0,.15)]" aria-hidden>
          <path d={WA_PATH} />
        </svg>
      </a>
    </div>
  );
}
