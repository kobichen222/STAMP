import 'server-only';
import zlib from 'node:zlib';
import { parseSvgPath, toSvgD, transformPath, type Path } from '@/designer/geometry';
import type { Design, ImageElement } from '@/designer/types';

/**
 * Production files must be pure vector: a logo the customer uploaded as a
 * picture (and did not convert in the editor) is traced to outlines here, on
 * the server, so it appears in every format – AI, EPS, PDF, SVG, EMF, DXF …
 */

interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA
}

/** Minimal PNG decoder (8-bit, non-interlaced – what the editor produces). */
export function decodePng(buf: Buffer): Pixels | null {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let off = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let interlace = 0;
  let palette: Buffer | null = null;
  let trns: Buffer | null = null;
  const idat: Buffer[] = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const kind = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      type = data[9];
      interlace = data[12];
    } else if (kind === 'PLTE') palette = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    off += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type as 0 | 2 | 3 | 4 | 6];
  if (!width || !height || depth !== 8 || interlace !== 0 || !channels || width * height > 16e6) return null;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = px.subarray(y * stride, (y + 1) * stride);
    const up = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0;
      const b = up ? up[x] : 0;
      const c = up && x >= channels ? up[x - channels] : 0;
      let v = src[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[x] = v & 0xff;
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels;
    let r: number, g: number, b: number, al: number;
    if (type === 3) {
      const k = px[s];
      r = palette ? palette[k * 3] : 0;
      g = palette ? palette[k * 3 + 1] : 0;
      b = palette ? palette[k * 3 + 2] : 0;
      al = trns && k < trns.length ? trns[k] : 255;
    } else if (type === 0 || type === 4) {
      r = g = b = px[s];
      al = type === 4 ? px[s + 1] : 255;
    } else {
      r = px[s];
      g = px[s + 1];
      b = px[s + 2];
      al = type === 6 ? px[s + 3] : 255;
    }
    data.set([r, g, b, al], i * 4);
  }
  return { width, height, data };
}

/** Ink (dark and opaque) → black, everything else → white; scaled down to `maxSide`. */
function toBlackWhite(p: Pixels, maxSide = 1200): Pixels {
  const s = Math.min(1, maxSide / Math.max(p.width, p.height));
  const width = Math.max(1, Math.round(p.width * s));
  const height = Math.max(1, Math.round(p.height * s));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (Math.min(p.height - 1, Math.floor(y / s)) * p.width + Math.min(p.width - 1, Math.floor(x / s))) * 4;
      const a = p.data[i + 3] / 255;
      const l = (0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]) * a + 255 * (1 - a);
      const v = l < 128 ? 0 : 255;
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

/** Bitmap → outline path normalised to width 1 (same convention as the editor's vectorise()). */
export async function traceBitmap(png: Buffer): Promise<string | null> {
  const decoded = decodePng(png);
  if (!decoded) return null;
  const img = toBlackWhite(decoded);
  const mod = await import('imagetracerjs');
  const tracer = ((mod as unknown as { default?: unknown }).default ?? mod) as { imagedataToSVG: (img: Pixels, opts: Record<string, unknown>) => string };
  const svg = tracer.imagedataToSVG(img, {
    ltres: 0.5,
    qtres: 0.5,
    pathomit: 4,
    colorsampling: 0,
    numberofcolors: 2,
    pal: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
    ],
    mincolorratio: 0,
    colorquantcycles: 1,
    blurradius: 0,
    strokewidth: 0,
    linefilter: true,
    roundcoords: 2,
    viewbox: true,
    desc: false,
  });
  const out: Path = [];
  for (const m of svg.matchAll(/<path\b[^>]*>/g)) {
    const tag = m[0];
    const fill = (/fill="([^"]*)"/.exec(tag)?.[1] ?? '').replace(/\s/g, '');
    if (!/^rgb\(0,0,0\)$|^#000(000)?$/.test(fill)) continue;
    out.push(...parseSvgPath(/\sd="([^"]*)"/.exec(tag)?.[1] ?? ''));
  }
  if (!out.length) return null;
  return toSvgD(transformPath(out, [1 / img.width, 0, 0, 1 / img.width, 0, 0]));
}

const cache = new Map<string, string | null>();

/** A copy of the design in which every bitmap logo carries a vector trace. */
export async function withTracedLogos(design: Design): Promise<{ design: Design; traced: number; failed: number }> {
  let traced = 0;
  let failed = 0;
  const elements = await Promise.all(
    design.elements.map(async (e) => {
      if (e.type !== 'image' || e.vector) return e;
      const m = /^data:image\/png;base64,(.+)$/.exec(e.src);
      let d: string | null = null;
      if (m) {
        if (!cache.has(m[1])) {
          try {
            cache.set(m[1], await traceBitmap(Buffer.from(m[1], 'base64')));
          } catch (err) {
            console.error('[logo-trace]', e.id, err);
            cache.set(m[1], null);
          }
          if (cache.size > 50) cache.delete(cache.keys().next().value!);
        }
        d = cache.get(m[1]) ?? null;
      }
      if (!d) {
        failed++;
        return e;
      }
      traced++;
      return { ...e, vector: d } satisfies ImageElement;
    }),
  );
  return { design: { ...design, elements }, traced, failed };
}
