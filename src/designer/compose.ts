import { DEFAULT_FONT } from './fonts';
import type { Border, Design, DesignElement, ImageElement, ShapeElement, StampModel, TextElement } from './types';
import { PT_TO_MM } from './types';

let counter = 0;
export const uid = (p = 'el') => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const MIN_FONT_PT = 6;
export const SAFE_MARGIN = 1; // mm

export function defaultBorder(model: Pick<StampModel, 'shape'>): Border {
  return model.shape === 'round'
    ? { style: 'circle', thickness: 0.8, inset: 0.4, gap: 0.6 }
    : { style: 'none', thickness: 0.5, inset: 0.4, gap: 0.5 };
}

export function newDesign(model: StampModel): Design {
  return {
    version: 1,
    modelId: model.id,
    shape: model.shape,
    width: model.width,
    height: model.height,
    border: defaultBorder(model),
    elements: [],
    inkColor: 'black',
    dateBand: model.dateBand,
  };
}

export function newText(design: Design, text = 'טקסט חדש', over: Partial<TextElement> = {}): TextElement {
  return {
    id: uid('txt'),
    type: 'text',
    text,
    font: DEFAULT_FONT,
    bold: false,
    size: Math.min(12, Math.max(8, Math.round(design.height / 3))),
    align: 'center',
    letterSpacing: 0,
    lineHeight: 1.2,
    maxWidth: Math.round((design.width - 4) * 10) / 10,
    x: design.width / 2,
    y: design.height / 2,
    rotation: 0,
    ...over,
  };
}

export function newShape(design: Design, kind: ShapeElement['kind'], over: Partial<ShapeElement> = {}): ShapeElement {
  const s = Math.min(design.width, design.height) * 0.4;
  const base: ShapeElement = {
    id: uid('shp'),
    type: 'shape',
    kind,
    width: kind === 'line' ? design.width * 0.6 : s,
    height: kind === 'line' ? 0 : s,
    stroke: 0.4,
    filled: kind === 'star' || kind === 'icon',
    x: design.width / 2,
    y: design.height / 2,
    rotation: 0,
  };
  return { ...base, ...over };
}

// ------------------------------------------------------------------ layouts

export type LayoutStyle = 'classic' | 'modern' | 'minimal';

export interface LayoutContent {
  /** Main lines, most important first. */
  lines: string[];
  /** Round stamps: text around the top / bottom of the ring. */
  arcTop?: string;
  arcBottom?: string;
  logo?: ImageElement | null;
  font?: string;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Lays out stacked lines inside a box. Line 0 is emphasised; sizes are chosen
 * so the block fills the height, and every line gets the box width as maxWidth
 * so long lines shrink instead of overflowing.
 */
function stackLines(
  lines: string[],
  box: { x: number; y: number; w: number; h: number },
  opts: { font: string; emphasis: number; align: TextElement['align']; boldFirst: boolean; maxPt?: number },
): TextElement[] {
  const n = lines.length;
  if (!n) return [];
  const weights = lines.map((_, i) => (i === 0 ? opts.emphasis : 1));
  const lh = 1.18;
  const sumW = weights.reduce((a, b) => a + b, 0);
  // Height used ≈ sum(size_i) * lh – leading of the last line.
  const unitMm = box.h / (sumW * lh);
  const out: TextElement[] = [];
  let y = box.y + (box.h - sumW * unitMm * lh) / 2;
  lines.forEach((text, i) => {
    const sizeMm = unitMm * weights[i];
    const pt = clamp(sizeMm / PT_TO_MM, MIN_FONT_PT, opts.maxPt ?? 16);
    const pitch = sizeMm * lh;
    const alignX = opts.align === 'center' ? box.x + box.w / 2 : opts.align === 'right' ? box.x + box.w / 2 : box.x + box.w / 2;
    out.push({
      id: uid('txt'),
      type: 'text',
      text,
      font: opts.font,
      bold: opts.boldFirst && i === 0,
      size: round1(pt),
      align: opts.align,
      letterSpacing: 0,
      lineHeight: 1.2,
      maxWidth: round1(box.w),
      x: round1(alignX),
      y: round1(y + pitch / 2),
      rotation: 0,
    });
    y += pitch;
  });
  return out;
}

export function composeLayout(model: StampModel, content: LayoutContent, style: LayoutStyle = 'classic'): Design {
  const d = newDesign(model);
  const font = content.font || (style === 'classic' ? 'frank-ruhl-libre' : style === 'modern' ? 'heebo' : 'assistant');
  const lines = content.lines.map((l) => l.trim()).filter(Boolean);
  const els: DesignElement[] = [];

  if (model.shape === 'round') {
    const W = model.width;
    const c = W / 2;
    d.border = { style: style === 'classic' ? 'double' : style === 'minimal' ? 'minimal' : 'circle', thickness: 0.7, inset: 0.3, gap: 0.5 };
    const borderW = d.border.style === 'double' ? 0.3 + 0.7 + 0.5 + 0.42 : 0.3 + 0.7;
    // Arc text never goes below the production minimum: on small stamps the
    // ring grows instead (unchanged from ~22mm up).
    const minTextMm = MIN_FONT_PT * PT_TO_MM;
    const ringSizeMm = Math.max(W * 0.16 * 0.62, minTextMm);
    const ring = ringSizeMm / 0.62;
    const arcTop = content.arcTop ?? (lines.length > 2 ? lines.shift() : undefined);
    const arcBottom = content.arcBottom ?? (lines.length > 2 ? lines.pop() : undefined);
    const capApprox = ringSizeMm * 0.72;
    const outerText = c - borderW - 0.8;
    if (arcTop) {
      els.push({
        ...newText(d, arcTop, { font, bold: style !== 'minimal', size: round1(ringSizeMm / PT_TO_MM) }),
        x: c,
        y: c,
        maxWidth: 0,
        curve: { radius: round1(outerText - capApprox), position: 'top' },
      });
    }
    if (arcBottom) {
      els.push({
        ...newText(d, arcBottom, { font, size: round1(Math.max(ringSizeMm * 0.9, minTextMm) / PT_TO_MM) }),
        x: c,
        y: c,
        maxWidth: 0,
        curve: { radius: round1(outerText - capApprox * 0.9 - 0.3), position: 'bottom' },
      });
    }
    const innerR = c - borderW - ring - 1;
    if (arcTop || arcBottom) {
      els.push(newShape(d, 'ellipse', { width: round1(innerR * 2), height: round1(innerR * 2), stroke: 0.45, filled: false }));
    }
    const r = arcTop || arcBottom ? innerR - 1 : c - borderW - 1.5;
    if (content.logo) {
      const size = r * (lines.length ? 0.9 : 1.3);
      const aspect = content.logo.height / content.logo.width;
      const lw = aspect > 1 ? size / aspect : size;
      els.push({ ...content.logo, width: round1(lw), height: round1(lw * aspect), x: c, y: lines.length ? c - r * 0.45 : c });
    }
    // Largest rectangle-ish box inside the inner circle.
    const boxH = content.logo && lines.length ? r * 0.9 : r * 1.2;
    const boxY = content.logo && lines.length ? c : c - boxH / 2;
    const boxW = 2 * Math.sqrt(Math.max(0, r * r - (boxH / 2) ** 2)) * 0.95;
    els.push(...stackLines(lines, { x: c - boxW / 2, y: boxY, w: boxW, h: boxH }, { font, emphasis: 1.25, align: 'center', boldFirst: style !== 'minimal', maxPt: 12 }));
  } else {
    // Arc texts of round templates become regular lines on rectangular stamps.
    if (content.arcTop) lines.unshift(content.arcTop);
    if (content.arcBottom) lines.push(content.arcBottom);
    const W = model.width;
    const H = model.height;
    if (style === 'classic') d.border = { style: 'rect', thickness: 0.5, inset: 0.3, gap: 0.5 };
    else if (style === 'modern') d.border = { style: 'none', thickness: 0.5, inset: 0.3, gap: 0.5 };
    else d.border = { style: 'none', thickness: 0.4, inset: 0.3, gap: 0.5 };
    const pad = d.border.style === 'none' ? 1.2 : 1.8;
    let box = { x: pad, y: pad, w: W - 2 * pad, h: H - 2 * pad };

    if (content.logo) {
      // Date stamps keep the middle window free: the logo sits beside the top text block only.
      const bandH = model.dateBand ? Math.max(5, H * 0.26) : 0;
      const lsize = model.dateBand ? (box.h - bandH) / 2 - 0.4 : box.h;
      const aspect = content.logo.height / content.logo.width;
      const lw = Math.min(lsize / aspect, W * 0.35);
      // RTL reading: logo on the right for classic, on the left for modern.
      const lx = style === 'modern' ? box.x + lw / 2 : box.x + box.w - lw / 2;
      const ly = model.dateBand ? box.y + lsize / 2 : H / 2;
      els.push({ ...content.logo, width: round1(lw), height: round1(lw * aspect), x: round1(lx), y: round1(ly) });
      box = style === 'modern' ? { ...box, x: box.x + lw + 1.2, w: box.w - lw - 1.2 } : { ...box, w: box.w - lw - 1.2 };
    }

    const align: TextElement['align'] = style === 'modern' ? 'right' : 'center';
    if (model.dateBand) {
      // Keep a free window in the middle for the date wheels.
      const band = Math.max(5, H * 0.26);
      const topH = (box.h - band) / 2;
      const half = Math.ceil(lines.length / 2);
      els.push(...stackLines(lines.slice(0, half), { ...box, h: topH }, { font, emphasis: 1.2, align, boldFirst: true }));
      els.push(...stackLines(lines.slice(half), { ...box, y: box.y + topH + band, h: topH }, { font, emphasis: 1, align, boldFirst: false }));
    } else {
      const texts = stackLines(lines, box, { font, emphasis: style === 'minimal' ? 1.1 : 1.35, align, boldFirst: style !== 'minimal' });
      els.push(...texts);
      if (style === 'modern' && texts.length > 1) {
        // Thin separator under the title.
        const t0 = texts[0];
        const t1 = texts[1];
        els.push(newShape(d, 'line', { width: round1(box.w * 0.5), stroke: 0.3, x: round1(box.x + box.w - box.w * 0.25), y: round1((t0.y + t1.y) / 2) }));
      }
    }
  }

  d.elements = els;
  return d;
}

/** Keeps the user's text and logo but recomputes a clean layout ("שפר את הסידור"). */
export function improveLayout(design: Design, model: StampModel, style: LayoutStyle = 'classic'): Design {
  const texts = design.elements
    .filter((e): e is TextElement => e.type === 'text' && !e.hidden && !!e.text.trim())
    .sort((a, b) => a.y - b.y);
  const arcTop = texts.find((t) => t.curve?.position === 'top')?.text;
  const arcBottom = texts.find((t) => t.curve?.position === 'bottom')?.text;
  const lines = texts.filter((t) => !t.curve).flatMap((t) => t.text.split('\n'));
  const logo = design.elements.find((e): e is ImageElement => e.type === 'image') ?? null;
  const font = texts[0]?.font;
  const next = composeLayout({ ...model, width: design.width, height: design.height, shape: design.shape }, { lines, arcTop, arcBottom, logo, font }, style);
  return { ...next, inkColor: design.inkColor, modelId: design.modelId };
}

/** Replaces {{field}} placeholders – used by the bulk (CSV) generator. */
export function fillPlaceholders(design: Design, row: Record<string, string>): Design {
  return {
    ...design,
    elements: design.elements.map((e) =>
      e.type === 'text' ? { ...e, id: uid('txt'), text: e.text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, k) => row[k] ?? '') } : { ...e, id: uid(e.type) },
    ),
  };
}

/**
 * Re-spaces the straight text lines evenly inside the safe area (keeping their
 * order, alignment and relative sizes, shrinking them if they no longer fit).
 * Used when lines are added / removed from the simple line editor.
 */
export function restackLines(design: Design, margin = 1.2): Design {
  const texts = design.elements.filter((e): e is TextElement => e.type === 'text' && !e.curve && !e.hidden).sort((a, b) => a.y - b.y);
  if (!texts.length) return design;
  const round = design.shape === 'round';
  const border = design.border.style === 'none' ? 0 : design.border.inset + design.border.thickness + 0.5;
  const top = margin + border + (round ? design.height * 0.18 : 0);
  const bottom = design.height - margin - border - (round ? design.height * 0.18 : 0);
  const avail = Math.max(2, bottom - top);
  const heights = texts.map((t) => t.size * PT_TO_MM * t.lineHeight * t.text.split('\n').length);
  const total = heights.reduce((a, b) => a + b, 0);
  const f = total > avail ? avail / total : 1;
  let y = top + (avail - total * f) / 2;
  const updates = new Map<string, Partial<TextElement>>();
  texts.forEach((t, i) => {
    const h = heights[i] * f;
    updates.set(t.id, { y: round1(y + h / 2), size: round1(Math.max(MIN_FONT_PT, t.size * f)) });
    y += h;
  });
  return { ...design, elements: design.elements.map((e) => (updates.has(e.id) ? ({ ...e, ...updates.get(e.id) } as DesignElement) : e)) };
}
