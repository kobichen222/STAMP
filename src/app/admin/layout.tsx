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
    { href: '/admin/', label: 'Dashboard', icon: 'grid', roles: ['admin'] },
    { href: '/admin/orders/', label: 'הזמנות', icon: 'file', roles: ['admin'] },
    { href: '/admin/production/', label: 'תור ייצור', icon: 'layers3d', roles: ['admin', 'production'] },
  ].filter((n) => n.roles.includes(role));
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="flex h-14 items-center gap-6 px-4">
          <Link href="/admin/">
            <Logo />
          </Link>
          <nav className="flex gap-1">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-surface">
                <Icon name={n.icon} size={16} /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-3 text-sm text-muted">
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
