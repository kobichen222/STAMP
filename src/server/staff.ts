import 'server-only';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminToken, type StaffRole } from './admin-auth';

/** Defense in depth for server actions (middleware already guards the routes). */
export async function requireStaff(roles: StaffRole[] = ['admin']): Promise<StaffRole> {
  const role = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!role || !roles.includes(role)) throw new Error('unauthorized');
  return role;
}

export async function currentRole(): Promise<StaffRole | null> {
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}
