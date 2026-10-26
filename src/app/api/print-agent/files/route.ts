import { eligibleForPrintBridge, printAgentAuthorized } from '@/server/print-agent';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!printAgentAuthorized(req)) return new Response('unauthorized', { status: 401 });
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId') ?? '';
  const indexRaw = url.searchParams.get('itemIndex') ?? '';
  const version = url.searchParams.get('version') ?? '';
  const itemIndex = Number(indexRaw);
  if (!/^ORD-[A-Za-z0-9-]{5,64}$/.test(orderId) ||
      !/^\d{1,3}$/.test(indexRaw) || !Number.isSafeInteger(itemIndex) ||
      !version || version.length > 80) return new Response('bad request', { status: 400 });
  const store = getStore();
  if (!store.durable) return new Response('durable order store required', { status: 503 });
  try {
    const order = await store.getOrder(orderId);
    if (!order || !eligibleForPrintBridge(order)) return new Response('not found', { status: 404 });
    const item = order.items[itemIndex];
    if (!item || !item.preflight.ready || item.designVersionId !== version) return new Response('not found', { status: 404 });
    const ref = item.files.find((f) => f.kind === 'production-pdf' && f.path.startsWith(order.id + '/') && f.name.toLowerCase().endsWith('.pdf'));
    if (!ref) return new Response('not found', { status: 404 });
    const file = await store.getFile(ref.path);
    if (!file || Buffer.from(file.data).subarray(0, 5).toString('ascii') !== '%PDF-') return new Response('file unavailable', { status: 503 });
    return new Response(file.data as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="stamp-production.pdf"',
        'Content-Length': String(file.data.byteLength),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[print-agent/files]', error);
    return new Response('file unavailable', { status: 503 });
  }
}
