/**
 * A logo uploaded as a picture (not converted in the editor) must still reach
 * every production format – it is traced to outlines on the server.
 * REAL_DESIGN=<design.json> EXPORT_DIR=<dir> also exports a real order design.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { beforeAll, describe, expect, it } from 'vitest';
import { renderDesign, type FaceResolver } from '@/designer/render';
import type { Design } from '@/designer/types';
import { EXPORT_FORMATS, exportRender } from '@/server/formats';
import { decodePng, withTracedLogos } from '@/server/logo-trace';
import { loadAllFaces } from './helpers';

/** 8-bit RGBA PNG (what the editor's canvas produces): a black ring on transparent. */
function ringPng(size = 120): string {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x - size / 2, y - size / 2);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      if (r < size * 0.45 && r > size * 0.25) raw[o + 3] = 255; // black, opaque
    }
  }
  const crc = (b: Buffer) => zlib.crc32(b) >>> 0;
  const chunk = (t: string, d: Buffer) => {
    const td = Buffer.concat([Buffer.from(t), d]);
    const out = Buffer.alloc(12 + d.length);
    out.writeUInt32BE(d.length, 0);
    td.copy(out, 4);
    out.writeUInt32BE(crc(td), 8 + d.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

const design: Design = {
  version: 1,
  modelId: 'print-40',
  shape: 'rect',
  width: 58,
  height: 22,
  border: { style: 'none', thickness: 0.3, inset: 1, gap: 0.6 },
  inkColor: 'black',
  elements: [
    { id: 'logo', type: 'image', x: 29, y: 11, width: 15, height: 15, rotation: 0, src: ringPng(), vector: null, source: { name: 'logo.jpg', mime: 'image/jpeg', pxWidth: 120, pxHeight: 120, isVector: false } },
  ],
} as unknown as Design;

let faces: FaceResolver;
beforeAll(async () => {
  faces = await loadAllFaces();
});

describe('picture logos in production files', () => {
  it('decodes the editor PNG', () => {
    const p = decodePng(Buffer.from(ringPng(40).split(',')[1], 'base64'))!;
    expect(p.width).toBe(40);
    expect(p.data[(20 * 40 + 4) * 4 + 3]).toBe(255); // on the ring
    expect(p.data[(20 * 40 + 20) * 4 + 3]).toBe(0); // centre hole
  });

  it('traces the logo so every format contains it', async () => {
    const { design: traced, traced: n } = await withTracedLogos(design);
    expect(n).toBe(1);
    const r = renderDesign(traced, faces);
    expect(r.items.every((i) => i.kind === 'path')).toBe(true);
    const logo = r.items.find((i) => i.id === 'logo')!;
    // Placed where the picture was: 15 mm wide, centred at 29,11.
    expect(logo.bbox.minX).toBeGreaterThan(21);
    expect(logo.bbox.maxX).toBeLessThan(37);
    expect(logo.bbox.maxX - logo.bbox.minX).toBeGreaterThan(12);
    const ai = String(await exportRender(r, 'ai', false));
    expect(ai.split('\n').filter((l) => / [CL]\r?$/.test(l)).length).toBeGreaterThan(10);
    const dxf = String(await exportRender(r, 'dxf', false));
    expect(dxf).toContain('POLYLINE');
  });

  it.runIf(!!process.env.REAL_DESIGN)('exports a real order design', async () => {
    const real = JSON.parse(fs.readFileSync(process.env.REAL_DESIGN!, 'utf8')) as Design;
    const { design: traced, traced: n } = await withTracedLogos(real);
    expect(n).toBeGreaterThan(0);
    const r = renderDesign(traced, faces);
    const dir = process.env.EXPORT_DIR;
    for (const f of EXPORT_FORMATS) {
      const data = await exportRender(r, f.id, false, { orderId: 'ORD-REAL', customer: 'TEST', width: real.width, height: real.height, ink: real.inkColor });
      if (dir) fs.writeFileSync(path.join(dir, `real.${f.ext}`), typeof data === 'string' ? data : Buffer.from(data));
    }
  });
});
