import type { Metadata } from 'next';
import { currentRole } from '@/server/staff';
import { getStore } from '@/server/store';
import { listContacts } from '@/server/store/neon';
import { AdminShell, type AdminBadges } from './AdminShell';

export const metadata: Metadata = { title: { default: 'ניהול', template: '%s | ניהול Stamp2Go' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Small counters for the menu – never block the page if they fail. */
async function badges(role: string): Promise<AdminBadges> {
  try {
    const orders = await getStore().listOrders({ limit: 300 });
    const b: AdminBadges = {
      production: orders.filter((o) => o.status === 'READY_FOR_PRODUCTION' || o.status === 'IN_PRODUCTION').length,
      errors: orders.filter((o) => o.status === 'PRODUCTION_FILE_ERROR').length,
    };
    if (role === 'admin') b.leads = (await listContacts(300).catch(() => [])).filter((l) => !l.handled).length;
    return b;
  } catch {
    return {};
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await currentRole();
  if (!role) return <>{children}</>;
  return (
    <AdminShell role={role} badges={await badges(role)}>
      {children}
    </AdminShell>
  );
}
