import { csv, csvResponse } from '@/server/csv';
import { requireStaff } from '@/server/staff';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  await requireStaff(['admin']);
  const orders = await getStore().listOrders({ limit: 5000 });
  const map = new Map<string, { name: string; phone: string; email?: string; company?: string; count: number; total: number; last: string }>();
  for (const o of orders) {
    const key = o.customer.phone.replace(/\D/g, '').slice(-9) || o.id;
    const r = map.get(key) ?? { name: o.customer.name, phone: o.customer.phone, email: o.customer.email, company: o.customer.company, count: 0, total: 0, last: o.createdAt };
    r.count++;
    if (o.status !== 'CANCELLED') r.total += o.total;
    if (o.createdAt >= r.last) Object.assign(r, { last: o.createdAt, name: o.customer.name, email: o.customer.email ?? r.email });
    map.set(key, r);
  }
  const rows = [
    ['שם', 'טלפון', 'אימייל', 'חברה', 'מספר הזמנות', 'סה״כ ₪', 'הזמנה אחרונה'],
    ...[...map.values()].map((r) => [r.name, r.phone, r.email, r.company, r.count, Math.round(r.total), new Date(r.last).toLocaleDateString('he-IL')]),
  ];
  return csvResponse(csv(rows), `customers-${new Date().toISOString().slice(0, 10)}.csv`);
}
