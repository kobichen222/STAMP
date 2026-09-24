import { loadOrder, verifyToken } from '@/server/orders/service';
import { getStore } from '@/server/store';
import { INK_COLORS } from '@/designer/types';

/** Customer proof image for an order item (?t=token&i=1), shown in the ink colour, never mirrored. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const o = await loadOrder(id);
  if (!verifyToken(o, url.searchParams.get('t'))) return new Response('not found', { status: 404 });
  const item = o!.items[Math.max(0, Number(url.searchParams.get('i') || 1) - 1)];
  const master = item?.files.find((f) => f.kind === 'master-svg');
  const file = master && (await getStore().getFile(master.path));
  if (!file) return new Response('not found', { status: 404 });
  const svg = new TextDecoder()
    .decode(file.data)
    .replace(/<metadata[\s\S]*?<\/metadata>/, '')
    .replace('fill="#000000"', `fill="${INK_COLORS[item.ink]?.hex ?? '#000'}"`);
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=300', 'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'" } });
}
