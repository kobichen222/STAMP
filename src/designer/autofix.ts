import { pathPoints, type Pt } from './geometry';
import type { FaceResolver, RenderItem } from './render';
import { renderDesign } from './render';
import { composeLayout, type LayoutContent, type LayoutStyle } from './compose';
import type { Design, DesignElement, StampModel } from './types';
import { BASE_PROFILE, type ProductionProfile } from './profiles';
import { dateBandRect, overflow, validateDesign } from './validate';

const pointsOf = (item: RenderItem): Pt[] =>
  item.kind === 'path'
    ? pathPoints(item.path)
    : [
        [item.bbox.minX, item.bbox.minY],
        [item.bbox.maxX, item.bbox.maxY],
      ];

function scaleElement(el: DesignElement, f: number): DesignElement {
  if (el.type === 'text') return { ...el, size: Math.round(el.size * f * 10) / 10, curve: el.curve };
  return { ...el, width: el.width * f, height: el.height * f };
}

function moveInside(design: Design, el: DesignElement, item: RenderItem, inset: number): DesignElement {
  const pts = pointsOf(item);
  if (design.shape === 'round') {
    const c = design.width / 2;
    // Pull towards the centre, then shrink if still too big.
    let next = { ...el };
    const needed = overflow(design, pts, inset);
    if (needed <= 0) return el;
    const dx = el.x - c;
    const dy = el.y - c;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.01 && !(el.type === 'text' && el.curve)) {
      const move = Math.min(dist, needed);
      next = { ...next, x: el.x - (dx / dist) * move, y: el.y - (dy / dist) * move };
      return next;
    }
    const R = c - inset;
    const f = Math.max(0.5, R / (R + needed));
    if (el.type === 'text' && el.curve) return { ...el, curve: { ...el.curve, radius: el.curve.radius - needed }, size: el.size * f };
    return scaleElement(next, f);
  }
  const b = item.bbox;
  const W = design.width;
  const H = design.height;
  let out = { ...el };
  const bw = b.maxX - b.minX;
  const bh = b.maxY - b.minY;
  const f = Math.min(1, (W - 2 * inset) / bw, (H - 2 * inset) / bh);
  if (f < 1) {
    out = scaleElement(out, f * 0.98);
    return out; // position is fixed on the next pass
  }
  let dx = 0;
  let dy = 0;
  if (b.minX < inset) dx = inset - b.minX;
  if (b.maxX > W - inset) dx = W - inset - b.maxX;
  if (b.minY < inset) dy = inset - b.minY;
  if (b.maxY > H - inset) dy = H - inset - b.maxY;
  return { ...out, x: out.x + dx, y: out.y + dy };
}

/** Applies automatic fixes ("תקן עבורי") until no fixable issue remains (max 4 passes). */
export function autoFix(design: Design, resolveFace: FaceResolver, profile: ProductionProfile = BASE_PROFILE): Design {
  let d = design;
  for (let pass = 0; pass < 4; pass++) {
    const render = renderDesign(d, resolveFace);
    const issues = validateDesign(d, render, profile).filter((i) => i.fix && i.fix !== 'vectorize');
    if (!issues.length) break;
    const items = Object.fromEntries(render.items.map((i) => [i.id, i]));
    let border = d.border;
    const elements = d.elements.map((el) => {
      let next = el;
      for (const issue of issues.filter((i) => i.elementId === el.id)) {
        if (issue.fix === 'move-inside' && items[el.id]) next = moveInside(d, next, items[el.id], profile.safeMargin);
        if (issue.fix === 'enlarge-text' && next.type === 'text') {
          const eff = render.info[el.id]?.effectiveSize ?? next.size;
          const target = profile.warnFontPt + 0.2;
          const f = target / Math.max(0.1, eff);
          next = { ...next, size: Math.round(next.size * f * 10) / 10, maxWidth: next.maxWidth ? Math.max(next.maxWidth, d.width - 2 * profile.safeMargin) : 0 };
        }
        if (issue.fix === 'thicken' && next.type === 'shape') next = { ...next, stroke: Math.max(next.stroke, profile.warnStroke) };
        if (issue.fix === 'clear-date-band') {
          const band = dateBandRect(d);
          const it = items[el.id];
          if (it) {
            const mid = (it.bbox.minY + it.bbox.maxY) / 2;
            const up = mid < band.y + band.h / 2;
            const dy = up ? band.y - 0.3 - it.bbox.maxY : band.y + band.h + 0.3 - it.bbox.minY;
            next = { ...next, y: next.y + dy };
          }
        }
      }
      return next;
    });
    if (issues.some((i) => i.elementId === 'border' && i.fix === 'thicken')) border = { ...border, thickness: profile.warnStroke / 0.6 };
    d = { ...d, elements, border };
  }
  return d;
}

/**
 * Composes a layout and makes sure it can actually be produced on this model:
 * when text cannot reach the minimum production size, the least important
 * content is dropped (last line first, then the bottom arc) and the rest is
 * re-laid out at a larger size – the way a designer adapts a template to a
 * small stamp. Returns the design and how many items were left out.
 */
export function composeForProduction(
  model: StampModel,
  content: LayoutContent,
  style: LayoutStyle,
  resolveFace: FaceResolver,
  profile: ProductionProfile = BASE_PROFILE,
): { design: Design; dropped: string[] } {
  const hasErrors = (d: Design) => validateDesign(d, renderDesign(d, resolveFace), profile).some((i) => i.severity === 'error' && i.code !== 'empty');
  const compose = (c: LayoutContent) => composeLayout(model, c, style);
  // Prefer the template's own proportions: drop content before resizing text
  // (auto-fixing sizes can push text across inner rings or frames).
  let c: LayoutContent = { ...content, lines: [...content.lines] };
  const dropped: string[] = [];
  for (let guard = 0; guard < 12; guard++) {
    const raw = compose(c);
    if (!hasErrors(raw)) return { design: raw, dropped };
    if (c.lines.length > 1) dropped.push(c.lines.pop()!);
    else if (c.arcBottom && (c.arcTop || c.lines.length)) {
      dropped.push(c.arcBottom);
      c = { ...c, arcBottom: undefined };
    } else if (c.lines.length === 1 && c.lines[0].includes(' ') && !c.arcTop) {
      // A single long line: break it into 2, then 3… balanced lines.
      const words = c.lines[0].split(' ');
      for (let parts = 2; parts <= words.length; parts++) {
        const per = Math.ceil(words.length / parts);
        const lines = Array.from({ length: parts }, (_, i) => words.slice(i * per, (i + 1) * per).join(' ')).filter(Boolean);
        const split = compose({ ...c, lines });
        if (!hasErrors(split)) return { design: split, dropped };
        // Same split in a narrower typeface (Assistant is the most compact).
        if (!c.font) {
          const narrow = compose({ ...c, lines, font: 'assistant' });
          if (!hasErrors(narrow)) return { design: narrow, dropped };
        }
      }
      break;
    } else break;
  }
  // Nothing left to drop – fall back to the automatic fixer.
  const fixedFull = autoFix(compose(content), resolveFace, profile);
  if (!hasErrors(fixedFull)) return { design: fixedFull, dropped: [] };
  return { design: autoFix(compose(c), resolveFace, profile), dropped };
}
