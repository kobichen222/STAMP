'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * Tranzila's hosted card form, embedded in our page. Card details are typed
 * into Tranzila's page only. When the payment ends, Tranzila loads our return
 * address inside the frame, and that page moves the whole window on.
 */
export function PaymentFrame({ url, className = '' }: { url: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted">
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue border-t-transparent" /> טוען את דף התשלום המאובטח…
          </span>
        </div>
      )}
      <iframe
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
