import { visualOrder } from './bidi';
import { glyphFor, type FontFace } from './fonts';
import {
  bboxOf,
  compose,
  EMPTY_BBOX,
  ellipsePath,
  ellipseRing,
  type BBox,
  type Cmd,
  type Matrix,
  parseSvgPath,
  type Path,
  pathPoints,
  polygonPath,
  rectPath,
  rectRing,
  rotate,
  scale,
  starPoints,
  transformPath,
  translate,
  unionBBox,
} from './geometry';
import { iconById } from './icons';
import { type Design, type DesignElement, type ImageElement, PT_TO_MM, type ShapeElement, type TextElement } from './types';

export type FillRule = 'nonzero' | 'evenodd';

export interface RenderPath {
  kind: 'path';
  id: string; // element id, or "border"
  path: Path;
  fillRule: FillRule;
  bbox: BBox;
}

export interface RenderImage {
  kind: 'image';
  id: string;
  href: string;
  /** Transform mapping the unit box (0..1 × 0..1) to stamp mm. */
  matrix: Matrix;
  width: number;
  height: number;
  bbox: BBox;
}

export type RenderItem = RenderPath | RenderImage;

export interface ElementInfo {
  id: string;
  bbox: BBox;
  /** Effective (after auto-shrink) font size, text only. */
  effectiveSize?: number;
  shrunk?: boolean;
  /** Characters with no glyph in the selected font. */
  missingGlyphs?: string[];
  /** Thinnest line of a shape, in mm. */
  minStroke?: number;
}

export interface RenderResult {
  width: number;
  height: number;
  shape: Design['shape'];
  items: RenderItem[];
  info: Record<string, ElementInfo>;
}

export type FaceResolver = (font: string, bold: boolean) => FontFace | undefined;

const elementMatrix = (el: DesignElement): Matrix => compose(translate(el.x, el.y), rotate(el.rotation || 0));

// ------------------------------------------------------------------ text

interface LaidGlyph {
  path: Path;
  advance: number;
}

function layoutLine(text: string, face: FontFace, fallback: FontFace | undefined, sizeMm: number, letterSpacing: number, missing: Set<string>) {
  const glyphs: LaidGlyph[] = [];
  let x = 0;
  let prev: { glyph: ReturnType<typeof glyphFor>; } | null = null;
  const chars = visualOrder(text);
  for (const ch of chars) {
    const g = glyphFor(face, ch, fallback);
    if (!g) {
      if (ch.trim()) missing.add(ch);
      prev = null;
      continue;
    }
    const upm = g.font.unitsPerEm;
    const k = sizeMm / upm;
    if (prev?.glyph && prev.glyph.font === g.font) {
      x += g.font.getKerningValue(prev.glyph.glyph, g.glyph) * k;
    }
    const otPath = g.glyph.getPath(0, 0, sizeMm);
    const path: Path = [];
    let cur: [number, number] = [0, 0];
    for (const c of otPath.commands) {
      if (c.type === 'M') {
        path.push({ t: 'M', p: [c.x + x, c.y] });
        cur = [c.x, c.y];
      } else if (c.type === 'L') {
        path.push({ t: 'L', p: [c.x + x, c.y] });
        cur = [c.x, c.y];
      } else if (c.type === 'C') {
        path.push({ t: 'C', c1: [c.x1 + x, c.y1], c2: [c.x2 + x, c.y2], p: [c.x + x, c.y] });
        cur = [c.x, c.y];
      } else if (c.type === 'Q') {
        const c1: [number, number] = [cur[0] + (2 / 3) * (c.x1 - cur[0]) + x, cur[1] + (2 / 3) * (c.y1 - cur[1])];
        const c2: [number, number] = [c.x + (2 / 3) * (c.x1 - c.x) + x, c.y + (2 / 3) * (c.y1 - c.y)];
        path.push({ t: 'C', c1, c2, p: [c.x + x, c.y] });
        cur = [c.x, c.y];
      } else if (c.type === 'Z') path.push({ t: 'Z' });
    }
    const advance = (g.glyph.advanceWidth ?? 0) * k + (letterSpacing / 1000) * sizeMm;
    glyphs.push({ path: path.map((cmd) => cmd), advance });
    x += advance;
    prev = { glyph: g };
  }
  // Remove trailing letter spacing so centring is exact.
  const width = Math.max(0, x - (glyphs.length ? (letterSpacing / 1000) * sizeMm : 0));
  return { glyphs, width };
}

function renderText(el: TextElement, face: FontFace, fallback: FontFace | undefined): { paths: Path; info: ElementInfo } {
  const missing = new Set<string>();
  let sizeMm = el.size * PT_TO_MM;
  const lines = el.text.split('\n');
  let laid = lines.map((l) => layoutLine(l, face, fallback, sizeMm, el.letterSpacing, missing));
  let widest = Math.max(0, ...laid.map((l) => l.width));
  let shrunk = false;

  if (el.curve) {
    const out: Path = [];
    const line = laid[0];
    const r = el.curve.radius;
    const total = line.width;
    if (r > 0) {
      let s = 0;
      for (const g of line.glyphs) {
        const mid = s + g.advance / 2;
        // Place each glyph centred on its arc position, upright relative to the circle.
        const local = transformPath(g.path, translate(-mid, 0));
        let m: Matrix;
        if (el.curve.position === 'top') {
          const theta = (-total / 2 + mid) / r;
          m = compose(translate(el.x, el.y), rotate((theta * 180) / Math.PI + (el.rotation || 0)), translate(0, -r));
        } else {
          const psi = (total / 2 - mid) / r;
          // Bottom text: baseline on the outside, glyph tops towards the centre.
          m = compose(translate(el.x, el.y), rotate((psi * 180) / Math.PI + (el.rotation || 0)), translate(0, r + face.capHeight * sizeMm));
        }
        out.push(...transformPath(local, m));
        s += g.advance;
      }
    }
    const bbox = bboxOf(pathPoints(out));
    return { paths: out, info: { id: el.id, bbox, effectiveSize: el.size, missingGlyphs: [...missing] } };
  }

  if (el.maxWidth > 0 && widest > el.maxWidth) {
    const f = el.maxWidth / widest;
    sizeMm *= f;
    shrunk = true;
    laid = lines.map((l) => layoutLine(l, face, fallback, sizeMm, el.letterSpacing, new Set()));
    widest = Math.max(0, ...laid.map((l) => l.width));
  }

  const boxW = el.maxWidth > 0 ? el.maxWidth : widest;
  const pitch = sizeMm * el.lineHeight;
  const cap = face.capHeight * sizeMm;
  const blockH = cap + (lines.length - 1) * pitch;
  const m = elementMatrix(el);
  const out: Path = [];
  const skew: Matrix = el.italic ? [1, 0, -Math.tan((12 * Math.PI) / 180), 1, 0, 0] : [1, 0, 0, 1, 0, 0];
  laid.forEach((line, i) => {
    const baseline = -blockH / 2 + cap + i * pitch;
    const x0 = el.align === 'center' ? -line.width / 2 : el.align === 'right' ? boxW / 2 - line.width : -boxW / 2;
    const lm = compose(m, translate(x0, baseline), skew);
    for (const g of line.glyphs) out.push(...transformPath(g.path, lm));
    if (el.underline && line.width > 0) {
      const th = Math.max(0.2, sizeMm * 0.06);
      out.push(...transformPath(rectPath(0, sizeMm * 0.12, line.width, th), compose(m, translate(x0, baseline))));
    }
  });
  const bbox = bboxOf(pathPoints(out));
  return {
    paths: out,
    info: { id: el.id, bbox, effectiveSize: sizeMm / PT_TO_MM, shrunk, missingGlyphs: [...missing] },
  };
}

// ------------------------------------------------------------------ shapes

function renderShape(el: ShapeElement): { path: Path; fillRule: FillRule; minStroke?: number } {
  const w = el.width;
  const h = el.height;
  const m = elementMatrix(el);
  let local: Path;
  let fillRule: FillRule = 'nonzero';
  let minStroke: number | undefined;
  switch (el.kind) {
    case 'rect':
      local = el.filled ? rectPath(-w / 2, -h / 2, w, h, el.radius) : rectRing(-w / 2, -h / 2, w, h, el.stroke, el.radius);
      if (!el.filled) minStroke = el.stroke;
      break;
    case 'ellipse':
      local = el.filled ? ellipsePath(0, 0, w / 2, h / 2) : ellipseRing(0, 0, w / 2, h / 2, el.stroke);
      if (!el.filled) minStroke = el.stroke;
      break;
    case 'line':
      local = rectPath(-w / 2, -el.stroke / 2, w, el.stroke);
      minStroke = el.stroke;
      break;
    case 'star': {
      const r = Math.min(w, h) / 2;
      local = polygonPath(starPoints(0, 0, r, r * 0.45));
      break;
    }
    case 'icon': {
      const icon = iconById(el.icon);
      local = icon ? transformPath(parseSvgPath(icon.d), compose(scale(w / 24, h / 24), translate(-12, -12))) : [];
      fillRule = 'evenodd';
      break;
    }
  }
  return { path: transformPath(local, m), fillRule, minStroke };
}

function renderImage(el: ImageElement): RenderItem {
  const m = compose(elementMatrix(el), translate(-el.width / 2, -el.height / 2));
  if (el.vector) {
    // Vector data is normalised to width 1.
    const path = transformPath(parseSvgPath(el.vector), compose(m, scale(el.width)));
    return { kind: 'path', id: el.id, path, fillRule: 'evenodd', bbox: bboxOf(pathPoints(path)) };
  }
  const corners = [
    [0, 0],
    [el.width, 0],
    [el.width, el.height],
    [0, el.height],
  ].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] as [number, number]);
  return {
    kind: 'image',
    id: el.id,
    href: el.src,
    matrix: compose(m, scale(el.width, el.height)),
    width: el.width,
    height: el.height,
    bbox: bboxOf(corners),
  };
}

// ------------------------------------------------------------------ border

export function borderPath(design: Design): Path {
  const b = design.border;
  if (b.style === 'none') return [];
  const { width: W, height: H } = design;
  const t = b.thickness;
  const round = design.shape === 'round' || b.style === 'circle' || b.style === 'oval';
  const ring = (inset: number, th = t) =>
    round
      ? ellipseRing(W / 2, H / 2, W / 2 - inset, H / 2 - inset, th)
      : rectRing(inset, inset, W - 2 * inset, H - 2 * inset, th, b.style === 'rounded' ? Math.min(W, H) * 0.15 : 0);
  switch (b.style) {
    case 'double':
      return [...ring(b.inset), ...ring(b.inset + t + b.gap, Math.max(0.2, t * 0.6))];
    case 'minimal':
      return ring(b.inset, Math.max(0.2, t * 0.6));
    case 'dashed':
      return dashedBorder(design, round);
    default:
      return ring(b.inset);
  }
}

/** Dashes as individual filled rectangles, following a rectangle or ellipse. */
function dashedBorder(design: Design, round: boolean): Path {
  const { width: W, height: H, border: b } = design;
  const t = b.thickness;
  const dash = Math.max(1, t * 4);
  const gap = Math.max(0.6, t * 2.5);
  const out: Path = [];
  const piece = (x: number, y: number, angle: number) =>
    out.push(...transformPath(rectPath(-dash / 2, -t / 2, dash, t), compose(translate(x, y), rotate(angle))));
  if (round) {
    const rx = W / 2 - b.inset - t / 2;
    const ry = H / 2 - b.inset - t / 2;
    const circumference = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    const count = Math.max(8, Math.round(circumference / (dash + gap)));
    for (let i = 0; i < count; i++) {
      const a = (2 * Math.PI * i) / count;
      const x = W / 2 + rx * Math.cos(a);
      const y = H / 2 + ry * Math.sin(a);
      const tangent = Math.atan2(ry * Math.cos(a), -rx * Math.sin(a));
      piece(x, y, (tangent * 180) / Math.PI);
    }
  } else {
    const x0 = b.inset + t / 2;
    const y0 = b.inset + t / 2;
    const w = W - 2 * x0;
    const h = H - 2 * y0;
    const side = (len: number, fn: (d: number) => void) => {
      const count = Math.max(1, Math.round(len / (dash + gap)));
      const step = len / count;
      for (let i = 0; i < count; i++) fn(step * (i + 0.5));
    };
    side(w, (d) => piece(x0 + d, y0, 0));
    side(w, (d) => piece(x0 + d, y0 + h, 0));
    side(h, (d) => piece(x0, y0 + d, 90));
    side(h, (d) => piece(x0 + w, y0 + d, 90));
  }
  return out;
}

// ------------------------------------------------------------------ main

export function renderDesign(design: Design, resolveFace: FaceResolver): RenderResult {
  const items: RenderItem[] = [];
  const info: Record<string, ElementInfo> = {};
  const fallback = resolveFace('heebo', false);

  const border = borderPath(design);
  if (border.length) {
    const bbox = bboxOf(pathPoints(border));
    items.push({ kind: 'path', id: 'border', path: border, fillRule: 'nonzero', bbox });
    info.border = { id: 'border', bbox, minStroke: design.border.style === 'double' || design.border.style === 'minimal' ? Math.max(0.2, design.border.thickness * 0.6) : design.border.thickness };
  }

  for (const el of design.elements) {
    if (el.hidden) continue;
    if (el.type === 'text') {
      const face = resolveFace(el.font, el.bold) ?? fallback;
      if (!face || !el.text.trim()) {
        info[el.id] = { id: el.id, bbox: { ...EMPTY_BBOX } };
        continue;
      }
      const { paths, info: i } = renderText(el, face, fallback);
      items.push({ kind: 'path', id: el.id, path: paths, fillRule: 'nonzero', bbox: i.bbox });
      info[el.id] = i;
    } else if (el.type === 'shape') {
      const { path, fillRule, minStroke } = renderShape(el);
      const bbox = bboxOf(pathPoints(path));
      items.push({ kind: 'path', id: el.id, path, fillRule, bbox });
      info[el.id] = { id: el.id, bbox, minStroke };
    } else {
      const item = renderImage(el);
      items.push(item);
      info[el.id] = { id: el.id, bbox: item.bbox };
    }
  }
  return { width: design.width, height: design.height, shape: design.shape, items, info };
}

export function contentBBox(result: RenderResult): BBox {
  return result.items.reduce((b, it) => unionBBox(b, it.bbox), { ...EMPTY_BBOX });
}
