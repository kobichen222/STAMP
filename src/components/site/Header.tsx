'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/Logo';
import { useCartCount } from '@/lib/cart-store';
import { MobileMenu } from './MobileMenu';
import { MAIN_NAV, STAMP_MENU } from './nav';

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
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? 'border-b border-line/80 bg-white/80 backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent'
      }`}
    >
      <div className="container-x flex h-16 items-center gap-2 sm:gap-6">
        <Link href="/" aria-label="חותמות 2 דקות – דף הבית" className="min-w-0 shrink text-ink">
          <span className="sm:hidden">
            <Logo size="sm" />
          </span>
          <span className="hidden sm:inline">
            <Logo />
          </span>
        </Link>

        <nav aria-label="תפריט ראשי" className="hidden flex-1 items-center gap-0.5 xl:flex">
          <Link href="/" className="rounded-full px-2.5 py-2 text-[14.5px] text-ink-2 hover:text-ink">
            ראשי
          </Link>
          <div className="relative" onMouseEnter={() => setMega(true)} onMouseLeave={() => setMega(false)}>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full px-2.5 py-2 text-[14.5px] whitespace-nowrap text-ink-2 hover:text-ink"
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
          {MAIN_NAV.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`rounded-full px-2.5 py-2 text-[14.5px] whitespace-nowrap hover:text-ink ${pathname.startsWith(m.href) ? 'text-ink font-medium' : 'text-ink-2'}`}
            >
              {m.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          <Link href="/account/" className="btn-ghost hidden !px-3 sm:inline-flex" aria-label="האזור שלי">
            <Icon name="user" size={19} />
            <span className="hidden 2xl:inline">האזור שלי</span>
          </Link>
          <Link href="/cart/" className="btn-ghost relative !px-3" aria-label={`סל קניות (${cartCount})`}>
            <Icon name="cart" size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -left-0.5 grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-blue px-1 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/designer/" className="btn-primary hidden sm:inline-flex">
            עיצוב חותמת
          </Link>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface xl:hidden" aria-label="פתיחת תפריט" aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <Icon name="menu" size={22} />
          </button>
        </div>
      </div>

      <MobileMenu open={drawer} onClose={() => setDrawer(false)} pathname={pathname} cartCount={cartCount} />
    </header>
  );
}
