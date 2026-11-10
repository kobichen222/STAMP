import { BASE_PROFILE, type ProductionProfile } from './profiles';
import { pathPoints, type Pt } from './geometry';
import type { Path } from './geometry';
import type { RenderItem, RenderResult } from './render';
import type { Design, DesignElement, ImageElement } from './types';

export type Severity = 'error' | 'warning' | 'info';
export type FixKind = 'move-inside' | 'enlarge-text' | 'thicken' | 'vectorize' | 'clear-date-band';

export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  elementId?: string;
  fix?: FixKind;
}

/** Bitmap limits (per-SKU text/line limits come from the ProductionProfile). */
export const LIMITS = {
  minDpi: 150,
  goodDpi: 300,
  excellentDpi: 600,
};

export type LogoQuality = 'excellent' | 'good' | 'low';

export function imageDpi(el: Pick<ImageElement, 'width' | 'source'>): number {
  return Math.round(el.source.pxWidth / (el.width / 25.4));
}

export function logoQuality(el: ImageElement): LogoQuality {
  if (el.source.isVector || el.vector) return 'excellent';
  const dpi = imageDpi(el);
  return dpi >= LIMITS.excellentDpi ? 'excellent' : dpi >= LIMITS.goodDpi ? 'good' : 'low';
}

function itemPoints(item: RenderItem): Pt[] {
  if (item.kind === 'path') return pathPoints(item.path);
  const b = item.bbox;
  return [
    [b.minX, b.minY],
    [b.maxX, b.minY],
    [b.maxX, b.maxY],
    [b.minX, b.maxY],
  ];
}

/** Largest distance a point lies outside the (inset) stamp area; ≤0 means inside. */
export function overflow(design: Pick<Design, 'shape' | 'width' | 'height'>, pts: Pt[], inset = 0): number {
  let worst = -Infinity;
  if (design.shape === 'round') {
    const c = design.width / 2;
    const R = c - inset;
    for (const [x, y] of pts) worst = Math.max(worst, Math.hypot(x - c, y - c) - R);
  } else {
    for (const [x, y] of pts) {
      worst = Math.max(worst, inset - x, x - (design.width - inset), inset - y, y - (design.height - inset));
    }
  }
  return worst;
}

export function dateBandRect(design: Design) {
  const band = Math.max(5, design.height * 0.26);
  return { x: 0, y: design.height / 2 - band / 2, w: design.width, h: band };
}

const label = (el?: DesignElement) =>
  !el ? 'המסגרת' : el.type === 'text' ? `הטקסט "${el.text.split('\n')[0].slice(0, 18)}"` : el.type === 'image' ? 'הלוגו' : 'הצורה';

/** Gap (mm) under which two parts merge into one blob on the rubber. */
const OVERLAP_GAP = 0.15;

type PartBox = { minX: number; minY: number; maxX: number; maxY: number; pts: Pt[] };

/** One box per contour (glyph / shape part) – tight enough to tell lines of text apart. */
function partBoxes(item: RenderItem): PartBox[] {
  const box = (pts: Pt[]): PartBox => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of pts) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY, pts };
  };
  if (item.kind === 'image') return [box(itemPoints(item))];
  const out: PartBox[] = [];
  let cur: Path = [];
  for (const c of item.path) {
    if (c.t === 'M' && cur.length) {
      out.push(box(pathPoints(cur)));
      cur = [];
    }
    cur.push(c);
  }
  if (cur.length) out.push(box(pathPoints(cur)));
  return out.filter((b) => b.pts.length);
}

const boxesHit = (a: PartBox, b: PartBox, gap: number) => a.minX < b.maxX - gap && b.minX < a.maxX - gap && a.minY < b.maxY - gap && b.minY < a.maxY - gap;

/**
 * Elements running into each other: text / logo over other text or logo, over a
 * separator line, across the frame or across the inner ring of a round stamp.
 */
function overlapIssues(design: Design, render: RenderResult, byId: Record<string, DesignElement>): Issue[] {
  const issues: Issue[] = [];
  const parts = new Map<string, PartBox[]>();
  for (const it of render.items) if (it.kind === 'image' || it.path.length) parts.set(it.id, [...(parts.get(it.id) ?? []), ...partBoxes(it)]);
  const isContent = (id: string) => id !== 'border' && (byId[id]?.type === 'text' || byId[id]?.type === 'image');
  const content = [...parts.entries()].filter(([id]) => isContent(id));
  const add = (id: string, msg: string) => {
    if (!issues.some((i) => i.elementId === id)) issues.push({ code: 'overlap', severity: 'warning', elementId: id, message: msg, fix: 'move-inside' });
  };

  for (let i = 0; i < content.length; i++)
    for (let j = i + 1; j < content.length; j++) {
      const [ia, A] = content[i];
      const [ib, B] = content[j];
      if (A.some((a) => B.some((b) => boxesHit(a, b, OVERLAP_GAP)))) add(ib, `${label(byId[ib])} נוגע ב${label(byId[ia])} – בהחתמה הם יתמזגו`);
    }

  for (const el of design.elements) {
    if (el.type !== 'shape' || el.hidden) continue;
    const S = parts.get(el.id) ?? [];
    if (el.kind === 'line') {
      for (const [cid, C] of content) if (C.some((c) => S.some((s) => c.minX < s.maxX && s.minX < c.maxX && c.minY < s.maxY + OVERLAP_GAP && s.minY - OVERLAP_GAP < c.maxY))) add(cid, `${label(byId[cid])} נוגע בקו המפריד`);
    } else if (el.kind === 'ellipse' && !el.filled) {
      const rIn = Math.min(el.width, el.height) / 2 - el.stroke / 2 - OVERLAP_GAP;
      const rOut = Math.max(el.width, el.height) / 2 + el.stroke / 2 + OVERLAP_GAP;
      for (const [cid, C] of content) {
        const ds = C.flatMap((c) => c.pts).map(([x, y]) => Math.hypot(x - el.x, y - el.y));
        if (!ds.every((v) => v < rIn) && !ds.every((v) => v > rOut)) add(cid, `${label(byId[cid])} חוצה את העיגול הפנימי`);
      }
    }
  }

  const b = design.border;
  if (b.style !== 'none') {
    const depth = b.inset + b.thickness + (b.style === 'double' ? b.gap + Math.max(0.2, b.thickness * 0.6) : 0);
    const { width: W, height: H } = design;
    for (const [cid, C] of content) {
      const pts = C.flatMap((c) => c.pts);
      const hit =
        design.shape === 'round' || b.style === 'circle' || b.style === 'oval'
          ? pts.some(([x, y]) => Math.hypot((x - W / 2) / (W / 2 - depth), (y - H / 2) / (H / 2 - depth)) > 1 - OVERLAP_GAP / (Math.min(W, H) / 2 - depth))
          : pts.some(([x, y]) => x < depth + OVERLAP_GAP || x > W - depth - OVERLAP_GAP || y < depth + OVERLAP_GAP || y > H - depth - OVERLAP_GAP);
      if (hit) add(cid, `${label(byId[cid])} נוגע במסגרת`);
    }
  }
  return issues;
}

export function validateDesign(design: Design, render: RenderResult, profile: ProductionProfile = BASE_PROFILE): Issue[] {
  const issues: Issue[] = [];
  const P = profile;
  const byId = Object.fromEntries(design.elements.map((e) => [e.id, e]));
  const visible = render.items.filter((i) => i.kind === 'image' || i.path.length);

  if (!visible.length || visible.every((i) => i.id === 'border')) {
    issues.push({ code: 'empty', severity: 'error', message: 'העיצוב ריק – הוסיפו טקסט, לוגו או תבנית' });
    return issues;
  }

  for (const item of visible) {
    const el = byId[item.id] as DesignElement | undefined;
    const pts = itemPoints(item);
    const out = overflow(design, pts, 0);
    if (out > 0.05) {
      issues.push({ code: 'out-of-bounds', severity: 'error', elementId: item.id, message: `${label(el)} חורג מאזור ההדפסה`, fix: 'move-inside' });
    } else if (item.id !== 'border' && overflow(design, pts, P.safeMargin) > 0.05) {
      issues.push({ code: 'safe-area', severity: 'warning', elementId: item.id, message: `${label(el)} קרוב מדי לקצה – מומלץ להשאיר ${P.safeMargin} מ"מ שוליים`, fix: 'move-inside' });
    }
    if (design.dateBand && item.id !== 'border') {
      const band = dateBandRect(design);
      const b = item.bbox;
      if (b.maxY > band.y + 0.2 && b.minY < band.y + band.h - 0.2) {
        issues.push({ code: 'date-band', severity: 'error', elementId: item.id, message: `${label(el)} נכנס לחלון התאריך`, fix: 'clear-date-band' });
      }
    }
  }

  for (const [id, info] of Object.entries(render.info)) {
    const el = byId[id] as DesignElement | undefined;
    if (info.effectiveSize != null && el?.type === 'text' && el.text.trim()) {
      if (info.effectiveSize < P.minFontPt - 0.05) {
        issues.push({ code: 'font-too-small', severity: 'error', elementId: id, message: `${label(el)} קטן מדי (${info.effectiveSize.toFixed(1)}pt) – מינימום ${P.minFontPt}pt`, fix: 'enlarge-text' });
      } else if (info.effectiveSize < P.warnFontPt) {
        issues.push({ code: 'font-small', severity: 'warning', elementId: id, message: `${label(el)} קטן – מומלץ להגדיל את הטקסט`, fix: 'enlarge-text' });
      }
    }
    if (info.missingGlyphs?.length) {
      issues.push({ code: 'missing-glyphs', severity: 'error', elementId: id, message: `תווים שאינם נתמכים: ${info.missingGlyphs.join(' ')}` });
    }
    if (info.minStroke != null) {
      if (info.minStroke < P.minStroke) {
        issues.push({ code: 'stroke-too-thin', severity: 'error', elementId: id, message: `קו דק מדי ב${label(el)} (${info.minStroke} מ"מ) – לא ייצא בהחתמה`, fix: 'thicken' });
      } else if (info.minStroke < P.warnStroke) {
        issues.push({ code: 'stroke-thin', severity: 'warning', elementId: id, message: `קו דק ב${label(el)} – עלול לא לצאת טוב בהחתמה`, fix: 'thicken' });
      }
    }
  }

  for (const el of design.elements) {
    if (el.type !== 'image' || el.hidden) continue;
    const q = logoQuality(el);
    if (q === 'low') {
      const severity: Severity = imageDpi(el) < LIMITS.minDpi ? 'error' : 'warning';
      issues.push({ code: 'logo-resolution', severity, elementId: el.id, message: `איכות הלוגו נמוכה (${imageDpi(el)} DPI) ועלולה לגרום לתוצאה פחות חדה`, fix: 'vectorize' });
    }
    if (!el.vector && !el.source.isVector) {
      issues.push({ code: 'logo-raster', severity: 'warning', elementId: el.id, message: 'הלוגו הוא תמונה – מומלץ "המרה לקווים" לקובץ וקטורי נקי', fix: 'vectorize' });
    }
  }
  issues.push(...overlapIssues(design, render, byId));
  if (Math.abs(render.width - design.width) > 0.01 || Math.abs(render.height - design.height) > 0.01) {
    issues.push({ code: 'size-mismatch', severity: 'error', message: 'מידות הקובץ אינן תואמות למוצר' });
  }
  const elementCount = design.elements.filter((e) => !e.hidden).length;
  issues.push({ code: 'summary', severity: 'info', message: `${elementCount} אלמנטים · ${design.width}×${design.height} מ"מ · טקסט יומר לקווים` });
  return issues;
}

/** Admin-facing readiness score (customers only see ready / needs fixes). */
export function preflightScore(issues: Issue[]): number {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  return Math.max(0, 100 - errors * 25 - warnings * 4);
}

export const isProductionReady = (issues: Issue[]) => !issues.some((i) => i.severity === 'error');
