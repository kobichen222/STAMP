'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/Logo';
import { useCartCount } from '@/lib/cart-store';
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
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
  }, [drawer]);

  if (pathname.startsWith('/designer') || pathname.startsWith('/admin')) return null;

  const solid = scrolled || !overHero || mega;
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? 'border-b border-line/80 bg-white/80 backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent'
      }`}
    >
      <div className="container-x flex h-16 items-center gap-6">
        <Link href="/" aria-label="Stamp2Go – דף הבית" className="shrink-0 text-ink">
          <Logo />
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

        <div className="ms-auto flex items-center gap-1.5">
          <Link href="/account/" className="btn-ghost hidden !px-3 sm:inline-flex" aria-label="האזור שלי">
            <Icon name="user" size={19} />
            <span className="hidden xl:inline">האזור שלי</span>
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
          <button type="button" className="btn-ghost !px-2.5 xl:hidden" aria-label="פתיחת תפריט" aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <Icon name="menu" size={22} />
          </button>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="תפריט">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm animate-fade-up flex-col bg-white shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <Logo />
              <button type="button" className="btn-ghost !px-2" aria-label="סגירה" onClick={() => setDrawer(false)}>
                <Icon name="close" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="תפריט מובייל">
              {[{ label: 'ראשי', href: '/' }, { label: 'כל החותמות', href: '/stamps/' }, ...MAIN_NAV, { label: 'האזור שלי', href: '/account/' }].map((m) => (
                <Link key={m.href} href={m.href} className="block rounded-xl px-3 py-3 text-[17px] font-medium hover:bg-surface">
                  {m.label}
                </Link>
              ))}
              <p className="mt-4 px-3 text-xs font-semibold text-muted">סוגי חותמות</p>
              <div className="mt-2 flex flex-wrap gap-2 px-3">
                {STAMP_MENU.filter((m) => m.featured).map((m) => (
                  <Link key={m.href} href={m.href} className="chip">
                    {m.label}
                  </Link>
                ))}
              </div>
            </nav>
            <div className="border-t border-line p-4">
              <Link href="/designer/" className="btn-primary btn-lg w-full">
                עיצוב חותמת עכשיו
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
