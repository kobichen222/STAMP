/**
 * "Engraved = seen": the laser file of a bot stamp is built from the very SVG the customer saw. For a matrix of
 * forms (every kind, every look the drawer offers, 1 / 3 / 6 lines, a field line, a template, every library icon on
 * every kind) the drawing is converted to filled paths and both are rasterised by resvg - an independent renderer -
 * at 20 px per mm: the production file must cover the same pixels as the sketch, with the sketch's ink painted black.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { Resvg } from '@resvg/resvg-js';
import { toProductionPdf, toProductionSvg } from '@/designer/production';
import { parseSvgPath } from '@/designer/geometry';
import type { Design } from '@/designer/types';
import { cleanForm, WRITTEN, type Form } from '@/stamp-bot/form';
import { drawForm, SHAPES } from '@/stamp-bot/draw';
import { INKS, INK_NAMES, KINDS, KIND_NAMES, type Kind } from '@/stamp-bot/kinds';
import { ICONS, ICON_NAMES } from '@/stamp-bot/icons';
import { linePath, setLine } from '@/stamp-bot/glyphs';
import { botPreflight, convert, renderBot } from '@/stamp-bot/production';

const PX_PER_MM = 20;
const GREY = 128; // a pixel differs when the two renders are more than mid-grey apart (0..255)
// of the inked pixels of the sketch. honest anti-aliasing measured 0 differing pixels over the whole matrix; 0.1%
// (not the 1% first asked) because one missing ornament star of a seal is ~0.9% of its ink
const MAX_DIFF = 0.001;

const LINES = ['משה כהן', 'עורך דין ונוטריון', 'רחוב הרצל 12, תל אביב', 'טל. 03-5551234', 'ת.ז. 012345674', 'moshe@cohen.co.il'];
const STATUS_LINES = ['שולם', 'במזומן', 'הנהלת חשבונות', 'טל. 03-5551234', 'ת.ז. 012345674', 'סניף מרכז'];

type Case = { name: string; raw: Record<string, unknown> };

function written(kind: Kind, count: number, extra: Record<string, unknown> = {}) {
  const lines = (kind === 'status' ? STATUS_LINES : LINES).slice(0, count);
  return { tmpl: WRITTEN, kind, written: lines.map((text, i) => ({ text, level: i === 0 ? 1 : i === 1 ? 2 : 3 })), ...extra };
}

const cases: Case[] = [];
let n = 0;
for (const kind of KIND_NAMES) {
  for (const { id: look } of SHAPES[kind].looks) {
    const base = () => ({ look, color: INK_NAMES[n++ % INK_NAMES.length] });
    for (const count of [1, 3, 6]) cases.push({ name: `${kind}/${look}/${count} lines`, raw: written(kind, count, base()) });
    cases.push({ name: `${kind}/${look}/field`, raw: written(kind, 2, { ...base(), fields: ['תאריך'] }) });
    cases.push({
      name: `${kind}/${look}/company`,
      raw: {
        tmpl: 'company',
        kind,
        ...base(),
        slots: { name: 'אבני דרך בע"מ', english: 'Avnei Derech Ltd', signer: 'דנה לוי', position: 'מנכ"לית', number: '514444444' },
        tail: { address: 'הרצל 12, חיפה', phones: ['0501234567'] },
      },
    });
  }
  // every library icon at least once on every kind (they all allow icons), walking the looks, places and sizes
  const looks = SHAPES[kind].looks;
  const places = KINDS[kind].iconPos;
  ICON_NAMES.forEach((icon, i) => {
    const look = looks[i % looks.length].id;
    const iconPos = places[i % places.length];
    const iconSize = (['s', 'm', 'l'] as const)[i % 3];
    cases.push({ name: `${kind}/${look}/icon ${icon} ${iconPos}`, raw: written(kind, 2, { look, icon, iconPos, iconSize, color: INK_NAMES[n++ % INK_NAMES.length] }) });
  });
}

function raster(svg: string, widthPx: number) {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: widthPx }, background: 'white' }).render();
  return { w: img.width, h: img.height, px: img.pixels };
}

// how many pixels the two renders disagree on, against the inked pixels of the sketch
function compare(sketch: string, production: string, widthMm: number) {
  const a = raster(sketch, Math.round(widthMm * PX_PER_MM));
  const b = raster(production, Math.round(widthMm * PX_PER_MM));
  expect(Math.abs(a.w - b.w)).toBeLessThanOrEqual(1);
  expect(Math.abs(a.h - b.h)).toBeLessThanOrEqual(1);
  const w = Math.min(a.w, b.w);
  const h = Math.min(a.h, b.h);
  const grey = (img: typeof a, x: number, y: number) => {
    const i = (y * img.w + x) * 4;
    return (img.px[i] + img.px[i + 1] + img.px[i + 2]) / 3;
  };
  let inked = 0;
  let diff = 0;
  let soft = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ga = grey(a, x, y);
      const d = Math.abs(ga - grey(b, x, y));
      if (ga < 128) inked++;
      if (d > GREY) diff++;
      if (d > 32) soft++;
    }
  return { inked, diff, soft };
}

const stats = { run: 0, passed: 0, skipped: [] as string[], worst: { ratio: 0, name: '' }, worstSoft: { ratio: 0, name: '' } };

afterAll(() => {
  console.log(
    `[bot production] matrix ${cases.length}: run ${stats.run}, passed ${stats.passed}, skipped (not drawable) ${stats.skipped.length}` +
      (stats.skipped.length ? ` [${stats.skipped.join('; ')}]` : '') +
      `\n  worst differing pixels (> ${GREY}): ${(stats.worst.ratio * 100).toFixed(3)}% of ink at ${stats.worst.name}` +
      `\n  worst pixels off by more than 32 levels: ${(stats.worstSoft.ratio * 100).toFixed(3)}% of ink at ${stats.worstSoft.name}`,
  );
});

describe('bot stamp: the laser file is the drawing the customer saw', () => {
  it('the matrix covers every kind and look', () => {
    const looks = KIND_NAMES.reduce((a, k) => a + SHAPES[k].looks.length, 0);
    expect(cases.length).toBe(looks * 5 + KIND_NAMES.length * ICON_NAMES.length);
  });

  for (const c of cases) {
    it(c.name, async (ctx) => {
      const form: Form = cleanForm(c.raw);
      const drawn = drawForm(form);
      if (!drawn.ok) {
        stats.skipped.push(c.name);
        ctx.skip();
        return;
      }
      stats.run++;
      const [w, h] = drawn.size.split('x').map(Number);
      const render = convert(drawn.svg, form.kind === 'round' ? 'round' : 'rect');
      expect(render.width).toBe(w);
      expect(render.height).toBe(h);

      const prod = toProductionSvg(render);
      expect(prod.match(/stroke="[^"]*"/g)?.every((s) => s === 'stroke="none"') ?? true).toBe(true);
      expect(prod).not.toMatch(/transform/);
      expect(prod).not.toMatch(/#fff\b|#ffffff|white/i);

      const design: Design = {
        version: 1,
        modelId: 'bot-test',
        shape: render.shape,
        width: w,
        height: h,
        border: { style: 'none', thickness: 0, inset: 0, gap: 0 },
        elements: [],
        inkColor: form.color,
      };
      const errors = botPreflight(render, design).filter((i) => i.severity === 'error');
      expect(errors).toEqual([]);

      const pdf = await toProductionPdf(render);
      expect(pdf.length).toBeGreaterThan(500);

      // the sketch exactly as the customer saw it, its ink (fill and stroke) painted black
      const sketch = drawn.svg.split(INKS[form.color]).join('#000000');
      const { inked, diff, soft } = compare(sketch, prod, w);
      expect(inked).toBeGreaterThan(0);
      const ratio = diff / inked;
      if (ratio >= stats.worst.ratio) stats.worst = { ratio, name: c.name };
      if (soft / inked >= stats.worstSoft.ratio) stats.worstSoft = { ratio: soft / inked, name: c.name };
      expect(ratio).toBeLessThan(MAX_DIFF);
      stats.passed++;
    }, 30000);
  }
});

describe('renderBot', () => {
  it('redraws a bot line from its form and converts the same drawing', () => {
    const form = cleanForm(written('round', 3, { look: 'classic', color: 'blue', icon: 'scales', iconPos: 'center' }));
    const drawn = drawForm(form);
    expect(drawn.ok).toBe(true);
    const [w, h] = drawn.size.split('x').map(Number);
    const design: Design = {
      version: 1,
      modelId: 'bot-test',
      shape: 'round',
      width: w,
      height: h,
      border: { style: 'none', thickness: 0, inset: 0, gap: 0 },
      elements: [],
      inkColor: 'blue',
      bot: { form: JSON.stringify({ ...form, size: drawn.size, look: drawn.look }) },
    };
    const render = renderBot(design);
    expect(toProductionSvg(render)).toBe(toProductionSvg(convert(drawn.svg, 'round')));
    expect(botPreflight(render, design).filter((i) => i.severity === 'error')).toEqual([]);
    expect(botPreflight(render, { ...design, width: w + 1 }).map((i) => i.code)).toContain('size-mismatch');
    expect(botPreflight({ ...render, items: [] }, design).map((i) => i.code)).toEqual(['empty']);
  });
});

describe('convert refuses what it does not know', () => {
  const ok = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" role="img"><title>t</title><g fill="#1b1b1f">${body}</g></svg>`;

  it('reads a known drawing', () => {
    const r = convert(ok('<rect x="10" y="10" width="280" height="180" rx="14" fill="none" stroke="#1b1b1f" stroke-width="6"/><circle cx="150" cy="100" r="5"/>'));
    expect(r.width).toBe(30);
    expect(r.height).toBe(20);
    expect(r.items.length).toBe(2);
    const design: Design = { version: 1, modelId: 't', shape: 'rect', width: 30, height: 20, border: { style: 'none', thickness: 0, inset: 0, gap: 0 }, elements: [], inkColor: 'black' };
    expect(botPreflight(r, design).filter((i) => i.severity === 'error')).toEqual([]);
    const out = convert(ok('<circle cx="-5" cy="100" r="10"/>'));
    expect(botPreflight(out, design).map((i) => i.code)).toContain('out-of-bounds');
    // a round artboard is a circle: a dot in the corner of the square is outside it
    const corner = convert(ok('<circle cx="15" cy="15" r="10"/>'), 'round');
    expect(botPreflight(corner, { ...design, shape: 'round', width: 20, height: 20 }).map((i) => i.code)).toContain('out-of-bounds');
  });
  it('shapes the drawer does not use today still convert exactly (ellipse, sharp and tight corners, open curve)', () => {
    const svg = ok(
      '<ellipse cx="80" cy="100" rx="60" ry="35" fill="none" stroke="#1b1b1f" stroke-width="9"/>' +
        '<rect x="160" y="20" width="120" height="70" fill="none" stroke="#1b1b1f" stroke-width="8"/>' +
        '<rect x="160" y="110" width="120" height="70" rx="3" fill="none" stroke="#1b1b1f" stroke-width="10"/>' +
        '<g transform="translate(20 20) scale(0.5)"><path d="M10 10C60 -20 90 80 140 40" fill="none" stroke="#1b1b1f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>',
    );
    const r = convert(svg);
    const { inked, diff } = compare(svg.split('#1b1b1f').join('#000000'), toProductionSvg(r), r.width);
    expect(diff / inked).toBeLessThan(MAX_DIFF);
  });
  it('throws on an unknown tag', () => {
    expect(() => convert(ok('<text x="1" y="1">שלום</text>'))).toThrow(/unknown element <text>/);
  });
  it('throws on an unknown attribute', () => {
    expect(() => convert(ok('<path d="M0 0L10 10Z" opacity="0.5"/>'))).toThrow(/unknown attribute opacity/);
  });
  it('throws on white paint', () => {
    expect(() => convert(ok('<path d="M0 0L10 10L0 10Z" fill="#fff"/>'))).toThrow(/white/);
  });
  it('throws on a transform it does not know', () => {
    expect(() => convert(ok('<g transform="rotate(10)"><path d="M0 0L10 10L0 10Z"/></g>'))).toThrow(/transform/);
  });
  it('throws on a foreign colour', () => {
    expect(() => convert(ok('<path d="M0 0L10 10L0 10Z" fill="#ff0000"/>'))).toThrow(/not the ink/);
  });
});

describe('parseSvgPath reads everything the drawer writes', () => {
  const absolute = (d: string) => {
    const p = parseSvgPath(d);
    expect(p.length).toBeGreaterThan(0);
    expect(p[0].t).toBe('M');
    for (const c of p) {
      expect(['M', 'L', 'C', 'Z']).toContain(c.t);
      if (c.t !== 'Z') expect(c.p.every(Number.isFinite)).toBe(true);
      if (c.t === 'C') expect([...c.c1, ...c.c2].every(Number.isFinite)).toBe(true);
    }
  };
  it('every library icon (relative a / h / v / z included)', () => {
    for (const ic of Object.values(ICONS)) {
      if (ic.fill) absolute(ic.fill);
      if (ic.stroke) absolute(ic.stroke);
    }
  });
  it('a glyph line (Q curves)', () => {
    for (const font of ['sans', 'serif'] as const) absolute(linePath(setLine('אבג קשת 123', font, 'bold', 40), (x) => ({ x: 100 + x, y: 50, a: 0 })));
  });
});
