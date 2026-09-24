import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { SITE } from '@/lib/config';
import './globals.css';

const heebo = Heebo({ subsets: ['hebrew', 'latin'], weight: ['300', '400', '500', '600', '700', '800', '900'], display: 'swap', variable: '--font-heebo' });

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lift">
          דלג לתוכן
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      </body>
    </html>
  );
}
