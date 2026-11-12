import type { Metadata, Viewport } from 'next';
// Heebo is self-hosted so builds never depend on fetching Google Fonts.
import '@fontsource-variable/heebo/wght.css';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { AnnouncementBar } from '@/components/site/AnnouncementBar';
import { RouteMemory } from '@/components/site/RouteMemory';
import { Suspense } from 'react';
import { AccessibilityMenu } from '@/components/a11y/AccessibilityMenu';
import { WhatsAppFab } from '@/components/site/WhatsAppFab';
import { BOOT_SCRIPT } from '@/components/a11y/settings';
import { SITE } from '@/lib/config';
import { SettingsBoot } from '@/components/site/SettingsBoot';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { CookieNotice } from '@/components/site/CookieNotice';
import { ensureSettings } from '@/server/settings';
import './globals.css';
import './a11y.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Stamp2Go – מעצבים חותמת אונליין, מקבלים חותמת אמיתית',
    template: '%s | Stamp2Go',
  },
  description:
    'עצבו חותמת אונליין: בוחרים דגם, מוסיפים טקסט ולוגו, רואים תצוגה מקדימה בזמן אמת ומזמינים ישירות לייצור. חותמות מוכנות תוך 2 דקות, משלוחים לכל הארץ.',
  openGraph: { type: 'website', locale: 'he_IL', siteName: 'Stamp2Go' },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Stamp2Go – חותמות תוך 2 דקות',
  url: SITE.url,
  telephone: '+972-3-6733770',
  email: SITE.email,
  logo: `${SITE.url}/favicon.svg`,
  address: { '@type': 'PostalAddress', streetAddress: 'הרא"ה 3', addressLocality: 'רמת גן', addressCountry: 'IL' },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '09:00', closes: '17:00' },
  ],
};

// Admin changes (prices, contact details, products) reach every page within a minute, or at once on save.
export const revalidate = 60;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await ensureSettings();
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <SettingsBoot settings={{ pricing: settings.pricing, site: settings.site }} />
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
          דלג לתוכן
        </a>
        <AnnouncementBar />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <AccessibilityMenu />
        <WhatsAppFab href={SITE.whatsapp} />
        <Suspense>
          <RouteMemory />
        </Suspense>
        <Suspense>
          <GoogleAnalytics />
          <CookieNotice />
        </Suspense>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      </body>
    </html>
  );
}
