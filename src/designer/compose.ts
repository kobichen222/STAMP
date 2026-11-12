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

/**
 * Popular looks on top of the three base styles: a font, a frame and an
 * optional separator under the title. Every look is laid out for the exact
 * stamp size like the base styles (and checked for production the same way).
 */
export type LookId = 'elegant' | 'rounded' | 'bold' | 'thick' | 'clean' | 'title-line' | 'dashed' | 'double-modern' | 'alef-frame' | 'rubik-line';

export interface Look {
  label: string;
  style: LayoutStyle;
  font: string;
  rect: Border;
  round: Border;
  /** Thin centred line between the first and second line (rectangular stamps). */
  separator?: boolean;
}

export const LOOKS: Record<LookId, Look> = {
  elegant: { label: 'אלגנטי', style: 'classic', font: 'david-libre', rect: { style: 'double', thickness: 0.5, inset: 0.3, gap: 0.45 }, round: { style: 'double', thickness: 0.7, inset: 0.3, gap: 0.5 } },
  rounded: { label: 'מסגרת מעוגלת', style: 'classic', font: 'heebo', rect: { style: 'rounded', thickness: 0.55, inset: 0.3, gap: 0.5 }, round: { style: 'circle', thickness: 0.7, inset: 0.3, gap: 0.5 } },
  bold: { label: 'כותרת בולטת', style: 'classic', font: 'secular-one', rect: { style: 'none', thickness: 0.5, inset: 0.3, gap: 0.5 }, round: { style: 'circle', thickness: 0.8, inset: 0.3, gap: 0.5 }, separator: true },
  thick: { label: 'מסגרת עבה', style: 'classic', font: 'suez-one', rect: { style: 'rect', thickness: 0.8, inset: 0.3, gap: 0.5 }, round: { style: 'circle', thickness: 1, inset: 0.3, gap: 0.5 } },
  clean: { label: 'נקי', style: 'minimal', font: 'rubik', rect: { style: 'none', thickness: 0.4, inset: 0.3, gap: 0.5 }, round: { style: 'minimal', thickness: 0.7, inset: 0.3, gap: 0.5 } },
  'title-line': { label: 'כותרת עם קו', style: 'classic', font: 'frank-ruhl-libre', rect: { style: 'none', thickness: 0.5, inset: 0.3, gap: 0.5 }, round: { style: 'double', thickness: 0.6, inset: 0.3, gap: 0.45 }, separator: true },
  dashed: { label: 'מסגרת מקווקוות', style: 'minimal', font: 'assistant', rect: { style: 'dashed', thickness: 0.5, inset: 0.3, gap: 0.5 }, round: { style: 'dashed', thickness: 0.6, inset: 0.3, gap: 0.5 } },
  'double-modern': { label: 'מסגרת כפולה', style: 'classic', font: 'heebo', rect: { style: 'double', thickness: 0.6, inset: 0.3, gap: 0.5 }, round: { style: 'double', thickness: 0.8, inset: 0.3, gap: 0.5 } },
  'alef-frame': { label: 'מסגרת דקה', style: 'classic', font: 'alef', rect: { style: 'rect', thickness: 0.4, inset: 0.3, gap: 0.5 }, round: { style: 'circle', thickness: 0.6, inset: 0.3, gap: 0.5 } },
  'rubik-line': { label: 'מודרני עם קו', style: 'minimal', font: 'rubik', rect: { style: 'rounded', thickness: 0.45, inset: 0.3, gap: 0.5 }, round: { style: 'minimal', thickness: 0.8, inset: 0.3, gap: 0.5 }, separator: true },
};
export const LOOK_IDS = Object.keys(LOOKS) as LookId[];

/** Room a border takes from the edge inwards (mm). */
const borderDepth = (b: Border) => (b.style === 'none' ? 0 : b.inset + b.thickness + (b.style === 'double' ? b.gap + Math.max(0.2, b.thickness * 0.6) : 0));

export interface LayoutContent {
  /** One of the popular looks (font + frame), on top of the style. */
  look?: LookId;
  /** Main lines, most important first. */
  lines: string[];
  /** Round stamps: text around the top / bottom of the ring. */
  arcTop?: string;
  arcBottom?: string;
  logo?: ImageElement | null;
  /**
   * Where the logo goes. Rectangular: 'side' (right, the reading side), 'left', or 'top' (centred above
   * the text). Round: always in the middle, above the lines. Default: by style.
   */
  logoPlace?: LogoPlace;
  /** Logo size relative to the default for its place (0.6 – 1.3). */
  logoScale?: number;
  font?: string;
}

export type LogoPlace = 'side' | 'left' | 'top';
export const LOGO_PLACES: LogoPlace[] = ['side', 'left', 'top'];

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
  opts: { font: string; emphasis: number; align: TextElement['align']; boldFirst: boolean; maxPt?: number; gapAfterFirst?: number; onGap?: (y: number) => void },
): TextElement[] {
  const n = lines.length;
  if (!n) return [];
  const weights = lines.map((_, i) => (i === 0 ? opts.emphasis : 1));
  const lh = 1.18;
  const sumW = weights.reduce((a, b) => a + b, 0);
  // Room reserved under the title (for a separator line).
  const gap = n > 1 ? (opts.gapAfterFirst ?? 0) : 0;
  // Height used ≈ sum(size_i) * lh – leading of the last line.
  const unitMm = (box.h - gap) / (sumW * lh);
  const out: TextElement[] = [];
  let y = box.y + (box.h - gap - sumW * unitMm * lh) / 2;
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
    if (i === 0 && gap) {
      opts.onGap?.(y + gap / 2);
      y += gap;
    }
  });
  return out;
}

export function composeLayout(model: StampModel, content: LayoutContent, baseStyle: LayoutStyle = 'classic'): Design {
  const d = newDesign(model);
  const look = content.look ? LOOKS[content.look] : undefined;
  const style = look?.style ?? baseStyle;
  const font = content.font || look?.font || (style === 'classic' ? 'frank-ruhl-libre' : style === 'modern' ? 'heebo' : 'assistant');
  const lines = content.lines.map((l) => l.trim()).filter(Boolean);
  const els: DesignElement[] = [];

  if (model.shape === 'round') {
    const W = model.width;
    const c = W / 2;
    d.border = look ? { ...look.round } : { style: style === 'classic' ? 'double' : style === 'minimal' ? 'minimal' : 'circle', thickness: 0.7, inset: 0.3, gap: 0.5 };
    const borderW = borderDepth(d.border);
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
    const logoScale = clamp(content.logoScale ?? 1, 0.6, 1.3);
    if (content.logo) {
      const size = r * (lines.length ? 0.9 : 1.3) * (lines.length ? Math.min(logoScale, 1.1) : Math.min(logoScale, 1.05));
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
    if (look) {
      d.border = { ...look.rect };
      // Tiny stamps: a double / rounded frame eats the text area – a thin plain frame instead.
      if (Math.min(W, H) < 18 && (d.border.style === 'double' || d.border.style === 'rounded')) d.border = { style: 'rect', thickness: 0.4, inset: 0.3, gap: 0.5 };
    }
    else if (style === 'classic') d.border = { style: 'rect', thickness: 0.5, inset: 0.3, gap: 0.5 };
    else if (style === 'modern') d.border = { style: 'none', thickness: 0.5, inset: 0.3, gap: 0.5 };
    else d.border = { style: 'none', thickness: 0.4, inset: 0.3, gap: 0.5 };
    // Same room as before for the plain frames (1.8 mm); more for double frames, and rounded corners keep text off the curve.
    const pad = d.border.style === 'none' ? 1.2 : Math.max(1.8, borderDepth(d.border) + 1);
    const padX = pad + (d.border.style === 'rounded' ? Math.min(W, H) * 0.06 : 0);
    let box = { x: padX, y: pad, w: W - 2 * padX, h: H - 2 * pad };

    if (content.logo) {
      const scale = clamp(content.logoScale ?? 1, 0.6, 1.3);
      const aspect = content.logo.height / content.logo.width;
      // Default by style (RTL reading: right for classic, left for modern); a date stamp has no room for a logo on top.
      const place: LogoPlace = (content.logoPlace === 'top' && model.dateBand ? undefined : content.logoPlace) ?? (style === 'modern' ? 'left' : 'side');
      if (place === 'top') {
        // Centred above the text: the logo takes the upper part of the box, the lines the rest.
        const share = clamp((lines.length ? 0.42 : 1) * scale, 0.25, lines.length ? 0.55 : 1);
        const lh = box.h * share;
        const lw = Math.min(lh / aspect, box.w * 0.9);
        els.push({ ...content.logo, width: round1(lw), height: round1(lw * aspect), x: round1(box.x + box.w / 2), y: round1(box.y + (lw * aspect) / 2) });
        const used = lw * aspect + 0.8;
        box = { ...box, y: box.y + used, h: box.h - used };
      } else {
        // Date stamps keep the middle window free: the logo sits beside the top text block only.
        const bandH = model.dateBand ? Math.max(5, H * 0.26) : 0;
        const lsize = (model.dateBand ? (box.h - bandH) / 2 - 0.4 : box.h) * Math.min(scale, 1);
        const lw = Math.min(lsize / aspect, W * clamp(0.35 * scale, 0.2, 0.45));
        const left = place === 'left';
        const lx = left ? box.x + lw / 2 : box.x + box.w - lw / 2;
        const ly = model.dateBand ? box.y + (box.h - bandH) / 4 : H / 2;
        els.push({ ...content.logo, width: round1(lw), height: round1(lw * aspect), x: round1(lx), y: round1(ly) });
        box = left ? { ...box, x: box.x + lw + 1.2, w: box.w - lw - 1.2 } : { ...box, w: box.w - lw - 1.2 };
      }
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
      // A separator line under the title gets its own room (modern style, and looks with a separator).
      const withSep = lines.length > 1 && (style === 'modern' || !!look?.separator);
      let sepY: number | null = null;
      const texts = stackLines(lines, box, {
        font,
        emphasis: style === 'minimal' ? 1.1 : 1.35,
        align,
        boldFirst: style !== 'minimal',
        gapAfterFirst: withSep ? Math.max(0.8, box.h * 0.09) : 0,
        onGap: (y) => (sepY = y),
      });
      els.push(...texts);
      if (withSep && sepY != null) {
        const centred = style !== 'modern';
        els.push(
          newShape(d, 'line', {
            width: round1(box.w * (centred ? 0.42 : 0.5)),
            stroke: 0.3,
            x: round1(centred ? box.x + box.w / 2 : box.x + box.w - box.w * 0.25),
            y: round1(sepY),
          }),
        );
      }
    }
  }

  d.elements = els;
  return d;
}

/** Keeps the user's text and logo but recomputes a clean layout ("שפר את הסידור"). */
/** The customer's content (text, arcs, logo, font) pulled out of a design. */
export function contentOf(design: Design): LayoutContent {
  const texts = design.elements
    .filter((e): e is TextElement => e.type === 'text' && !e.hidden && !!e.text.trim())
    .sort((a, b) => a.y - b.y);
  return {
    arcTop: texts.find((t) => t.curve?.position === 'top')?.text,
    arcBottom: texts.find((t) => t.curve?.position === 'bottom')?.text,
    lines: texts.filter((t) => !t.curve).flatMap((t) => t.text.split('\n')),
    logo: design.elements.find((e): e is ImageElement => e.type === 'image') ?? null,
    font: texts[0]?.font,
  };
}

export function improveLayout(design: Design, model: StampModel, style: LayoutStyle = 'classic'): Design {
  const next = composeLayout({ ...model, width: design.width, height: design.height, shape: design.shape }, contentOf(design), style);
  return { ...next, inkColor: design.inkColor, modelId: design.modelId };
}

/**
 * Carries a design over to another stamp model (size/shape change): keeps the
 * customer's text and logo, re-lays them out for the new model.
 */
export function adaptToModel(design: Design, model: StampModel): Design {
  const style: LayoutStyle = design.border.style === 'none' ? 'modern' : design.border.style === 'minimal' ? 'minimal' : 'classic';
  return { ...composeLayout(model, contentOf(design), style), inkColor: design.inkColor };
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
