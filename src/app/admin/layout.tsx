import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { currentRole } from '@/server/staff';

export const metadata: Metadata = { title: { default: 'ניהול', template: '%s | ניהול Stamp2Go' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await currentRole();
  if (!role) return <>{children}</>;
  const nav = [
    { href: '/admin/', label: 'לוח בקרה', icon: 'grid', roles: ['admin'] },
    { href: '/admin/orders/', label: 'הזמנות', icon: 'file', roles: ['admin'] },
    { href: '/admin/production/', label: 'תור ייצור', icon: 'layers3d', roles: ['admin', 'production'] },
    { href: '/admin/customers/', label: 'לקוחות', icon: 'user', roles: ['admin'] },
    { href: '/admin/leads/', label: 'פניות', icon: 'phone', roles: ['admin'] },
    { href: '/admin/products/', label: 'מוצרים', icon: 'store', roles: ['admin'] },
    { href: '/admin/pricing/', label: 'תמחור', icon: 'cart', roles: ['admin'] },
    { href: '/admin/coupons/', label: 'קופונים', icon: 'star', roles: ['admin'] },
    { href: '/admin/reports/', label: 'דוחות', icon: 'layers', roles: ['admin'] },
    { href: '/admin/settings/', label: 'הגדרות', icon: 'settings', roles: ['admin'] },
  ].filter((n) => n.roles.includes(role));
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/admin/">
            <Logo size="sm" />
          </Link>
          <nav className="-mx-1 flex min-w-0 flex-1 gap-0.5 overflow-x-auto px-1 [scrollbar-width:none]" aria-label="ניהול">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm whitespace-nowrap hover:bg-surface">
                <Icon name={n.icon} size={16} /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex shrink-0 items-center gap-3 text-sm text-muted">
            {role === 'admin' ? 'מנהל' : 'ייצור'}
            <a href="/admin/logout" className="btn-ghost btn-sm">
              יציאה
            </a>
          </div>
        </div>
      </header>
      <div className="px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
