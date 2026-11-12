'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';
import { MAIN_NAV, STAMP_MENU } from './nav';
import { NewsletterForm } from './NewsletterForm';
import { CookieSettingsButton } from './CookieNotice';

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/designer') || pathname.startsWith('/admin')) return null;
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-muted">
            אתם מעצבים. המערכת מכינה לייצור. אנחנו מייצרים ושולחים – חותמות מוכנות תוך 2 דקות, כבר למעלה מ־20 שנה.
          </p>
          <NewsletterForm />
        </div>
        <div>
          <h2 className="text-sm font-semibold">חותמות</h2>
          <ul className="mt-2 space-y-0.5 text-sm text-muted">
            {STAMP_MENU.filter((m) => m.featured)
              .slice(0, 8)
              .map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className="inline-block py-1 hover:text-ink">
                    {m.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">האתר</h2>
          <ul className="mt-2 space-y-0.5 text-sm text-muted">
            {[...MAIN_NAV, { label: 'תבניות', href: '/templates/' }, { label: 'היסטוריה', href: '/היסטוריה/' }, { label: 'ממליצים', href: '/ממליצים/' }, { label: 'הצהרת נגישות', href: '/הצהרת-נגישות/' }, { label: 'מפת אתר', href: '/מפת-אתר/' }].map((m) => (
              <li key={m.href}>
                <Link href={m.href} className="inline-block py-1 hover:text-ink">
                  {m.label}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" data-a11y-open className="inline-block py-1 text-start hover:text-ink">
                הגדרות נגישות (Alt+A)
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">יצירת קשר</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li className="flex items-center gap-2"><Icon name="phone" size={16} /><a href={SITE.phoneHref} className="inline-block py-1 hover:text-ink" dir="ltr">{SITE.phone}</a></li>
            <li className="flex items-center gap-2"><Icon name="mail" size={16} /><a href={`mailto:${SITE.email}`} className="inline-block py-1 hover:text-ink">{SITE.email}</a></li>
            <li className="flex items-center gap-2"><Icon name="pin" size={16} /><a href={SITE.waze} target="_blank" rel="noopener" className="inline-block py-1 hover:text-ink">{SITE.address}</a></li>
            <li className="flex items-center gap-2"><Icon name="clock" size={16} />{SITE.hours}</li>
            <li className="flex items-center gap-2"><Icon name="whatsapp" size={16} /><a href={SITE.whatsapp} target="_blank" rel="noopener" className="inline-block py-1 hover:text-ink">וואטסאפ</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center gap-3 pt-5 pb-24 text-xs sm:pb-5 text-muted sm:flex-row sm:justify-between">
          <span className="text-center sm:text-start">
            © {new Date().getFullYear()} Stamp2Go · חותמות תוך 2 דקות · הרא״ה 3, רמת גן · כל המחירים כוללים מע״מ
            <span className="mt-1 block">
              <Link href="/privacy/" className="underline hover:text-ink">
                מדיניות פרטיות
              </Link>{' '}
              · <CookieSettingsButton className="underline hover:text-ink" />
            </span>
          </span>
          <a
            href="https://www.media-deal.co.il/"
            target="_blank"
            rel="noopener"
            className="group flex items-center gap-1 text-[10px] text-muted opacity-70 transition hover:text-ink hover:opacity-100"
            aria-label="פותח על ידי מדיה דיל – בית תוכנה ופיתוח אתרים"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media-deal-mark.png" alt="" width={18} height={12} loading="lazy" className="h-3 w-auto opacity-70 transition duration-300 group-hover:scale-110 group-hover:opacity-100" />
            <span>
              פיתוח: <span className="font-semibold">מדיה דיל</span> · בית תוכנה ופיתוח אתרים
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
