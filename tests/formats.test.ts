/**
 * Production export formats: every format is generated from a real template
 * and checked structurally (headers, sizes, record chains, ink coverage).
 * Set EXPORT_DIR to also write the files to disk for external inspection.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { composeForProduction } from '@/designer/autofix';
import { profileForModel } from '@/designer/profiles';
import { renderDesign, type FaceResolver, type RenderResult } from '@/designer/render';
import { TEMPLATES } from '@/designer/templates';
import type { StampModel } from '@/designer/types';
import { EXPORT_FORMATS, exportRender, rasterize, zip } from '@/server/formats';
import { loadAllFaces } from './helpers';

const RECT: StampModel = { id: 'print-40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
const ROUND: StampModel = { id: 'r40', name: 'R 40', shape: 'round', width: 40, height: 40 };

let faces: FaceResolver;
const renders: Record<string, RenderResult> = {};
beforeAll(async () => {
  faces = await loadAllFaces();
  for (const [key, model, tpl] of [
    ['rect', RECT, TEMPLATES.find((t) => t.shape !== 'round' && t.content.logo)!],
    ['round', ROUND, TEMPLATES.find((t) => t.shape === 'round')!],
  ] as const) {
    const { design } = composeForProduction(model, tpl.content, tpl.style, faces, profileForModel(model));
    renders[key] = renderDesign(design, faces);
  }
});

const bytes = (d: Uint8Array | string) => (typeof d === 'string' ? Buffer.from(d, 'utf8') : Buffer.from(d));
const meta = { orderId: 'ORD-TEST', customer: 'TEST', width: 58, height: 22, ink: 'black' };

describe('production export formats', () => {
  it('exports every format for rect and round stamps', async () => {
    const dir = process.env.EXPORT_DIR;
    for (const [key, r] of Object.entries(renders)) {
      for (const f of EXPORT_FORMATS) {
        const b = bytes(await exportRender(r, f.id, false, meta));
        expect(b.length, `${key}.${f.ext}`).toBeGreaterThan(100);
        if (dir) fs.writeFileSync(path.join(dir, `${key}.${f.ext}`), b);
      }
    }
  });

  it('EMF: valid header and record chain', async () => {
    const b = bytes(await exportRender(renders.rect, 'emf', false));
    expect(b.readUInt32LE(0)).toBe(1);
    expect(b.readUInt32LE(40)).toBe(0x464d4520);
    expect(b.readUInt32LE(48)).toBe(b.length);
    let off = 0;
    let n = 0;
    let last = 0;
    while (off < b.length) {
      last = b.readUInt32LE(off);
      const size = b.readUInt32LE(off + 4);
      expect(size % 4).toBe(0);
      off += size;
      n++;
    }
    expect(off).toBe(b.length);
    expect(last).toBe(14); // EMR_EOF
    expect(b.readUInt32LE(52)).toBe(n);
  });

  it('WMF: placeable header checksum and size', async () => {
    const b = bytes(await exportRender(renders.round, 'wmf', false));
    expect(b.readUInt32LE(0)).toBe(0x9ac6cdd7);
    let sum = 0;
    for (let i = 0; i < 10; i++) sum ^= b.readUInt16LE(i * 2);
    expect(b.readUInt16LE(20)).toBe(sum);
    expect(22 + b.readUInt32LE(22 + 6) * 2).toBe(b.length);
  });

  it('PNG / BMP: 1200 dpi, ink present, mirror flips it', async () => {
    const r = renders.rect;
    const bmp = rasterize(r, false);
    expect(bmp.width).toBe(Math.round((58 * 1200) / 25.4));
    const inkCount = bmp.ink.reduce((a, v) => a + v, 0);
    expect(inkCount / bmp.ink.length).toBeGreaterThan(0.03);
    expect(inkCount / bmp.ink.length).toBeLessThan(0.7);
    const mir = rasterize(r, true);
    const row = Math.floor(bmp.height / 2);
    const a = bmp.ink.subarray(row * bmp.width, (row + 1) * bmp.width);
    const m = mir.ink.subarray(row * bmp.width, (row + 1) * bmp.width);
    let same = 0;
    for (let x = 0; x < bmp.width; x++) if (a[x] === m[bmp.width - 1 - x]) same++;
    expect(same / bmp.width).toBeGreaterThan(0.98);

    const png = bytes(await exportRender(r, 'png', false));
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    const idat = png.indexOf('IDAT');
    const len = png.readUInt32BE(idat - 4);
    const raw = zlib.inflateSync(png.subarray(idat + 4, idat + 4 + len));
    expect(raw.length).toBe((Math.ceil(bmp.width / 8) + 1) * bmp.height);
    const bm = bytes(await exportRender(r, 'bmp', false));
    expect(bm.subarray(0, 2).toString()).toBe('BM');
    expect(bm.readUInt32LE(2)).toBe(bm.length);
  });

  it('vector text formats carry the geometry', async () => {
    const r = renders.round;
    const ai = String(await exportRender(r, 'ai', false));
    expect(ai.startsWith('%!PS-Adobe')).toBe(true);
    expect(ai).toContain('Adobe Illustrator');
    expect((ai.match(/ C\r\n/g) ?? []).length).toBeGreaterThan(50);
    const dxf = String(await exportRender(r, 'dxf', false));
    expect((dxf.match(/POLYLINE/g) ?? []).length).toBeGreaterThan(10);
    expect(dxf.trim().endsWith('EOF')).toBe(true);
    const plt = String(await exportRender(r, 'plt', false));
    expect(plt.startsWith('IN;')).toBe(true);
    // 40 plotter units per mm – nothing outside the 40 mm artboard.
    const nums = [...plt.matchAll(/(-?\d+),(-?\d+)/g)].flatMap((m) => [Number(m[1]), Number(m[2])]);
    expect(Math.max(...nums)).toBeLessThanOrEqual(40 * 40 + 1);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(-1);
  });

  it('ZIP: readable central directory', () => {
    const z = Buffer.from(zip([{ name: 'a.txt', data: 'hello' }, { name: 'b.bin', data: new Uint8Array([1, 2, 3]) }]));
    const end = z.length - 22;
    expect(z.readUInt32LE(end)).toBe(0x06054b50);
    expect(z.readUInt16LE(end + 10)).toBe(2);
    expect(z.readUInt32LE(0)).toBe(0x04034b50);
  });
});
