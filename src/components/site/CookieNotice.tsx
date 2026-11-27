'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CONSENT_OPEN_EVENT, getConsent, setConsent, type Consent } from '@/lib/consent';

/** Cookie notice: shown until the visitor chooses; "הגדרות עוגיות" in the footer reopens it. */
export function CookieNotice() {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Consent | null>(null);

  useEffect(() => {
    const c = getConsent();
    setCurrent(c);
    setOpen(!c);
    const reopen = () => {
      setCurrent(getConsent());
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, []);

  if (!open || pathname.startsWith('/admin') || pathname.startsWith('/designer')) return null;
  const choose = (v: Consent) => {
    setConsent(v);
    setCurrent(v);
    setOpen(false);
  };
  return (
    // Thin, quiet, non-modal bar: one line of text and two equal-weight choices (wraps to two lines on phones).
    // Bottom offset and z-index are relied on by the home page's phone bottom bar – keep them.
    <div role="dialog" aria-label="הודעה על עוגיות" className="fixed inset-x-3 bottom-[5.75rem] z-[60] mx-auto flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-white px-3 py-2 shadow-soft sm:bottom-5 sm:px-4">
      <p className="text-sm text-ink-2">
        האתר משתמש בעוגיות ·{' '}
        <Link href="/privacy/" className="text-blue underline">
          מדיניות הפרטיות
        </Link>
      </p>
      <div className="flex items-center gap-2 sm:ms-auto">
        <button type="button" onClick={() => choose('all')} className="btn-outline btn-sm">
          מאשר/ת הכול
        </button>
        <button type="button" onClick={() => choose('essential')} className="btn-outline btn-sm">
          חיוניות בלבד
        </button>
        {current && <span className="text-xs text-muted">כרגע: {current === 'all' ? 'הכול' : 'חיוניות בלבד'}</span>}
      </div>
    </div>
  );
}

/** Footer button that reopens the cookie notice. */
export function CookieSettingsButton({ className = '' }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))} className={className}>
      הגדרות עוגיות
    </button>
  );
}
