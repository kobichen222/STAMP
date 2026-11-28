'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';

/**
 * Tranzila's hosted card form, embedded in our page. Card details are typed
 * into Tranzila's page only. When the payment ends, Tranzila loads our return
 * address inside the frame, and that page moves the whole window on.
 * A frame that has not loaded after 10 seconds says so, with a reload button.
 */
export function PaymentFrame({ url, className = '' }: { url: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setStuck(true), 10_000);
    return () => clearTimeout(t);
  }, [loaded, attempt]);
  const reload = () => {
    setLoaded(false);
    setStuck(false);
    setAttempt((a) => a + 1);
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      {!loaded && (
        // z-10: the transparent frame below would otherwise sit on top and catch the button's clicks.
        <div className="absolute inset-0 z-10 grid place-items-center text-sm text-muted">
          {stuck ? (
            <div role="alert" className="max-w-sm px-4 text-center">
              <p className="text-base font-bold text-ink">דף התשלום לא נטען</p>
              <p className="mt-1">בדקו את החיבור לאינטרנט ונסו שוב. ההזמנה שמורה, ואפשר לשלם גם בטלפון: {SITE.phone}</p>
              <button type="button" className="btn-outline btn-sm mt-3" onClick={reload}>
                טעינה מחדש
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue border-t-transparent" /> טוען את דף התשלום המאובטח…
            </span>
          )}
        </div>
      )}
      <iframe
        key={attempt}
        src={url}
        title="תשלום מאובטח בכרטיס אשראי"
        allow="payment"
        onLoad={() => setLoaded(true)}
        className={`block h-[620px] w-full border-0 transition-opacity sm:h-[560px] ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      <p className="flex items-center justify-center gap-1.5 border-t border-line bg-surface px-3 py-2 text-xs text-muted">
        <Icon name="shield" size={14} className="text-ok" /> סליקה מאובטחת של טרנזילה · פרטי הכרטיס לא נשמרים באתר
      </p>
    </div>
  );
}
