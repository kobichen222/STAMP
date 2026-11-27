import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FONT_FAMILIES, faceKey, loadFace, type FontFace } from '@/designer/fonts';
import { buildProductionBundle, productionBaseName, type ProductionBundle } from '@/designer/production';
import { profileForModel } from '@/designer/profiles';
import { renderDesign, type FaceResolver, type RenderResult } from '@/designer/render';
import type { Design } from '@/designer/types';
import { isProductionReady, preflightScore, validateDesign, type Issue } from '@/designer/validate';
import { botPreflight, renderBot } from '@/stamp-bot/production';
import { withTracedLogos } from './logo-trace';

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

/**
 * The one place a stored design becomes production geometry. A stamp-bot line (design.bot) is drawn by the
 * bot's own drawer from its form and checked by the bot's preflight; every other line goes through the
 * designer's renderer (logos traced to outlines first) and validateDesign.
 */
async function renderStamp(original: Design): Promise<{ design: Design; render: RenderResult; check: (profile: ReturnType<typeof profileForModel>) => Issue[] }> {
  if (original.bot) {
    const render = renderBot(original);
    return { design: original, render, check: () => botPreflight(render, original) };
  }
  const { design } = await withTracedLogos(original);
  const render = renderDesign(design, await resolverFor(design));
  return { design, render, check: (profile) => validateDesign(design, render, profile) };
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
  original: Design,
  meta: { orderId: string; customer: string; productName: string; productId?: string; ink: string; quantity: number; designVersion: string },
): Promise<EngineResult> {
  // Picture logos become outlines, so every production file carries them (renderStamp).
  const { design, render, check } = await renderStamp(original);
  const profile = profileForModel({ shape: design.shape, width: design.width, height: design.height, dateBand: design.dateBand });
  const issues = check(profile);
  const names: Record<string, string> = design.bot
    ? {}
    : Object.fromEntries(design.elements.map((e) => [e.id, e.type === 'text' ? e.text.split('\n')[0] : e.type === 'image' ? `logo ${e.source.name}` : e.type]));
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
  original: Design,
  format: string,
  mirror: boolean,
  meta: { orderId: string; customer: string; productName: string; ink: string; quantity: number; index: number },
  opts: { cutLine?: boolean } = {},
): Promise<{ data: Uint8Array | string; name: string; mime: string; omittedImages: number }> {
  const { EXPORT_FORMATS, exportRender, isExportFormat, README, zip } = await import('./formats');
  if (format === 'logo-ai' || format === 'logo-png') {
    const files = await logoFiles(original, `${productionBaseName({ orderId: meta.orderId, customer: meta.customer, width: original.width, height: original.height, ink: meta.ink })}_${meta.index + 1}`, mirror);
    const hit = files.filter((f) => f.name.endsWith(format === 'logo-ai' ? '.ai' : '.png'));
    if (!hit.length) throw new Error('unknown format');
    if (hit.length === 1) return { data: hit[0].data, name: hit[0].name, mime: hit[0].mime, omittedImages: 0 };
    return { data: zip(hit), name: `${hit[0].name.replace(/_\d+\.png$/, '')}.zip`, mime: 'application/zip', omittedImages: 0 };
  }
  const { design, render } = await renderStamp(original);
  // Every format, the CorelDRAW file (AI) included, carries the whole stamp: a picture the customer uploaded
  // goes in as a smooth outline (see logo-trace), so the operator gets one complete file to edit.
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
  return { data: await exportRender(render, format, mirror, pm, opts.cutLine ? design.shape : undefined), name: `${base}.${f.ext}`, mime: f.mime, omittedImages };
}

/**
 * The logo the customer uploaded, on its own: the picture as it sits on the stamp (PNG, one per logo)
 * and a CorelDRAW file with the logo as outlines, at its place and size on the stamp.
 */
export async function logoFiles(original: Design, base: string, mirror = false): Promise<{ name: string; data: Uint8Array | string; mime: string }[]> {
  // A stamp-bot line has no uploaded logo: its drawing is the bot's own.
  if (original.bot) return [];
  const logos = original.elements.filter((e) => e.type === 'image');
  if (!logos.length) return [];
  const out: { name: string; data: Uint8Array | string; mime: string }[] = [];
  const { exportRender } = await import('./formats');
  const { design } = await withTracedLogos(original);
  const ids = new Set(logos.map((e) => e.id));
  const render = renderDesign(design, await resolverFor(design));
  const only = { ...render, items: render.items.filter((i) => i.kind === 'path' && ids.has(i.id)) };
  if (only.items.length) out.push({ name: `${base}_LOGO${mirror ? '_MIRROR' : ''}.ai`, data: await exportRender(only, 'ai', mirror), mime: 'application/postscript' });
  let n = 0;
  for (const e of logos) {
    const m = e.type === 'image' && /^data:image\/png;base64,(.+)$/.exec(e.src);
    if (m) out.push({ name: `${base}_LOGO${logos.length > 1 ? `_${++n}` : ''}.png`, data: new Uint8Array(Buffer.from(m[1], 'base64')), mime: 'image/png' });
  }
  return out;
}
