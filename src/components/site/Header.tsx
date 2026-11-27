'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/Logo';
import { useCartCount } from '@/lib/cart-store';
import { SITE } from '@/lib/config';
import { MobileMenu } from './MobileMenu';
import { showAnnouncement } from './AnnouncementBar';
import { STAMP_MENU, TRADE_NAV } from './nav';

/**
 * Desktop-only contact strip above the main bar (34px). It collapses to 0 once the page is scrolled,
 * and turns invisible so its links leave the tab order while collapsed.
 * Text only, in one style for the whole strip: address and hours as plain text on the start side,
 * three links split by thin dividers on the end side, all sharing the same hover.
 */
// Each strip link carries one 16px icon in the text colour (same size and colour for all three).
const STRIP_LINK = 'flex items-center gap-1.5 hover:text-ink hover:underline';
const STRIP_ICON = 16;

function StripDivider() {
  return <span className="h-3 w-px shrink-0 bg-ink/20" aria-hidden />;
}

function ContactStrip({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`hidden overflow-hidden bg-surface transition-[height,visibility] duration-300 lg:block ${collapsed ? 'invisible h-0' : 'h-[34px]'}`}>
      <div className="container-x flex h-[34px] items-center justify-between gap-6 text-[12.5px] font-medium whitespace-nowrap text-ink-2">
        <span className="min-w-0 truncate">
          {SITE.address} · {SITE.hours}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <a href={SITE.waze} target="_blank" rel="noopener" className={STRIP_LINK}>
            <Icon name="pin" size={STRIP_ICON} className="shrink-0" />
            ניווט בווייז
          </a>
          <StripDivider />
          <a href={SITE.whatsapp} target="_blank" rel="noopener" className={STRIP_LINK}>
            <Icon name="whatsapp" size={STRIP_ICON} className="shrink-0" />
            וואטסאפ
          </a>
          <StripDivider />
          <a href={SITE.phoneHref} className={STRIP_LINK}>
            <Icon name="phone" size={STRIP_ICON} className="shrink-0" />
            <span dir="ltr">{SITE.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// One text style for every text item in the desktop main row: the stamps menu button, the trade links,
// and the account and cart labels.
const BAR_TEXT = 'text-[15px] font-medium text-ink transition-colors hover:text-blue';

/**
 * Account and cart share this shape: a 44px tap target with a 24px icon, plus a visible label from lg.
 * The display class is left to each use, so a `hidden` there never competes with a display class here.
 */
const BAR_ACTION = `h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 whitespace-nowrap ${BAR_TEXT}`;

function CartLink({ count, className = '' }: { count: number; className?: string }) {
  return (
    <Link href="/cart/" className={`${BAR_ACTION} inline-flex ${className}`} aria-label={`סל קניות (${count})`}>
      {/* The count bubble is placed on the icon, not on the link, so the label beside it does not push it away. */}
      <span className="relative shrink-0">
        <Icon name="cart" size={24} />
        {count > 0 && (
          <span className="absolute -top-2 -left-2.5 grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-blue px-1 text-[11px] font-bold text-white">
            {count}
          </span>
        )}
      </span>
      <span className="hidden lg:inline">סל</span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [mega, setMega] = useState(false);
  const cartCount = useCartCount();
  const overHero = pathname === '/';

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    setDrawer(false);
    setMega(false);
  }, [pathname]);

  if (pathname.startsWith('/designer') || pathname.startsWith('/admin')) return null;

  const solid = scrolled || !overHero || mega;
  return (
    <>
      {/* Desktop: keeps the page below the contact strip (pages already leave room for the main bar, 60px
          from lg and 64px below), like the announcement bar's own spacer. Not on the home page, whose first
          screen sits under the header and leaves room by itself (its top padding is larger than the 94px header). */}
      {!overHero && <div className="hidden h-[34px] lg:block" aria-hidden />}
      <header
        className={`fixed inset-x-0 z-50 transition-all duration-300 ${showAnnouncement(pathname) ? 'top-8' : 'top-0'} ${
          solid ? 'border-b border-line/80 bg-white/80 backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent'
        }`}
      >
        <ContactStrip collapsed={scrolled} />
        <div className="container-x relative flex h-16 items-center gap-2 sm:gap-6 lg:h-[60px]">
          {/* Phones: menu on the right, logo centered, cart on the left. */}
          <button type="button" className="-ms-3 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-surface sm:hidden" aria-label="פתיחת תפריט" aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <Icon name="menu" size={22} />
          </button>
          <Link href="/" aria-label="חותמות תוך 2 דקות – דף הבית" className="min-w-0 shrink text-ink max-sm:absolute max-sm:left-1/2 max-sm:-translate-x-1/2 sm:shrink-0">
            <span className="sm:hidden">
              <Logo size="sm" />
            </span>
            <span className="hidden sm:inline">
              <Logo />
            </span>
          </Link>

          {/* Desktop nav is kept short on purpose: the stamps menu plus direct links for the main trades. The other pages live in the footer.
              Items are separated by equal padding only (12px each side, 24px between labels), no dividers. */}
          <nav aria-label="תפריט ראשי" className="hidden flex-1 items-center lg:flex">
            <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
              <button
                type="button"
                className={`flex items-center gap-1 px-3 py-2 whitespace-nowrap ${BAR_TEXT}`}
                aria-expanded={mega}
                onClick={() => setMega((m) => !m)}
              >
                כל החותמות <Icon name="chevronDown" size={15} />
              </button>
              {mega && (
                <div className="absolute top-full right-0 w-[640px] pt-2">
                  <div className="card grid animate-fade-up grid-cols-3 gap-1 p-3 shadow-lift">
                    {STAMP_MENU.map((m) => (
                      <Link key={m.href} href={m.href} className="rounded-lg px-3 py-2 text-[14px] text-ink-2 hover:bg-surface hover:text-ink">
                        {m.label}
                      </Link>
                    ))}
                    <Link href="/stamps/" className="col-span-3 mt-1 flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-[14px] font-medium">
                      לכל החותמות <Icon name="arrowLeft" size={16} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {TRADE_NAV.map((l) => (
              <Link key={l.href} href={l.href} className={`px-3 py-2 whitespace-nowrap ${BAR_TEXT}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5 lg:gap-2">
            <Link href="/account/" className={`${BAR_ACTION} hidden sm:inline-flex`} aria-label="האזור שלי">
              <Icon name="user" size={24} className="shrink-0" />
              <span className="hidden lg:inline">האזור שלי</span>
            </Link>
            <CartLink count={cartCount} className="max-sm:-me-3" />
            {/* On the home page its own first-screen box is the single action, so the header button is left out there. */}
            {!overHero && (
              <Link href="/designer/" className="btn-primary hidden !px-5 sm:inline-flex lg:!h-11 lg:!px-6 lg:!py-0 lg:!text-[15px] lg:font-bold">
                עצבו חותמת
              </Link>
            )}
            <button type="button" className="hidden h-11 w-11 place-items-center rounded-full hover:bg-surface sm:grid lg:hidden" aria-label="פתיחת תפריט" aria-expanded={drawer} onClick={() => setDrawer(true)}>
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>

        <MobileMenu open={drawer} onClose={() => setDrawer(false)} pathname={pathname} />
      </header>
    </>
  );
}
