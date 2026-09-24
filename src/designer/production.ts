import {
  closePath,
  concatTransformationMatrix,
  drawObject,
  fill,
  lineTo,
  moveTo,
  appendBezierCurve,
  PDFDocument,
  PDFName,
  PDFOperator,
  PDFOperatorNames,
  popGraphicsState,
  pushGraphicsState,
  setFillingCmykColor,
} from 'pdf-lib';
import { compose, type Matrix, type Path, scale, transformPath, translate } from './geometry';
import type { RenderItem, RenderResult } from './render';
import { toSvgD } from './geometry';

/**
 * "Stamp Production Profile" – the contract between the online designer and
 * the CorelDRAW / laser workstation. Every production file follows it.
 */
export const PRODUCTION_PROFILE = {
  name: 'Stamp2Go Stamp Production Profile v1',
  units: 'mm',
  scale: '1:1',
  text: 'converted to curves (no fonts required)',
  color: 'Black 100% (CMYK 0/0/0/100 in PDF/EPS, #000000 in SVG)',
  background: 'transparent',
  effects: 'none (no RGB effects, shadows, gradients or strokes – filled shapes only)',
  minLine: '0.2 mm',
  artboard: 'exact stamp impression size',
} as const;

export interface ExportOptions {
  /** Mirror horizontally (some engravers need a mirrored plate). */
  mirror?: boolean;
}

export interface ProductionMeta {
  orderId?: string;
  customer?: string;
  productId?: string;
  productName?: string;
  width: number;
  height: number;
  ink: string;
  quantity?: number;
  designVersion?: string;
  createdAt?: string;
}

/** ORD-1824_KOBI-COHEN_58x22_BLACK */
export function productionBaseName(meta: Pick<ProductionMeta, 'orderId' | 'customer' | 'width' | 'height' | 'ink'>): string {
  const clean = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[֑-ׇ]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toUpperCase()
      .slice(0, 30);
  const size = `${Math.round(meta.width * 10) / 10}x${Math.round(meta.height * 10) / 10}`;
  return [clean(meta.orderId || 'DRAFT'), clean(meta.customer || 'CUSTOMER') || 'CUSTOMER', size, clean(meta.ink)].join('_');
}

function mirrorMatrix(r: RenderResult, opts: ExportOptions): Matrix {
  return opts.mirror ? compose(translate(r.width, 0), scale(-1, 1)) : [1, 0, 0, 1, 0, 0];
}

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);

// ------------------------------------------------------------------ SVG

function svgBody(r: RenderResult, m: Matrix, withIds: boolean, names?: Record<string, string>): string {
  const parts: string[] = [];
  for (const item of r.items) {
    const id = withIds ? ` id="${esc(item.id)}"${names?.[item.id] ? ` data-name="${esc(names[item.id])}"` : ''}` : '';
    if (item.kind === 'path') {
      if (!item.path.length) continue;
      parts.push(`<path${id} fill-rule="${item.fillRule}" d="${toSvgD(transformPath(item.path, m))}"/>`);
    } else {
      const t = compose(m, item.matrix);
      parts.push(`<image${id} width="1" height="1" preserveAspectRatio="none" transform="matrix(${t.map((v) => Math.round(v * 10000) / 10000).join(' ')})" href="${item.href}"/>`);
    }
  }
  return parts.join('\n');
}

const svgOpen = (W: number, H: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`;

/**
 * Production SVG: exact artboard in mm, only filled black paths, text already
 * converted to curves, mirror per production profile, no editor metadata.
 */
export function toProductionSvg(r: RenderResult, opts: ExportOptions = {}): string {
  const body = svgBody(r, mirrorMatrix(r, opts), false);
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svgOpen(r.width, r.height)}\n<g fill="#000000" stroke="none">\n${body}\n</g>\n</svg>\n`;
}

/**
 * Master SVG: same geometry (never mirrored) plus named objects and the full
 * design JSON in <metadata>, so it can be reopened in the designer or inspected
 * in CorelDRAW (object names are kept on import).
 */
export function toMasterSvg(r: RenderResult, design: unknown, meta?: ProductionMeta, names?: Record<string, string>): string {
  const json = JSON.stringify({ profile: PRODUCTION_PROFILE.name, meta, design }).replace(/--/g, '\\u002d\\u002d');
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svgOpen(r.width, r.height)}\n` +
    `<title>${esc(meta?.productName || 'Stamp')} ${r.width}x${r.height}mm</title>\n` +
    `<metadata id="stamp2go-design"><![CDATA[${json.replace(/]]>/g, ']]]]><![CDATA[>')}]]></metadata>\n` +
    `<g id="stamp" fill="#000000" stroke="none">\n${svgBody(r, [1, 0, 0, 1, 0, 0], true, names)}\n</g>\n</svg>\n`
  );
}

// ------------------------------------------------------------------ PDF

const MM_TO_PT = 72 / 25.4;

function pathOperators(path: Path): PDFOperator[] {
  const ops: PDFOperator[] = [];
  for (const c of path) {
    if (c.t === 'M') ops.push(moveTo(c.p[0], c.p[1]));
    else if (c.t === 'L') ops.push(lineTo(c.p[0], c.p[1]));
    else if (c.t === 'C') ops.push(appendBezierCurve(c.c1[0], c.c1[1], c.c2[0], c.c2[1], c.p[0], c.p[1]));
    else ops.push(closePath());
  }
  return ops;
}

function dataUrlBytes(href: string): { bytes: Uint8Array; type: string } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(href);
  if (!m) return null;
  const raw = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return { bytes, type: m[1] };
}

export async function toProductionPdf(r: RenderResult, opts: ExportOptions = {}, meta?: ProductionMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(meta?.productName ? `${meta.productName} ${r.width}x${r.height}mm` : `Stamp ${r.width}x${r.height}mm`);
  doc.setCreator(PRODUCTION_PROFILE.name);
  doc.setProducer('Stamp2Go Designer');
  if (meta) doc.setSubject(JSON.stringify(meta));
  const W = r.width * MM_TO_PT;
  const H = r.height * MM_TO_PT;
  const page = doc.addPage([W, H]);
  // Page boxes = exact impression size so CorelDRAW imports 1:1.
  page.setTrimBox(0, 0, W, H);
  page.setArtBox(0, 0, W, H);

  // Work in millimetres with a y-down origin at the top-left, like the SVG.
  const m = mirrorMatrix(r, opts);
  const ops: PDFOperator[] = [pushGraphicsState(), concatTransformationMatrix(MM_TO_PT, 0, 0, -MM_TO_PT, 0, H), setFillingCmykColor(0, 0, 0, 1)];

  let imgIndex = 0;
  for (const item of r.items as RenderItem[]) {
    if (item.kind === 'path') {
      if (!item.path.length) continue;
      ops.push(...pathOperators(transformPath(item.path, m)));
      ops.push(item.fillRule === 'evenodd' ? PDFOperator.of(PDFOperatorNames.FillEvenOdd) : fill());
    } else {
      const data = dataUrlBytes(item.href);
      if (!data) continue;
      const img = data.type === 'image/png' ? await doc.embedPng(data.bytes) : await doc.embedJpg(data.bytes);
      const name = `Img${imgIndex++}`;
      page.node.setXObject(PDFName.of(name), img.ref);
      const t = compose(m, item.matrix);
      // Image space is y-up: flip the unit square inside the element transform.
      const f = compose(t, translate(0, 1), scale(1, -1));
      ops.push(pushGraphicsState(), concatTransformationMatrix(f[0], f[1], f[2], f[3], f[4], f[5]), drawObject(name), popGraphicsState());
    }
  }
  ops.push(popGraphicsState());
  page.pushOperators(...ops);
  return doc.save();
}

// ------------------------------------------------------------------ EPS

export interface EpsBitmap {
  /** 1-bit mask rows (1 = ink), row-major, each row padded to whole bytes. */
  width: number;
  height: number;
  bits: Uint8Array;
}

/**
 * Encapsulated PostScript (Level 2) – for older CorelDRAW / cutter workflows.
 * Vector items become PostScript paths; bitmaps (if supplied) are written as
 * 1-bit image masks.
 */
export function toProductionEps(r: RenderResult, opts: ExportOptions = {}, meta?: ProductionMeta, bitmaps: Record<string, EpsBitmap> = {}): string {
  const W = r.width * MM_TO_PT;
  const H = r.height * MM_TO_PT;
  const m = mirrorMatrix(r, opts);
  const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
  const lines: string[] = [
    '%!PS-Adobe-3.0 EPSF-3.0',
    `%%BoundingBox: 0 0 ${Math.ceil(W)} ${Math.ceil(H)}`,
    `%%HiResBoundingBox: 0 0 ${f(W)} ${f(H)}`,
    `%%Title: ${(meta?.productName || 'Stamp').replace(/[^\x20-\x7e]/g, '?')} ${r.width}x${r.height}mm`,
    `%%Creator: ${PRODUCTION_PROFILE.name}`,
    '%%LanguageLevel: 2',
    '%%DocumentProcessColors: Black',
    '%%EndComments',
    'gsave',
    `0 ${f(H)} translate ${f(MM_TO_PT)} ${f(-MM_TO_PT)} scale`,
    '0 0 0 1 setcmykcolor',
  ];
  for (const item of r.items) {
    if (item.kind === 'path') {
      if (!item.path.length) continue;
      const ps: string[] = ['newpath'];
      for (const c of transformPath(item.path, m)) {
        if (c.t === 'M') ps.push(`${f(c.p[0])} ${f(c.p[1])} moveto`);
        else if (c.t === 'L') ps.push(`${f(c.p[0])} ${f(c.p[1])} lineto`);
        else if (c.t === 'C') ps.push(`${f(c.c1[0])} ${f(c.c1[1])} ${f(c.c2[0])} ${f(c.c2[1])} ${f(c.p[0])} ${f(c.p[1])} curveto`);
        else ps.push('closepath');
      }
      ps.push(item.fillRule === 'evenodd' ? 'eofill' : 'fill');
      lines.push(ps.join(' '));
    } else {
      const bmp = bitmaps[item.id];
      if (!bmp) {
        lines.push(`% image ${item.id} omitted – vectorise the logo for EPS output`);
        continue;
      }
      const t = compose(m, item.matrix);
      const hex = Array.from(bmp.bits, (b) => b.toString(16).padStart(2, '0')).join('');
      lines.push(
        'gsave',
        `[${t.map(f).join(' ')}] concat`,
        `${bmp.width} ${bmp.height} true [${bmp.width} 0 0 ${bmp.height} 0 0]`,
        '{<' + hex.replace(/(.{1,240})/g, '$1\n') + '>} imagemask',
        'grestore',
      );
    }
  }
  lines.push('grestore', 'showpage', '%%EOF', '');
  return lines.join('\n');
}


export interface ProductionBundle {
  baseName: string;
  masterSvg: string;
  productionSvg: string;
  pdf: Uint8Array;
  eps?: string;
  metadata: string;
}

/**
 * The Production Engine: design render + profile + meta → every file the
 * production station needs. Deterministic: same input, same bytes (except
 * the PDF creation date).
 */
export async function buildProductionBundle(
  r: RenderResult,
  design: unknown,
  profile: { mirror: boolean; outputs: string[]; id: string },
  meta: ProductionMeta,
  names?: Record<string, string>,
): Promise<ProductionBundle> {
  const opts = { mirror: profile.mirror };
  return {
    baseName: productionBaseName(meta),
    masterSvg: toMasterSvg(r, design, meta, names),
    productionSvg: toProductionSvg(r, opts),
    pdf: await toProductionPdf(r, opts, meta),
    eps: profile.outputs.includes('eps') ? toProductionEps(r, opts, meta) : undefined,
    metadata: JSON.stringify({ profile: { ...PRODUCTION_PROFILE, sku: profile.id, mirror: profile.mirror }, meta, design }, null, 2),
  };
}
