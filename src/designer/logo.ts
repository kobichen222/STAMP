'use client';

/**
 * Logo pipeline (browser only):
 *   file → validate (signature/MIME/size) → sanitize SVG / rasterise PDF
 *   → bitmap processing (remove background, grayscale, contrast, threshold,
 *     invert, auto-crop) → optional vector trace → ImageElement.
 */
import { parseSvgPath, transformPath, toSvgD, type Matrix, type Path, bboxOf, pathPoints, rectPath, ellipsePath, polygonPath, type Pt } from './geometry';

export const MAX_UPLOAD_BYTES = { image: 10 * 1024 * 1024, pdf: 20 * 1024 * 1024 };

export interface LoadedLogo {
  name: string;
  mime: string;
  /** Original bitmap (or rasterised vector) for processing. */
  bitmap: HTMLCanvasElement;
  pxWidth: number;
  pxHeight: number;
  /** Exact vector outlines when the source was a clean, fill-only SVG. */
  vector: { d: string; aspect: number } | null;
  isVector: boolean;
}

export interface ProcessOptions {
  removeBackground: boolean;
  threshold: number; // 0..255
  contrast: number; // -100..100
  invert: boolean;
  crop: boolean;
}

export const DEFAULT_PROCESS: ProcessOptions = { removeBackground: true, threshold: 150, contrast: 20, invert: false, crop: true };

// ------------------------------------------------------------------ validation

async function sniff(file: File): Promise<'png' | 'jpg' | 'gif' | 'webp' | 'svg' | 'pdf' | null> {
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const hex = Array.from(head.slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
  if (hex.startsWith('89504e47')) return 'png';
  if (hex.startsWith('ffd8ff')) return 'jpg';
  if (hex.startsWith('47494638')) return 'gif';
  if (hex.startsWith('52494646') && new TextDecoder().decode(head.slice(8, 12)) === 'WEBP') return 'webp';
  if (hex.startsWith('25504446')) return 'pdf';
  const text = new TextDecoder().decode(head).trimStart().toLowerCase();
  if (text.startsWith('<?xml') || text.startsWith('<svg') || text.includes('<svg')) return 'svg';
  return null;
}

export class LogoError extends Error {}

// ------------------------------------------------------------------ SVG

/** Removes scripts, event handlers, foreignObject and external references. */
export function sanitizeSvg(text: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement as unknown as SVGSVGElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new LogoError('קובץ ה־SVG פגום');
  svg.querySelectorAll('script, foreignObject, iframe, object, embed, audio, video, animate, set, animateTransform').forEach((n) => n.remove());
  for (const el of Array.from(svg.querySelectorAll('*')).concat(svg as unknown as Element)) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'xlink:href' || name === 'src') && !value.startsWith('#') && !value.startsWith('data:image/')) el.removeAttribute(attr.name);
      else if (name === 'style' && /url\s*\(\s*['"]?(?!#)/.test(value)) el.removeAttribute(attr.name);
    }
  }
  return svg;
}

const GEOMETRY = 'path, rect, circle, ellipse, polygon, polyline, line';

/**
 * Converts fill-only SVG geometry to our path format (with transforms
 * flattened). Returns null when the SVG uses strokes, gradients, text or
 * images – those logos go through the bitmap + trace route instead.
 */
function svgToVector(svg: SVGSVGElement): { d: string; aspect: number } | null {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-10000px;top:0;width:500px;height:500px;visibility:hidden';
  const clone = svg.cloneNode(true) as SVGSVGElement;
  host.appendChild(clone);
  document.body.appendChild(host);
  try {
    if (clone.querySelector('text, image, linearGradient, radialGradient, pattern, mask, filter')) return null;
    const rootCtm = clone.getScreenCTM();
    if (!rootCtm) return null;
    const inv = rootCtm.inverse();
    const out: Path = [];
    for (const el of Array.from(clone.querySelectorAll<SVGGraphicsElement>(GEOMETRY))) {
      if (el.closest('defs, clipPath, symbol')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const fill = cs.fill;
      const stroke = cs.stroke;
      const strokeW = parseFloat(cs.strokeWidth) || 0;
      if (stroke && stroke !== 'none' && strokeW > 0) return null; // strokes → trace
      if (!fill || fill === 'none' || /rgba?\(\s*255,\s*255,\s*255/.test(fill)) continue; // ignore white shapes
      if (parseFloat(cs.opacity) === 0 || parseFloat(cs.fillOpacity) === 0) continue;
      let p: Path;
      const n = (a: string) => parseFloat(el.getAttribute(a) || '0');
      switch (el.tagName.toLowerCase()) {
        case 'path':
          p = parseSvgPath(el.getAttribute('d') || '');
          break;
        case 'rect':
          p = rectPath(n('x'), n('y'), n('width'), n('height'), n('rx') || n('ry'));
          break;
        case 'circle':
          p = ellipsePath(n('cx'), n('cy'), n('r'), n('r'));
          break;
        case 'ellipse':
          p = ellipsePath(n('cx'), n('cy'), n('rx'), n('ry'));
          break;
        case 'polygon': {
          const nums = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
          const pts: Pt[] = [];
          for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
          p = pts.length > 2 ? polygonPath(pts) : [];
          break;
        }
        default:
          return null; // lines / polylines are strokes
      }
      const ctm = el.getScreenCTM();
      if (!ctm) continue;
      const m = inv.multiply(ctm);
      out.push(...transformPath(p, [m.a, m.b, m.c, m.d, m.e, m.f] as Matrix));
    }
    if (!out.length) return null;
    const b = bboxOf(pathPoints(out));
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    if (!(w > 0 && h > 0)) return null;
    const norm = transformPath(out, [1 / w, 0, 0, 1 / w, -b.minX / w, -b.minY / w]);
    return { d: toSvgD(norm), aspect: h / w };
  } finally {
    host.remove();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new LogoError('לא ניתן לקרוא את התמונה'));
    img.src = src;
  });
}

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

async function rasterizePdf(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(8, 2400 / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale });
  const c = canvasOf(vp.width, vp.height);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas: c } as never).promise;
  return c;
}

export async function loadLogoFile(file: File): Promise<LoadedLogo> {
  const kind = await sniff(file);
  if (!kind) throw new LogoError('פורמט לא נתמך. אפשר להעלות PNG, JPG, SVG או PDF');
  const limit = kind === 'pdf' ? MAX_UPLOAD_BYTES.pdf : MAX_UPLOAD_BYTES.image;
  if (file.size > limit) throw new LogoError(`הקובץ גדול מדי (עד ${Math.round(limit / 1024 / 1024)}MB)`);

  if (kind === 'pdf') {
    const bitmap = await rasterizePdf(file);
    return { name: file.name, mime: 'application/pdf', bitmap, pxWidth: bitmap.width, pxHeight: bitmap.height, vector: null, isVector: true };
  }

  if (kind === 'svg') {
    const svg = sanitizeSvg(await file.text());
    const vector = svgToVector(svg);
    // Rasterise at high resolution too, for preview / trace fallback.
    const xml = new XMLSerializer().serializeToString(svg);
    const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);
    const w0 = img.naturalWidth || 1000;
    const h0 = img.naturalHeight || 1000;
    const s = 2000 / Math.max(w0, h0);
    const bitmap = canvasOf(w0 * s, h0 * s);
    const ctx = bitmap.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, bitmap.width, bitmap.height);
    ctx.drawImage(img, 0, 0, bitmap.width, bitmap.height);
    return { name: file.name, mime: 'image/svg+xml', bitmap, pxWidth: bitmap.width, pxHeight: bitmap.height, vector, isVector: true };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (img.naturalWidth * img.naturalHeight > 40_000_000) throw new LogoError('התמונה גדולה מדי');
    const bitmap = canvasOf(img.naturalWidth, img.naturalHeight);
    const ctx = bitmap.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, bitmap.width, bitmap.height);
    ctx.drawImage(img, 0, 0);
    return { name: file.name, mime: file.type || `image/${kind}`, bitmap, pxWidth: img.naturalWidth, pxHeight: img.naturalHeight, vector: null, isVector: false };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ------------------------------------------------------------------ processing

export interface ProcessedLogo {
  /** Black-on-transparent PNG. */
  dataUrl: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** Share of pixels that were neither clearly black nor white before thresholding (0..1). */
  greyShare: number;
}

export function processLogo(src: HTMLCanvasElement, o: ProcessOptions, maxSide = 1600): ProcessedLogo {
  const s = Math.min(1, maxSide / Math.max(src.width, src.height));
  const c = canvasOf(src.width * s, src.height * s);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const k = (259 * (o.contrast + 255)) / (255 * (259 - o.contrast));
  let grey = 0;
  let minX = c.width;
  let minY = c.height;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    // Composite on white, luminance, contrast.
    let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * a + 255 * (1 - a);
    l = Math.max(0, Math.min(255, k * (l - 128) + 128));
    if (l > 60 && l < 200) grey++;
    let ink = l < o.threshold;
    if (o.invert) ink = !ink;
    if (!ink && !o.removeBackground) {
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = 255;
    } else {
      d[i] = d[i + 1] = d[i + 2] = 0;
      d[i + 3] = ink ? 255 : 0;
    }
    if (ink) {
      const p = i / 4;
      const x = p % c.width;
      const y = (p / c.width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  ctx.putImageData(img, 0, 0);
  let out = c;
  if (o.crop && maxX >= minX && maxY >= minY) {
    const pad = 2;
    const x0 = Math.max(0, minX - pad);
    const y0 = Math.max(0, minY - pad);
    const w = Math.min(c.width, maxX + pad + 1) - x0;
    const h = Math.min(c.height, maxY + pad + 1) - y0;
    out = canvasOf(w, h);
    out.getContext('2d')!.drawImage(c, x0, y0, w, h, 0, 0, w, h);
  }
  return { dataUrl: out.toDataURL('image/png'), canvas: out, width: out.width, height: out.height, greyShare: grey / (d.length / 4) };
}

// ------------------------------------------------------------------ vectorise

/** Bitmap → vector outlines (ImageTracer, 2 colours). Path normalised to width 1. */
export async function vectorize(processed: HTMLCanvasElement, detail: 'low' | 'medium' | 'high' = 'medium'): Promise<{ d: string; aspect: number } | null> {
  const mod = await import('imagetracerjs');
  const tracer = (mod as unknown as { default?: unknown }).default ?? mod;
  const T = tracer as { imagedataToSVG: (img: ImageData, opts: Record<string, unknown>) => string };
  // Trace on an opaque black/white copy (transparent → white).
  const c = canvasOf(processed.width, processed.height);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(processed, 0, 0);
  const opts = {
    ltres: detail === 'high' ? 0.5 : detail === 'low' ? 2 : 1,
    qtres: detail === 'high' ? 0.5 : detail === 'low' ? 2 : 1,
    pathomit: detail === 'high' ? 4 : detail === 'low' ? 16 : 8,
    colorsampling: 0,
    numberofcolors: 2,
    pal: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
    ],
    mincolorratio: 0,
    colorquantcycles: 1,
    blurradius: 0,
    strokewidth: 0,
    linefilter: true,
    roundcoords: 2,
    viewbox: true,
    desc: false,
  };
  const svgText = T.imagedataToSVG(ctx.getImageData(0, 0, c.width, c.height), opts);
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const out: Path = [];
  doc.querySelectorAll('path').forEach((p) => {
    const fill = (p.getAttribute('fill') || '').replace(/\s/g, '');
    if (!/^rgb\(0,0,0\)$|^#000(000)?$/.test(fill)) return;
    out.push(...parseSvgPath(p.getAttribute('d') || ''));
  });
  if (!out.length) return null;
  const w = c.width;
  return { d: toSvgD(transformPath(out, [1 / w, 0, 0, 1 / w, 0, 0])), aspect: c.height / w };
}

export function logoQualityFromPixels(pxWidth: number, widthMm: number, isVector: boolean): { level: 'excellent' | 'good' | 'low'; dpi: number } {
  const dpi = Math.round(pxWidth / (widthMm / 25.4));
  if (isVector) return { level: 'excellent', dpi };
  return { level: dpi >= 600 ? 'excellent' : dpi >= 300 ? 'good' : 'low', dpi };
}
