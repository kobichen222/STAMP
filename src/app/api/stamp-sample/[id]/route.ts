import { BODY_IDS } from '@/stamp-bot/bodies';
import { sampleSvg } from '@/stamp-bot/sample-svg';

// The sample imprint of one body on the home catalog, drawn by the bot's own engine. The form is fixed, so the SVG is
// made once at build time and served as a file. The card asks for it with ?v=<fingerprint of the drawing>
// (sampleVersion), so the long cache below never shows an old drawing.
export const dynamic = 'force-static';
export const dynamicParams = false; // an id outside the list is a 404
export const generateStaticParams = () => BODY_IDS.map((id) => ({ id }));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svg = sampleSvg(id);
  if (!svg) return new Response('not found', { status: 404 });
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}
