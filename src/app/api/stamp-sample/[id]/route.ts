import { BODY_IDS, bodyById } from '@/stamp-bot/bodies';
import { cleanForm } from '@/stamp-bot/form';
import { drawForm } from '@/stamp-bot/draw';
import { SAMPLES, SAMPLE_PAD } from '@/stamp-bot/samples';
import { U } from '@/stamp-bot/draw/kit';

// The sample imprint of one body on the home catalog, drawn by the bot's own engine. The form is fixed, so the SVG is
// made once at build time and served as a file: no request ever runs the engine (or needs its fonts at runtime).
export const dynamic = 'force-static';
export const dynamicParams = false; // an id outside the list is a 404
export const generateStaticParams = () => BODY_IDS.map((id) => ({ id }));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = bodyById(id);
  const sample = SAMPLES[id];
  if (!body || !sample) return new Response('not found', { status: 404 });
  const form = cleanForm({ ...sample, kind: body.kind, size: `${body.w}x${body.h}`, color: 'black', look: '' });
  const d = drawForm(form);
  // The engine's viewBox is the stamp itself (0.1 mm units); a little air around it keeps an edge frame unclipped.
  // The card sizes the <img> from sampleBox(), which uses the same pad.
  const p = SAMPLE_PAD * U;
  const svg = d.svg.replace(/viewBox="0 0 ([\d.]+) ([\d.]+)"/, (_m, w: string, h: string) => `viewBox="${-p} ${-p} ${Number(w) + 2 * p} ${Number(h) + 2 * p}"`);
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
  });
}
