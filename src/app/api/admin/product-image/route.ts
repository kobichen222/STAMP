import { NextResponse } from 'next/server';
import { site } from '@/lib/content';
import { requireStaff } from '@/server/staff';
import { getStore } from '@/server/store';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' };
const MAX = 3 * 1024 * 1024;

/** Uploads a replacement product photo. The product starts using it once the products page is saved. */
export async function POST(req: Request) {
  try {
    await requireStaff(['admin']);
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const slug = String(form?.get('slug') ?? '');
  const product = site.products.find((p) => p.slug === slug);
  if (!product || !(file instanceof File)) return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'אפשר להעלות תמונת JPG, PNG או WebP' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'התמונה גדולה מדי (עד 3MB)' }, { status: 400 });
  // A new name per upload, so browsers and the CDN can cache each picture forever.
  const name = `p${product.id}-${Date.now().toString(36)}.${ext}`;
  await getStore().putFile(`product-images/${name}`, new Uint8Array(await file.arrayBuffer()), file.type);
  return NextResponse.json({ url: `/api/product-image/${name}` });
}
