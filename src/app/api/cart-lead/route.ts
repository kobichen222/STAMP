import { after, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCart, saveCart, sweepAbandoned } from '@/server/abandoned';
import { rateLimit } from '@/server/rate-limit';

const schema = z.object({
  id: z.string().regex(/^[\w-]{16,64}$/),
  email: z.string().trim().email().max(160),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  total: z.number().min(0).max(1e6).optional(),
  items: z
    .array(
      z.object({
        productSlug: z.string().max(200).optional(),
        productName: z.string().max(200),
        modelId: z.string().max(100),
        size: z.string().max(60),
        design: z.unknown(),
        ink: z.string().max(20),
        bodyColor: z.string().max(40).optional(),
        quantity: z.number().int().min(1).max(999),
        unitPrice: z.number().nullable(),
        addons: z.record(z.string(), z.number()).optional(),
        previewSvg: z.string().max(80_000).optional(),
      }),
    )
    .min(1)
    .max(30),
});

/** Checkout saves the cart once an e-mail is typed (for the 20-minute reminder). */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`cart-lead:${ip}`, 20, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  const text = await req.text();
  if (text.length > 400_000) return NextResponse.json({ ok: false }, { status: 413 });
  const parsed = schema.safeParse(JSON.parse(text || 'null'));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  await saveCart(parsed.data).catch((e) => console.error('[abandoned] save', e));
  after(() => sweepAbandoned().catch((e) => console.error('[abandoned] sweep', e)));
  return NextResponse.json({ ok: true });
}

/** The reminder's link: the saved cart, to put back in the browser. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('c') ?? '';
  const items = await getCart(id).catch(() => null);
  if (!items) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'private, no-store' } });
}
