import { NextResponse } from 'next/server';
import { eligibleForPrintBridge, printAgentAuthorized } from '@/server/print-agent';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Read-only queue for ONE locally installed bridge. These routes do not expose
 * customer details and cannot be used to change order or printer state.
 */
export async function GET(req: Request) {
  if (!printAgentAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const store = getStore();
  if (!store.durable) {
    return NextResponse.json({ error: 'durable order store required' }, { status: 503 });
  }
  const parsed = Number(new URL(req.url).searchParams.get('limit') ?? 30);
  const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(100, Math.floor(parsed))) : 30;
  try {
    // Current store implementations have no pagination; fetch up to 2,000 and
    // select oldest first to reduce starvation under ordinary shop workloads.
    const orders = await store.listOrders({ status: ['READY_FOR_PRODUCTION'], limit: 2000 });
    const jobs = orders
      .filter(eligibleForPrintBridge)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .flatMap((order) =>
        order.items.flatMap((item, itemIndex) => {
          const pdf = item.files.find((f) => f.kind === 'production-pdf' && f.path.startsWith(order.id + '/'));
          if (!item.preflight.ready || !pdf || !item.designVersionId) return [];
          return [{
            jobId: `${order.id}:${itemIndex}:${item.designVersionId}`,
            orderId: order.id,
            itemIndex,
            designVersionId: item.designVersionId,
            filename: pdf.name,
            quantity: item.quantity,
            widthMm: item.width,
            heightMm: item.height,
            mirror: item.mirror,
            profileId: item.profileId,
            fileUrl: `/api/print-agent/files/?orderId=${encodeURIComponent(order.id)}&itemIndex=${itemIndex}&version=${encodeURIComponent(item.designVersionId)}`,
          }];
        }),
      )
      .slice(0, limit);
    return NextResponse.json({ jobs, mode: 'read-only', store: store.kind }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[print-agent/jobs]', error);
    return NextResponse.json({ error: 'queue unavailable' }, { status: 503 });
  }
}
