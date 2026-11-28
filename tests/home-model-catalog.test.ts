/**
 * The home page's model catalog: every body has a sample form the bot engine draws cleanly in that body's own size,
 * and the compressed imprint scale keeps the order of sizes (a bigger stamp never gets a smaller box).
 */
import { describe, expect, it } from 'vitest';
import { BODY_IDS, bodyById, catalogRows } from '@/stamp-bot/bodies';
import { cleanForm } from '@/stamp-bot/form';
import { drawForm } from '@/stamp-bot/draw';
import { SAMPLES } from '@/stamp-bot/samples';
import { imprintSize } from '@/components/home/imprint-size';

describe('home model catalog', () => {
  it('lists the 12 bodies with unique ids, and a sample for exactly those', () => {
    expect(BODY_IDS).toHaveLength(12);
    expect(new Set(BODY_IDS).size).toBe(12);
    expect(Object.keys(SAMPLES).sort()).toEqual([...BODY_IDS].sort());
  });

  for (const id of BODY_IDS) {
    it(`${id}: the sample is drawn in its body's size, with no warning`, () => {
      const b = bodyById(id)!;
      const size = `${b.w}x${b.h}`;
      const form = cleanForm({ ...SAMPLES[id], kind: b.kind, size, color: 'black', look: '' });
      expect(form.tmpl).toBe(SAMPLES[id].tmpl);
      expect(form.size).toBe(size);
      const d = drawForm(form);
      expect(d.warn).toBe('');
      expect(d.ok).toBe(true);
      expect(d.size).toBe(size);
      expect(d.svg).toContain(`viewBox="0 0 ${b.w * 10} ${b.h * 10}"`); // the route pads exactly this viewBox
    });
  }

  it('catalog rows come in list order: rect, round, square, small to big', () => {
    const rows = catalogRows();
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toEqual([...kinds].sort((a, b) => ['rect', 'round', 'square'].indexOf(a) - ['rect', 'round', 'square'].indexOf(b)));
    for (let i = 1; i < rows.length; i++) if (rows[i].kind === rows[i - 1].kind) expect(rows[i].w * rows[i].h).toBeGreaterThanOrEqual(rows[i - 1].w * rows[i - 1].h);
  });

  it('the imprint scale keeps order inside a shape and fits the zone', () => {
    const all = BODY_IDS.map((id) => bodyById(id)!);
    const maxW = Math.max(...all.map((b) => b.w));
    const maxH = Math.max(...all.map((b) => b.h));
    for (const kind of ['rect', 'round', 'square'] as const) {
      const sized = all.filter((b) => b.kind === kind).map((b) => ({ b, s: imprintSize(b.w, b.h, maxW, maxH) }));
      for (let i = 1; i < sized.length; i++) {
        expect(sized[i].s.width).toBeGreaterThanOrEqual(sized[i - 1].s.width);
        expect(sized[i].s.height).toBeGreaterThanOrEqual(sized[i - 1].s.height);
      }
      for (const { s } of sized) {
        expect(s.width).toBeLessThanOrEqual(140);
        expect(s.height).toBeLessThanOrEqual(118);
      }
    }
  });
});
