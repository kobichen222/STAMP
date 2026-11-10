import { getStore } from '@/server/store';

/** Authenticated download of production files (private storage – spec §195). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams.get('path') ?? '';
  if (!/^ORD-[\w-]+\/[^/]+$/.test(p)) return new Response('bad path', { status: 400 });
  const file = await getStore().getFile(p);
  if (!file) return new Response('not found', { status: 404 });
  const name = p.split('/')[1];
  const inline = url.searchParams.get('inline') === '1';
  return new Response(file.data as unknown as BodyInit, {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,
      // Versioned links (?v=design version) – safe to keep in the browser; makes order lists instant.
      'Cache-Control': url.searchParams.has('v') ? 'private, max-age=86400' : 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
