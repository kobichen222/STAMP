/**
 * Deep check of every template and every quick-design look on every catalog
 * stamp: production errors, elements overlapping each other, text crossing the
 * frame / inner ring, and text crowding the edge.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import site from '../content/site.json';
import { composeForProduction } from '@/designer/autofix';
import { LOOK_IDS, type LayoutContent } from '@/designer/compose';
import type { Pt } from '@/designer/geometry';
import { designerModelForProduct } from '@/designer/models';
import { profileForModel } from '@/designer/profiles';
import { renderDesign, type FaceResolver, type RenderResult } from '@/designer/render';
import { TEMPLATES } from '@/designer/templates';
import type { Design, StampModel } from '@/designer/types';
import { validateDesign } from '@/designer/validate';
import { loadAllFaces } from './helpers';

let faces: FaceResolver;
beforeAll(async () => {
  faces = await loadAllFaces();
});

const models = new Map<string, StampModel>();
for (const p of (site as { products: Parameters<typeof designerModelForProduct>[0][] }).products) {
  const m = designerModelForProduct(p);
  if (m && Math.min(m.width, m.height) >= 12) models.set(`${m.shape}-${m.width}x${m.height}-${m.dateBand ? 'd' : ''}-${m.maxLines ?? ''}`, m);
}

type Box = { minX: number; minY: number; maxX: number; maxY: number; pts: Pt[] };

/** Contours (one per sub-path, i.e. per glyph / shape part) with their points. */
function contours(r: RenderResult): Map<string, Box[]> {
  const out = new Map<string, Box[]>();
  for (const it of r.items) {
    const list = out.get(it.id) ?? [];
    if (it.kind === 'image') {
      const b = it.bbox;
      list.push({ ...b, pts: [[b.minX, b.minY], [b.maxX, b.minY], [b.maxX, b.maxY], [b.minX, b.maxY]] });
    } else {
      let pts: Pt[] = [];
      const flush = () => {
        if (pts.length) {
          const xs = pts.map((p) => p[0]);
          const ys = pts.map((p) => p[1]);
          list.push({ minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys), pts });
        }
        pts = [];
      };
      let last: Pt = [0, 0];
      for (const c of it.path) {
        if (c.t === 'M') {
          flush();
          pts.push(c.p);
          last = c.p;
        } else if (c.t === 'L') {
          pts.push(c.p);
          last = c.p;
        } else if (c.t === 'C') {
          for (let i = 1; i <= 4; i++) {
            const t = i / 4;
            const u = 1 - t;
            pts.push([
              u * u * u * last[0] + 3 * u * u * t * c.c1[0] + 3 * u * t * t * c.c2[0] + t * t * t * c.p[0],
              u * u * u * last[1] + 3 * u * u * t * c.c1[1] + 3 * u * t * t * c.c2[1] + t * t * t * c.p[1],
            ]);
          }
          last = c.p;
        }
      }
      flush();
    }
    out.set(it.id, list);
  }
  return out;
}

const GAP = 0.15; // mm – parts closer than this merge into one blob on rubber

function problems(d: Design): string[] {
  const r = renderDesign(d, faces);
  const issues: string[] = [];
  const els = new Map(d.elements.map((e) => [e.id, e]));
  const parts = contours(r);
  const content = [...parts.entries()].filter(([id]) => id !== 'border' && els.get(id)?.type !== 'shape');

  // 1. Text / logo against each other (glyph boxes of different elements).
  for (let i = 0; i < content.length; i++)
    for (let j = i + 1; j < content.length; j++) {
      const [ia, A] = content[i];
      const [ib, B] = content[j];
      const hit = A.some((a) => B.some((b) => a.minX < b.maxX - GAP && b.minX < a.maxX - GAP && a.minY < b.maxY - GAP && b.minY < a.maxY - GAP));
      if (hit) issues.push(`overlap:${kind(ia)}/${kind(ib)}`);
    }

  // 2. Text / logo against separator lines.
  for (const [sid, S] of parts) {
    const el = els.get(sid);
    if (el?.type !== 'shape' || el.kind !== 'line') continue;
    for (const [cid, C] of content) {
      if (C.some((c) => S.some((s) => c.minX < s.maxX && s.minX < c.maxX && c.minY < s.maxY + GAP && s.minY - GAP < c.maxY))) issues.push(`line-touches:${kind(cid)}`);
    }
  }

  // 3. Text / logo against the frame and the inner ring of round stamps.
  const allPts = (id: string) => (parts.get(id) ?? []).flatMap((b) => b.pts);
  const W = d.width;
  const H = d.height;
  const b = d.border;
  if (b.style !== 'none') {
    const depth = b.inset + b.thickness + (b.style === 'double' ? b.gap + Math.max(0.2, b.thickness * 0.6) : 0);
    for (const [cid] of content) {
      const pts = allPts(cid);
      const bad =
        d.shape === 'round'
          ? pts.some(([x, y]) => Math.hypot(x - W / 2, y - H / 2) > W / 2 - depth - GAP)
          : pts.some(([x, y]) => x < depth + GAP || x > W - depth - GAP || y < depth + GAP || y > H - depth - GAP);
      if (bad) issues.push(`frame-touches:${kind(cid)}`);
    }
  }
  for (const el of d.elements) {
    if (el.type !== 'shape' || el.kind !== 'ellipse' || el.filled) continue;
    const rIn = el.width / 2 - el.stroke / 2 - GAP;
    const rOut = el.width / 2 + el.stroke / 2 + GAP;
    for (const [cid] of content) {
      const pts = allPts(cid);
      const ds = pts.map(([x, y]) => Math.hypot(x - el.x, y - el.y));
      const inside = ds.every((v) => v < rIn);
      const outside = ds.every((v) => v > rOut);
      if (!inside && !outside) issues.push(`ring-touches:${kind(cid)}`);
    }
  }

  // 4. Production check (errors and warnings, except the logo-quality notes on sample logos).
  const profile = profileForModel({ ...(d as unknown as StampModel), id: d.modelId });
  for (const i of validateDesign(d, r, profile)) if (i.severity !== 'info' && !['logo-raster', 'logo-resolution', 'empty'].includes(i.code)) issues.push(`${i.severity}:${i.code}`);
  return [...new Set(issues)];

  function kind(id: string) {
    const e = els.get(id);
    return e?.type === 'text' ? `"${e.text.slice(0, 14)}"` : (e?.type ?? id);
  }
}

const SAMPLES: LayoutContent[] = [
  { lines: ['עו״ד ישראל ישראלי', 'מ.ר. 12345', 'רח׳ הרצל 1, תל אביב'] },
  { lines: ['חברת דוגמה בע״מ', 'ח.פ. 512345678', 'רח׳ הרצל 1, תל אביב', 'טל׳ 03-1234567'] },
  { lines: ['משפחת כהן', 'הגפן 5, רמת גן'] },
];

describe('template audit', () => {
  it('templates: no overlaps, frame/ring clear, production-ready', () => {
    const report: string[] = [];
    for (const m of models.values()) {
      const profile = profileForModel(m);
      for (const t of TEMPLATES) {
        if (t.shape && t.shape !== m.shape) continue;
        const { design } = composeForProduction(m, t.content, t.style, faces, profile);
        const p = problems(design);
        if (p.length) report.push(`${t.id} @ ${m.name} ${m.width}x${m.height}${m.maxLines ? `/${m.maxLines}` : ''}: ${p.join(' ')}`);
      }
    }
    console.log(`TEMPLATES ${report.length} issues\n` + report.join('\n'));
    expect(report.filter((l) => / error:|overlap|frame-touches|ring-touches|line-touches/.test(l))).toEqual([]);
  }, 300_000);

  it('quick-design looks: no overlaps, frame/ring clear, production-ready', () => {
    const report: string[] = [];
    for (const m of models.values()) {
      const profile = profileForModel(m);
      for (const look of LOOK_IDS)
        for (const [si, c] of SAMPLES.entries()) {
          if (m.maxLines && c.lines.length > m.maxLines) continue;
          const content = m.shape === 'round' && c.lines.length >= 2 ? { arcTop: c.lines[0], arcBottom: c.lines[c.lines.length - 1], lines: c.lines.slice(1, -1), look } : { ...c, look };
          const { design } = composeForProduction(m, content, 'classic', faces, profile, { strict: true });
          const p = problems(design);
          // Content that does not fit even the plain classic layout is "too much text for this size" –
          // the quick-design shows it as crowded and recommends a bigger stamp; the look itself is not at fault.
          const base = problems(composeForProduction(m, { ...content, look: undefined }, 'classic', faces, profile, { strict: true }).design);
          const baseBad = base.some((x) => /overlap|touches|error:/.test(x));
          if (p.length) report.push(`${baseBad ? '(too much text) ' : ''}${look}#${si} @ ${m.name} ${m.width}x${m.height}: ${p.join(' ')}`);
        }
    }
    console.log(`LOOKS ${report.length} issues\n` + report.join('\n'));
    expect(report.filter((l) => !l.startsWith('(too much text)') && / error:|overlap|frame-touches|ring-touches|line-touches/.test(l))).toEqual([]);
  }, 300_000);
});
