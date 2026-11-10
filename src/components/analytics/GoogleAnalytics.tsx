'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/** Google Analytics 4 measurement id (Admin › Data streams). NEXT_PUBLIC_GA_ID overrides it. */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-YQH65VJR2H';

/** GA4 on the public site only – the admin and print pages are not tracked. Page views on client navigation come from GA's enhanced measurement. */
export function GoogleAnalytics() {
  const path = usePathname() ?? '';
  if (!GA_ID || path.startsWith('/admin')) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
