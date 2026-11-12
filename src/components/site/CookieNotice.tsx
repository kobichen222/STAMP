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
    <div role="dialog" aria-label="הודעה על עוגיות" className="fixed inset-x-3 bottom-[5.75rem] z-[60] mx-auto max-w-2xl rounded-2xl border border-line bg-white p-4 shadow-lift sm:bottom-5 sm:p-5">
      <p className="text-sm leading-6 text-ink-2">
        <strong className="text-ink">האתר משתמש בעוגיות.</strong> עוגיות חיוניות שומרות את העגלה, את העיצובים ואת העדפות הנגישות שלכם. עוגיות סטטיסטיקה (Google Analytics) עוזרות לנו להבין איך משתמשים באתר ולשפר אותו.{' '}
        <Link href="/privacy/" className="font-semibold text-blue underline">
          מדיניות הפרטיות
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => choose('all')} className="btn-primary btn-sm">
          מאשר/ת הכול
        </button>
        <button type="button" onClick={() => choose('essential')} className="btn-outline btn-sm">
          חיוניות בלבד
        </button>
        {current && <span className="text-xs text-muted">הבחירה הנוכחית: {current === 'all' ? 'הכול' : 'חיוניות בלבד'}</span>}
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
