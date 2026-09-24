import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { loadAllFaces } from './helpers';
import { composeLayout, newDesign, newShape, newText } from '@/designer/compose';
import { renderDesign, type FaceResolver } from '@/designer/render';
import { validateDesign, isProductionReady } from '@/designer/validate';
import { autoFix } from '@/designer/autofix';
import { productionBaseName, toProductionEps, toProductionPdf, toProductionSvg } from '@/designer/production';
import { designerModelForProduct, parseStampArea } from '@/designer/models';
import { TEMPLATES } from '@/designer/templates';
import type { StampModel } from '@/designer/types';
import site from '../content/site.json';

let faces: FaceResolver;
beforeAll(async () => {
  faces = await loadAllFaces();
});

const rect: StampModel = { id: 't', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
const round: StampModel = { id: 'r', name: 'R 540', shape: 'round', width: 40, height: 40 };

describe('models', () => {
  it('parses WooCommerce stamp areas', () => {
    expect(parseStampArea('47*18')).toEqual({ a: 47, b: 18, diameter: false });
    expect(parseStampArea('קוטר 40')?.diameter).toBe(true);
    expect(parseStampArea(null)).toBeNull();
  });
  it('derives a model for every product with a size', () => {
    const models = site.products.map((p) => designerModelForProduct(p as never)).filter(Boolean);
    expect(models.length).toBeGreaterThan(50);
    const r540 = designerModelForProduct(site.products.find((p) => p.slug === 'print-r-540') as never)!;
    expect(r540).toMatchObject({ shape: 'round', width: 40, height: 40 });
    const pen = designerModelForProduct(site.products.find((p) => p.title === 'חותמת עט כסף קלאסי') as never)!;
    expect(pen).toMatchObject({ shape: 'rect', width: 35, height: 7 });
  });
});

describe('render + validation', () => {
  it('renders text to outlines inside the stamp', () => {
    const d = newDesign(rect);
    d.elements.push(newText(d, 'עו״ד ישראל ישראלי\nטל׳ 03-1234567', { size: 10 }));
    const r = renderDesign(d, faces);
    expect(r.items).toHaveLength(1);
    const it = r.items[0];
    expect(it.kind).toBe('path');
    expect(it.bbox.minX).toBeGreaterThan(0);
    expect(it.bbox.maxX).toBeLessThan(58);
    expect(r.info[d.elements[0].id].missingGlyphs).toEqual([]);
    expect(isProductionReady(validateDesign(d, r))).toBe(true);
  });

  it('shrinks text wider than its box', () => {
    const d = newDesign(rect);
    d.elements.push(newText(d, 'טקסט ארוך מאוד שלא נכנס ברוחב של החותמת בכלל', { size: 14, maxWidth: 50 }));
    const r = renderDesign(d, faces);
    const info = r.info[d.elements[0].id];
    expect(info.shrunk).toBe(true);
    expect(info.bbox.maxX - info.bbox.minX).toBeLessThanOrEqual(50.5);
  });

  it('flags and auto-fixes overflow, tiny text and thin lines', () => {
    const d = newDesign(rect);
    d.elements.push(newText(d, 'חורג', { size: 12, x: 1, maxWidth: 0 }));
    d.elements.push(newText(d, 'קטן', { size: 4, y: 18 }));
    d.elements.push(newShape(d, 'line', { stroke: 0.1, y: 5 }));
    const issues = validateDesign(d, renderDesign(d, faces));
    const codes = issues.map((i) => i.code);
    expect(codes).toContain('out-of-bounds');
    expect(codes).toContain('font-too-small');
    expect(codes).toContain('stroke-too-thin');
    const fixed = autoFix(d, faces);
    const after = validateDesign(fixed, renderDesign(fixed, faces));
    expect(after.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('empty design is not production ready', () => {
    const d = newDesign(rect);
    expect(isProductionReady(validateDesign(d, renderDesign(d, faces)))).toBe(false);
  });

  it('every template produces a valid design on rect and round stamps', () => {
    for (const t of TEMPLATES.filter((t) => !t.withLogo)) {
      for (const m of [rect, round, { ...rect, width: 38, height: 14, id: 's' }]) {
        const d = autoFix(composeLayout(m, t.content, t.style), faces);
        const errors = validateDesign(d, renderDesign(d, faces)).filter((i) => i.severity === 'error');
        expect(errors, `${t.id} on ${m.width}x${m.height}`).toEqual([]);
      }
    }
  });

  it('keeps round-stamp arc text inside the circle', () => {
    const d = composeLayout(round, { arcTop: 'שם החברה בע״מ', arcBottom: 'ח.פ. 512345678', lines: ['מאושר'] }, 'classic');
    const r = renderDesign(d, faces);
    const issues = validateDesign(d, r).filter((i) => i.code === 'out-of-bounds');
    expect(issues).toEqual([]);
  });
});

describe('production files', () => {
  const build = () => {
    const d = composeLayout(rect, { lines: ['ישראל ישראלי', 'עורך דין', 'מ.ר. 12345'] }, 'classic');
    return renderDesign(d, faces);
  };

  it('SVG is 1:1 in mm with filled black paths only', () => {
    const svg = toProductionSvg(build());
    expect(svg).toContain('width="58mm" height="22mm" viewBox="0 0 58 22"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toMatch(/<text|stroke-width|font-family/);
  });

  it('PDF page is exactly the stamp size', async () => {
    const bytes = await toProductionPdf(build(), {}, { width: 58, height: 22, ink: 'black' });
    const doc = await PDFDocument.load(bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo((58 * 72) / 25.4, 2);
    expect(height).toBeCloseTo((22 * 72) / 25.4, 2);
  });

  it('EPS has a matching bounding box and CMYK black', () => {
    const eps = toProductionEps(build(), { mirror: true });
    expect(eps.startsWith('%!PS-Adobe-3.0 EPSF-3.0')).toBe(true);
    expect(eps).toContain('%%BoundingBox: 0 0 165 63');
    expect(eps).toContain('0 0 0 1 setcmykcolor');
  });

  it('builds production file names', () => {
    expect(productionBaseName({ orderId: 'ORD-1824', customer: 'Kobi Cohen', width: 58, height: 22, ink: 'black' })).toBe(
      'ORD-1824_KOBI-COHEN_58x22_BLACK',
    );
  });
});

describe('file naming', () => {
  it('transliterates Hebrew customer names', () => {
    expect(productionBaseName({ orderId: 'ORD-260924-AB12', customer: 'קובי כהן', width: 58, height: 22, ink: 'blue' })).toBe('ORD-260924-AB12_KVBY-KHN_58x22_BLUE');
  });
});
