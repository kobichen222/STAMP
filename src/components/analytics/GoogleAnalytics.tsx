'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { analyticsAllowed, CONSENT_EVENT } from '@/lib/consent';

/** Google Analytics 4 measurement id (Admin › Data streams). NEXT_PUBLIC_GA_ID overrides it. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-YQH65VJR2H';

/**
 * GA4 on the public site only – the admin and print pages are not tracked, and neither is a visitor
 * who chose "essential cookies only". Page views on client navigation come from GA's enhanced measurement.
 */
export function GoogleAnalytics() {
  const path = usePathname() ?? '';
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const sync = () => {
      const ok = analyticsAllowed();
      // GA's own switch – stops a tag that is already loaded when the visitor opts out.
      (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = !ok;
      setAllowed(ok);
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);
  if (!GA_ID || !allowed || path.startsWith('/admin')) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
