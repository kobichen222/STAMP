/**
 * The logo a customer uploaded is downloadable on its own from the order:
 * as the picture (PNG) and as CorelDRAW outlines (AI), at its place on the stamp.
 * The main AI file keeps leaving the uploaded picture out.
 */
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Design } from '@/designer/types';
import { exportDesign, logoFiles } from '@/server/production-engine';

function squarePng(size = 80): string {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (x > 15 && x < 65 && y > 15 && y < 65) raw[y * (size * 4 + 1) + 1 + x * 4 + 3] = 255;
  const chunk = (t: string, d: Buffer) => {
    const td = Buffer.concat([Buffer.from(t), d]);
    const out = Buffer.alloc(12 + d.length);
    out.writeUInt32BE(d.length, 0);
    td.copy(out, 4);
    out.writeUInt32BE(zlib.crc32(td) >>> 0, 8 + d.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return `data:image/png;base64,${Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]).toString('base64')}`;
}

const src = squarePng();
const design = {
  version: 1,
  modelId: 'print-40',
  shape: 'rect',
  width: 58,
  height: 22,
  border: { style: 'single', thickness: 0.3, inset: 1, gap: 0.6 },
  inkColor: 'black',
  elements: [{ id: 'logo', type: 'image', x: 12, y: 11, width: 12, height: 12, rotation: 0, src, vector: null, source: { name: 'logo.jpg', mime: 'image/jpeg', pxWidth: 80, pxHeight: 80, isVector: false } }],
} as unknown as Design;
const meta = { orderId: 'ORD-TEST-1', customer: 'Test', productName: 'Print 40', ink: 'black', quantity: 1, index: 0 };
const paths = (ai: string) => (ai.match(/^[fF]$/gm) ?? []).length;

describe('customer logo download', () => {
  it('gives the logo as CorelDRAW outlines, without the frame', async () => {
    const out = await exportDesign(design, 'logo-ai', false, meta);
    expect(out.name).toMatch(/_1_LOGO\.ai$/);
    const ai = String(out.data);
    expect(ai.startsWith('%!PS-Adobe')).toBe(true);
    // One filled outline: the logo, at its place on the stamp (x 6–18 mm of 58) – and no frame.
    expect(paths(ai)).toBe(1);
    const first = /^([\d.]+) ([\d.]+) m$/m.exec(ai)!;
    expect(Number(first[1]) / (72 / 25.4)).toBeGreaterThan(6);
    expect(Number(first[1]) / (72 / 25.4)).toBeLessThan(18);
    // The whole stamp as AI still leaves the uploaded picture out.
    const main = String((await exportDesign(design, 'ai', false, meta)).data);
    expect(main).not.toContain(first[0]);
  });

  it('gives the picture exactly as stored', async () => {
    const out = await exportDesign(design, 'logo-png', false, meta);
    expect(out.mime).toBe('image/png');
    expect(Buffer.from(out.data as Uint8Array).toString('base64')).toBe(src.split(',')[1]);
  });

  it('has nothing to give when the design has no logo', async () => {
    expect(await logoFiles({ ...design, elements: [] } as Design, 'X')).toEqual([]);
    await expect(exportDesign({ ...design, elements: [] } as Design, 'logo-ai', false, meta)).rejects.toThrow();
  });
});
