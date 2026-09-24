'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';
import { MAIN_NAV, STAMP_MENU } from './nav';

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
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">יצירת קשר</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li className="flex items-center gap-2"><Icon name="phone" size={16} /><a href={SITE.phoneHref} className="inline-block py-1 hover:text-ink" dir="ltr">{SITE.phone}</a></li>
            <li className="flex items-center gap-2"><Icon name="mail" size={16} /><a href={`mailto:${SITE.email}`} className="inline-block py-1 hover:text-ink">{SITE.email}</a></li>
            <li className="flex items-center gap-2"><Icon name="pin" size={16} /><a href={SITE.waze} target="_blank" rel="noopener" className="inline-block py-1 hover:text-ink">{SITE.address}</a></li>
            <li className="flex items-center gap-2"><Icon name="clock" size={16} />א׳–ה׳ 09:00–17:00</li>
            <li className="flex items-center gap-2"><Icon name="whatsapp" size={16} /><a href={SITE.whatsapp} target="_blank" rel="noopener" className="inline-block py-1 hover:text-ink">וואטסאפ</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Stamp2Go · חותמות תוך 2 דקות · כל המחירים כוללים מע״מ</span>
          <span>הרא״ה 3, רמת גן</span>
        </div>
      </div>
    </footer>
  );
}
