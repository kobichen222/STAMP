import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FONT_FAMILIES, faceKey, loadFace, type FontFace } from '@/designer/fonts';
import { buildProductionBundle, productionBaseName, type ProductionBundle } from '@/designer/production';
import { profileForModel } from '@/designer/profiles';
import { renderDesign, type FaceResolver } from '@/designer/render';
import type { Design } from '@/designer/types';
import { isProductionReady, preflightScore, validateDesign } from '@/designer/validate';

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts', 'stamp');

const fsLoader = async (url: string) => {
  const buf = await fs.readFile(path.join(FONT_DIR, path.basename(url)));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

async function resolverFor(design: Design): Promise<FaceResolver> {
  const faces = new Map<string, FontFace>();
  const wanted = new Set<string>(['heebo|0']);
  for (const e of design.elements) if (e.type === 'text') wanted.add(`${e.font}|${e.bold ? 1 : 0}`);
  for (const w of wanted) {
    const [font, b] = w.split('|');
    if (!FONT_FAMILIES.some((f) => f.id === font)) continue;
    faces.set(faceKey(font, b === '1'), await loadFace(font, b === '1', fsLoader));
  }
  return (font, bold) => faces.get(faceKey(font, bold));
}

export interface EngineResult {
  bundle: ProductionBundle;
  preflight: { ready: boolean; score: number; errors: string[]; warnings: string[] };
  profile: ReturnType<typeof profileForModel>;
}

/**
 * Server-side Production Engine: the design JSON is re-rendered here with the
 * same code as the browser, so production files never depend on what the
 * client uploaded. Deterministic for a given design + profile.
 */
export async function runProductionEngine(
  design: Design,
  meta: { orderId: string; customer: string; productName: string; productId?: string; ink: string; quantity: number; designVersion: string },
): Promise<EngineResult> {
  const resolve = await resolverFor(design);
  const render = renderDesign(design, resolve);
  const profile = profileForModel({ shape: design.shape, width: design.width, height: design.height, dateBand: design.dateBand });
  const issues = validateDesign(design, render, profile);
  const names = Object.fromEntries(
    design.elements.map((e) => [e.id, e.type === 'text' ? e.text.split('\n')[0] : e.type === 'image' ? `logo ${e.source.name}` : e.type]),
  );
  const bundle = await buildProductionBundle(
    render,
    design,
    profile,
    {
      orderId: meta.orderId,
      customer: meta.customer,
      productName: meta.productName,
      productId: meta.productId,
      width: design.width,
      height: design.height,
      ink: meta.ink,
      quantity: meta.quantity,
      designVersion: meta.designVersion,
      createdAt: new Date().toISOString(),
    },
    names,
  );
  return {
    bundle,
    profile,
    preflight: {
      ready: isProductionReady(issues),
      score: preflightScore(issues),
      errors: issues.filter((i) => i.severity === 'error').map((i) => i.message),
      warnings: issues.filter((i) => i.severity === 'warning').map((i) => i.message),
    },
  };
}

export { productionBaseName };

/**
 * On-demand export of a stored design in any production format (or all of
 * them as a ZIP) – re-rendered from the locked design JSON, never from files.
 */
export async function exportDesign(
  design: Design,
  format: string,
  mirror: boolean,
  meta: { orderId: string; customer: string; productName: string; ink: string; quantity: number; index: number },
): Promise<{ data: Uint8Array | string; name: string; mime: string; omittedImages: number }> {
  const { EXPORT_FORMATS, exportRender, isExportFormat, README, zip } = await import('./formats');
  const render = renderDesign(design, await resolverFor(design));
  const pm = { orderId: meta.orderId, customer: meta.customer, productName: meta.productName, width: design.width, height: design.height, ink: meta.ink, quantity: meta.quantity, createdAt: new Date().toISOString() };
  const base = `${productionBaseName(pm)}_${meta.index + 1}${mirror ? '_MIRROR' : ''}`;
  const omittedImages = render.items.filter((i) => i.kind === 'image').length;
  if (format === 'zip') {
    const files = await Promise.all(EXPORT_FORMATS.map(async (f) => ({ name: `${base}.${f.ext}`, data: await exportRender(render, f.id, mirror, pm) })));
    files.push({ name: 'README.txt', data: README(pm) });
    return { data: zip(files), name: `${base}.zip`, mime: 'application/zip', omittedImages };
  }
  if (!isExportFormat(format)) throw new Error('unknown format');
  const f = EXPORT_FORMATS.find((x) => x.id === format)!;
  return { data: await exportRender(render, format, mirror, pm), name: `${base}.${f.ext}`, mime: f.mime, omittedImages };
}
