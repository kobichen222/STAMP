import { getStore } from '@/server/store';

export const runtime = 'nodejs';

/** Public: a product photo that was replaced from the admin. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^p\d+-[a-z0-9]+\.(webp|png|jpg)$/.test(name)) return new Response('not found', { status: 404 });
  const file = await getStore().getFile(`product-images/${name}`);
  if (!file) return new Response('not found', { status: 404 });
  return new Response(file.data as unknown as BodyInit, {
    headers: { 'Content-Type': file.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
