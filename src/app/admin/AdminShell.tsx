'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';

type Role = 'admin' | 'production';
export interface AdminBadges {
  production?: number;
  leads?: number;
  errors?: number;
  unpaid?: number;
}

interface Item {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  badge?: keyof AdminBadges;
}

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'עבודה יומית',
    items: [
      { href: '/admin/', label: 'לוח בקרה', icon: 'grid', roles: ['admin'] },
      { href: '/admin/orders/', label: 'הזמנות', icon: 'file', roles: ['admin'], badge: 'errors' },
      { href: '/admin/production/', label: 'תור ייצור', icon: 'layers3d', roles: ['admin', 'production'], badge: 'production' },
      { href: '/admin/print-station/', label: 'תחנת הדפסה', icon: 'file', roles: ['admin', 'production'] },
      { href: '/admin/leads/', label: 'פניות', icon: 'phone', roles: ['admin'], badge: 'leads' },
    ],
  },
  {
    title: 'לקוחות ושיווק',
    items: [
      { href: '/admin/customers/', label: 'לקוחות', icon: 'user', roles: ['admin'] },
      { href: '/admin/coupons/', label: 'קופונים', icon: 'star', roles: ['admin'] },
      { href: '/admin/reports/', label: 'דוחות', icon: 'layers', roles: ['admin'] },
    ],
  },
  {
    title: 'חנות',
    items: [
      { href: '/admin/products/', label: 'מוצרים', icon: 'store', roles: ['admin'] },
      { href: '/admin/pricing/', label: 'תמחור ומשלוחים', icon: 'cart', roles: ['admin'] },
      { href: '/admin/settings/', label: 'הגדרות אתר', icon: 'settings', roles: ['admin'] },
    ],
  },
];

const TABS: Item[] = [
  { href: '/admin/', label: 'בקרה', icon: 'grid', roles: ['admin'] },
  { href: '/admin/orders/', label: 'הזמנות', icon: 'file', roles: ['admin'], badge: 'errors' },
  { href: '/admin/production/', label: 'ייצור', icon: 'layers3d', roles: ['admin', 'production'], badge: 'production' },
  { href: '/admin/leads/', label: 'פניות', icon: 'phone', roles: ['admin'], badge: 'leads' },
];

const isActive = (path: string, href: string) => (href === '/admin/' ? path === '/admin' || path === '/admin/' : path.startsWith(href.replace(/\/$/, '')));

function Badge({ n, tone = 'bg-blue' }: { n?: number; tone?: string }) {
  if (!n) return null;
  return <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white ${tone}`}>{n > 99 ? '99+' : n}</span>;
}

function NavLink({ item, path, badges, onNavigate }: { item: Item; path: string; badges: AdminBadges; onNavigate?: () => void }) {
  const on = isActive(path, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={on ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition ${on ? 'bg-blue text-white shadow-[0_8px_20px_-10px_rgba(36,87,255,.9)]' : 'text-ink-2 hover:bg-surface'}`}
    >
      <Icon name={item.icon} size={19} />
      <span className="flex-1 font-medium">{item.label}</span>
      {item.badge && <Badge n={badges[item.badge]} tone={on ? 'bg-white/25' : item.badge === 'errors' ? 'bg-bad' : 'bg-blue'} />}
    </Link>
  );
}

function NavBody({ role, badges, path, onNavigate }: { role: Role; badges: AdminBadges; path: string; onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="ניהול">
        {GROUPS.map((g) => {
          const items = g.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.title}>
              <p className="px-3 pb-1.5 text-[11px] font-bold tracking-wide text-muted">{g.title}</p>
              <div className="space-y-0.5">
                {items.map((i) => (
                  <NavLink key={i.href} item={i} path={path} badges={badges} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
        <div>
          <p className="px-3 pb-1.5 text-[11px] font-bold tracking-wide text-muted">קיצורים</p>
          <div className="space-y-0.5">
            {role === 'admin' && (
              <a href="/designer/?new=1" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink-2 hover:bg-surface">
                <Icon name="plus" size={19} /> הזמנה טלפונית (עורך)
              </a>
            )}
            <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink-2 hover:bg-surface">
              <Icon name="eye" size={19} /> צפייה באתר
            </a>
          </div>
        </div>
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue">
            <Icon name="user" size={18} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-sm font-bold">{role === 'admin' ? 'מנהל' : 'צוות ייצור'}</span>
            <span className="block text-xs text-muted">מחובר</span>
          </span>
          <a href="/admin/logout" className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-bad hover:bg-bad/10">
            יציאה
          </a>
        </div>
      </div>
    </>
  );
}

/**
 * Admin frame: a grouped sidebar on desktop; on phones a top bar with a
 * full menu drawer plus a bottom tab bar for the daily screens.
 */
export function AdminShell({ role, badges, children }: { role: Role; badges: AdminBadges; children: React.ReactNode }) {
  const path = usePathname() ?? '/admin/';
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  const all = GROUPS.flatMap((g) => g.items);
  const current = all.find((i) => isActive(path, i.href));
  const tabs = TABS.filter((t) => t.roles.includes(role));

  return (
    <div className="admin-shell min-h-dvh bg-surface lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-l border-line bg-white lg:flex">
        <Link href="/admin/" className="flex h-16 shrink-0 items-center border-b border-line px-5">
          <Logo size="sm" />
        </Link>
        <NavBody role={role} badges={badges} path={path} />
      </aside>

      <div className="min-w-0">
        {/* Phone / tablet top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-white/95 px-2 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-surface" aria-label="תפריט ניהול" aria-expanded={open}>
            <Icon name="menu" size={22} />
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-base font-bold">{current?.label ?? 'ניהול'}</p>
          {role === 'admin' ? (
            <a href="/designer/?new=1" target="_blank" rel="noopener" className="grid h-11 w-11 place-items-center rounded-xl text-blue hover:bg-blue-50" aria-label="הזמנה טלפונית">
              <Icon name="plus" size={22} />
            </a>
          ) : (
            <span className="w-11" />
          )}
        </header>

        <main className="px-3 pt-4 pb-28 sm:px-6 sm:pt-6 lg:pb-10">{children}</main>
      </div>

      {/* Phone drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="תפריט ניהול">
          <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" aria-label="סגירה" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-[320px] animate-fade-up flex-col bg-white shadow-lift">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
              <Logo size="sm" />
              <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-surface" aria-label="סגירת התפריט">
                <Icon name="close" size={20} />
              </button>
            </div>
            <NavBody role={role} badges={badges} path={path} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Phone bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, 1fr)` }} aria-label="ניווט מהיר">
        {tabs.map((t) => {
          const on = isActive(path, t.href);
          return (
            <Link key={t.href} href={t.href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${on ? 'font-bold text-blue' : 'text-ink-2'}`}>
              {on && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-blue" />}
              <span className="relative">
                <Icon name={t.icon} size={22} />
                {t.badge && !!badges[t.badge] && (
                  <span className={`absolute -top-1.5 -left-2.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white ${t.badge === 'errors' ? 'bg-bad' : 'bg-blue'}`}>{badges[t.badge]}</span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-ink-2">
          <Icon name="menu" size={22} />
          עוד
        </button>
      </nav>
    </div>
  );
}
