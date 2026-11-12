import { buildReport, resolveRange } from '@/lib/reports';
import { requireStaff } from '@/server/staff';
import { getStore } from '@/server/store';
import { ReportsDashboard } from './ReportsDashboard';

export const metadata = { title: 'דוחות' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; days?: string; from?: string; to?: string }> }) {
  await requireStaff(['admin']);
  const sp = await searchParams;
  const all = await getStore().listOrders({ limit: 5000 });
  return <ReportsDashboard report={buildReport(all, resolveRange(sp, all))} />;
}
