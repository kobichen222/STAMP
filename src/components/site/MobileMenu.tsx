'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';
import { CATEGORIES } from '@/lib/categories';

const ICON_FOR: Record<string, string> = {
  business: 'store',
  personal: 'user',
  doctors: 'shield',
  lawyers: 'file',
  company: 'layers',
  round: 'circle',
  date: 'clock',
  numbering: 'grid',
  logo: 'image',
  signature: 'text',
  large: 'fit',
  pocket: 'square',
};

const MAIN = [
  { label: 'ראשי', href: '/', icon: 'store' },
  { label: 'כל החותמות', href: '/stamps/', icon: 'grid' },
  { label: 'תבניות', href: '/templates/', icon: 'template' },
  { label: 'דוגמאות', href: '/examples/', icon: 'image' },
  { label: 'איך זה עובד', href: '/how-it-works/', icon: 'sparkles' },
  { label: 'שאלות נפוצות', href: '/faq/', icon: 'help' },
  { label: 'אודות', href: '/about/', icon: 'info' },
  { label: 'צור קשר', href: '/contact/', icon: 'mail' },
];

/**
 * Full-screen mobile drawer. Rendered in a portal on <body> so it is never
 * clipped by the header (whose backdrop-filter creates a containing block).
 */
export function MobileMenu({ open, onClose, pathname, cartCount }: { open: boolean; onClose: () => void; pathname: string; cartCount: number }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [stampsOpen, setStampsOpen] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Enter / exit animation + scroll lock + focus management.
  useEffect(() => {
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement;
      const y = window.scrollY;
      document.body.style.cssText = `position:fixed;top:-${y}px;left:0;right:0;overflow:hidden`;
      requestAnimationFrame(() => {
        setVisible(true);
        panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      });
      return () => {
        document.body.style.cssText = '';
        window.scrollTo(0, y);
        lastFocus.current?.focus?.();
      };
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const featured = CATEGORIES.filter((c) => c.featured);

  return createPortal(
    <div className="fixed inset-0 z-[90] xl:hidden" role="dialog" aria-modal="true" aria-label="תפריט ניווט" dir="rtl">
      <div className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div
        ref={panelRef}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-lift transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <Link href="/" onClick={onClose} aria-label="דף הבית">
            <Logo size="sm" />
          </Link>
          <button type="button" data-autofocus className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface" aria-label="סגירת התפריט" onClick={onClose}>
            <Icon name="close" size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-6" aria-label="תפריט מובייל">
          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { href: SITE.phoneHref, icon: 'phone', label: 'חיוג' },
              { href: SITE.whatsapp, icon: 'whatsapp', label: 'וואטסאפ', external: true },
              { href: '/cart/', icon: 'cart', label: cartCount ? `סל (${cartCount})` : 'סל' },
              { href: '/account/', icon: 'user', label: 'האזור שלי' },
            ].map((q) =>
              q.href.startsWith('/') ? (
                <Link key={q.label} href={q.href} onClick={onClose} className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface py-3 text-xs font-medium active:scale-95">
                  <Icon name={q.icon} size={22} className="text-blue" />
                  {q.label}
                </Link>
              ) : (
                <a key={q.label} href={q.href} {...(q.external ? { target: '_blank', rel: 'noopener' } : {})} className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface py-3 text-xs font-medium active:scale-95">
                  <Icon name={q.icon} size={22} className="text-blue" />
                  {q.label}
                </a>
              ),
            )}
          </div>

          {/* Stamps accordion */}
          <div className="mt-4 rounded-2xl border border-line">
            <button
              type="button"
              aria-expanded={stampsOpen}
              aria-controls="mm-stamps"
              onClick={() => setStampsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-[17px] font-semibold"
            >
              סוגי חותמות
              <Icon name="chevronDown" size={20} className={`transition-transform duration-300 ${stampsOpen ? 'rotate-180' : ''}`} />
            </button>
            <div id="mm-stamps" className={`grid transition-[grid-template-rows] duration-300 ${stampsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  {featured.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/stamps/${c.slug}/`}
                      onClick={onClose}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[14px] active:scale-[0.98] ${active(`/stamps/${c.slug}/`) ? 'bg-blue-50 font-semibold text-blue' : 'bg-surface text-ink-2'}`}
                    >
                      <Icon name={ICON_FOR[c.slug] ?? 'star'} size={17} className="shrink-0 text-blue" />
                      <span className="truncate">{c.short}</span>
                    </Link>
                  ))}
                </div>
                <Link href="/stamps/" onClick={onClose} className="mx-3 mb-3 flex items-center justify-between rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white">
                  לכל {CATEGORIES.length} סוגי החותמות
                  <Icon name="arrowLeft" size={16} />
                </Link>
              </div>
            </div>
          </div>

          {/* Main links */}
          <ul className="mt-3">
            {MAIN.map((m) => (
              <li key={m.href}>
                <Link
                  href={m.href}
                  onClick={onClose}
                  aria-current={active(m.href) ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-[17px] ${active(m.href) ? 'bg-blue-50 font-semibold text-blue' : 'font-medium text-ink hover:bg-surface'}`}
                >
                  <Icon name={m.icon} size={20} className={active(m.href) ? 'text-blue' : 'text-muted'} />
                  {m.label}
                  <Icon name="chevronLeft" size={16} className="ms-auto text-muted" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-2xl bg-surface p-4 text-sm text-muted">
            <p className="font-semibold text-ink">הסטודיו ברמת גן</p>
            <p className="mt-1">{SITE.address} · א׳–ה׳ 09:00–17:00</p>
            <a href={SITE.phoneHref} className="mt-1 inline-block font-medium text-blue" dir="ltr">
              {SITE.phone}
            </a>
          </div>
        </nav>

        <div className="shrink-0 border-t border-line bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link href="/designer/" onClick={onClose} className="btn-primary btn-lg w-full">
            <Icon name="sparkles" size={20} /> עיצוב חותמת עכשיו
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
