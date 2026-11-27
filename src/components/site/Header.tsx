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
 */
function ContactStrip({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`hidden overflow-hidden bg-surface transition-[height,visibility] duration-300 lg:block ${collapsed ? 'invisible h-0' : 'h-[34px]'}`}>
      <div className="container-x flex h-[34px] items-center justify-between gap-6 text-[12.5px] whitespace-nowrap text-ink-2">
        <div className="flex min-w-0 items-center gap-5">
          <span className="flex items-center gap-1.5">
            <Icon name="pin" size={14} className="shrink-0" />
            {SITE.address} ·{' '}
            <a href={SITE.waze} target="_blank" rel="noopener" className="font-medium text-blue hover:underline">
              ניווט בווייז
            </a>
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="clock" size={14} className="shrink-0" />
            {SITE.hours}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <a href={SITE.whatsapp} target="_blank" rel="noopener" className="flex items-center gap-1.5 hover:text-ink">
            <Icon name="whatsapp" size={14} className="shrink-0" />
            וואטסאפ
          </a>
          <a href={SITE.phoneHref} className="flex items-center gap-1.5 font-medium text-ink">
            <Icon name="phone" size={14} className="shrink-0" />
            <span dir="ltr">{SITE.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function CartLink({ count, className = '' }: { count: number; className?: string }) {
  return (
    <Link href="/cart/" className={`btn-ghost relative !px-3 ${className}`} aria-label={`סל קניות (${count})`}>
      <Icon name="cart" size={20} />
      {count > 0 && (
        <span className="absolute -top-0.5 -left-0.5 grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-blue px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
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
      {/* Desktop: keeps the page below the contact strip (pages already leave room for the 64px main bar),
          like the announcement bar's own spacer. Not on the home page, whose first screen sits under the
          header and leaves room by itself (its top padding is larger than the 98px header). */}
      {!overHero && <div className="hidden h-[34px] lg:block" aria-hidden />}
      <header
        className={`fixed inset-x-0 z-50 transition-all duration-300 ${showAnnouncement(pathname) ? 'top-8' : 'top-0'} ${
          solid ? 'border-b border-line/80 bg-white/80 backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent'
        }`}
      >
        <ContactStrip collapsed={scrolled} />
        <div className="container-x relative flex h-16 items-center gap-2 sm:gap-6">
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

          {/* Desktop nav is kept short on purpose: the stamps menu plus direct links for the main trades. The other pages live in the footer. */}
          <nav aria-label="תפריט ראשי" className="hidden flex-1 items-center gap-0.5 lg:flex">
            <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2.5 py-2 text-[15.5px] font-medium whitespace-nowrap text-ink-2 hover:text-ink"
                aria-expanded={mega}
                onClick={() => setMega((m) => !m)}
              >
                חותמות <Icon name="chevronDown" size={15} />
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
            <span className="mx-1.5 h-[18px] w-px shrink-0 bg-line" aria-hidden />
            {TRADE_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-full px-2.5 py-2 text-[15.5px] font-medium whitespace-nowrap text-ink-2 hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <Link href="/account/" className="btn-ghost hidden !px-3 sm:inline-flex" aria-label="האזור שלי">
              <Icon name="user" size={19} />
              <span className="hidden 2xl:inline">האזור שלי</span>
            </Link>
            <CartLink count={cartCount} className="max-sm:-me-3" />
            {/* On the home page its own first-screen box is the single action, so the header button is left out there. */}
            {!overHero && (
              <Link href="/designer/" className="btn-primary hidden !px-5 sm:inline-flex lg:!h-12 lg:!px-6 lg:!text-base lg:font-bold">
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
