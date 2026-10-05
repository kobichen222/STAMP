import { exportDesign } from '@/server/production-engine';
import { getStore } from '@/server/store';

/** Staff download: order item → any production format (?format=dxf|ai|…|zip&mirror=0|1). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('order') ?? '';
  const index = Number(url.searchParams.get('item') ?? '0');
  const format = (url.searchParams.get('format') ?? 'pdf').toLowerCase();
  if (!/^ORD-[\w-]+$/.test(id) || !Number.isInteger(index) || index < 0) return new Response('bad request', { status: 400 });
  const order = await getStore().getOrder(id);
  const item = order?.items[index];
  if (!order || !item) return new Response('not found', { status: 404 });
  const mirrorParam = url.searchParams.get('mirror');
  const mirror = mirrorParam == null ? item.mirror : mirrorParam === '1';
  try {
    const out = await exportDesign(item.design, format, mirror, {
      orderId: order.id,
      customer: order.customer.company || order.customer.name,
      productName: item.productName,
      ink: item.ink,
      quantity: item.quantity,
      index,
    });
    const body = typeof out.data === 'string' ? new TextEncoder().encode(out.data) : out.data;
    return new Response(body as unknown as BodyInit, {
      headers: {
        'Content-Type': out.mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(out.name)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(out.omittedImages ? { 'X-Stamp-Omitted-Images': String(out.omittedImages) } : {}),
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(e instanceof Error && e.message === 'unknown format' ? 'unknown format' : 'export failed', { status: 400 });
  }
}
