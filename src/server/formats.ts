import 'server-only';
import zlib from 'node:zlib';
import { type Cmd, compose, type Matrix, scale, transformPath, translate, type Path } from '@/designer/geometry';
import { PRODUCTION_PROFILE, toProductionEps, toProductionPdf, toProductionSvg, type ProductionMeta } from '@/designer/production';
import type { RenderResult } from '@/designer/render';

/**
 * Every file format the production station may ask for – all generated from
 * the same render (mm, 1:1, text already in curves, black fills only), so the
 * operator picks whatever the CorelDRAW version / laser software imports best.
 */
import { EXPORT_FORMATS, isExportFormat, type ExportFormat } from '@/lib/export-formats';

export { EXPORT_FORMATS, isExportFormat, type ExportFormat };

// ------------------------------------------------------------------ geometry helpers

type Pt = [number, number];

function mirrorMatrix(r: RenderResult, mirror: boolean): Matrix {
  return mirror ? compose(translate(r.width, 0), scale(-1, 1)) : [1, 0, 0, 1, 0, 0];
}

/** Vector paths of the render (raster logos are reported separately). */
function vectorItems(r: RenderResult, mirror: boolean) {
  const m = mirrorMatrix(r, mirror);
  return r.items.flatMap((it) => (it.kind === 'path' && it.path.length ? [{ path: transformPath(it.path, m), fillRule: it.fillRule }] : []));
}

/** Split a path into sub-paths and flatten curves to polylines (tolerance ≈ 0.01 mm). */
function flatten(path: Path, tol = 0.01): Pt[][] {
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  let last: Pt = [0, 0];
  const push = () => {
    if (cur.length > 2) out.push(cur);
    cur = [];
  };
  for (const c of path) {
    if (c.t === 'M') {
      push();
      cur = [c.p];
      last = c.p;
    } else if (c.t === 'L') {
      cur.push(c.p);
      last = c.p;
    } else if (c.t === 'C') {
      const [p0, p1, p2, p3] = [last, c.c1, c.c2, c.p];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
      const n = Math.min(200, Math.max(2, Math.ceil(Math.sqrt(len / tol))));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const u = 1 - t;
        const a = u * u * u,
          b = 3 * u * u * t,
          cc = 3 * u * t * t,
          d = t * t * t;
        cur.push([a * p0[0] + b * p1[0] + cc * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + cc * p2[1] + d * p3[1]]);
      }
      last = c.p;
    } else push();
  }
  push();
  return out.map((poly) => {
    // Drop a duplicated closing point.
    const [a, b] = [poly[0], poly[poly.length - 1]];
    return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6 ? poly.slice(0, -1) : poly;
  });
}

/** Even-odd nesting depth of each sub-path, used to orient holes for nonzero-only formats. */
function signedArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

function inside(pt: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Split a path into its sub-paths (each starting with M). */
function subPaths(path: Path): Path[] {
  const out: Path[] = [];
  for (const c of path) {
    if (c.t === 'M' || !out.length) out.push([]);
    out[out.length - 1].push(c);
  }
  return out.filter((s) => s.some((c) => c.t !== 'M' && c.t !== 'Z'));
}

function reverseSub(sub: Path): Path {
  const pts: Pt[] = [];
  const segs: Cmd[] = [];
  let last: Pt = [0, 0];
  for (const c of sub) {
    if (c.t === 'M') last = c.p;
    else if (c.t === 'L' || c.t === 'C') {
      segs.push(c.t === 'C' ? { t: 'C', c1: c.c2, c2: c.c1, p: last } : { t: 'L', p: last });
      pts.push(last);
      last = c.p;
    }
  }
  return [{ t: 'M', p: last }, ...segs.reverse(), { t: 'Z' }];
}

/**
 * Re-orient sub-paths so that the nonzero rule gives the even-odd result:
 * outlines at even nesting depth run one way, holes the other. Needed for
 * formats whose importers only honour path direction (Illustrator / CorelDRAW AI).
 */
function orientForNonzero(path: Path): Path {
  const subs = subPaths(path);
  const polys = subs.map((s) => flatten(s, 0.02)[0] ?? []);
  return subs.flatMap((s, i) => {
    const poly = polys[i];
    if (poly.length < 3) return s;
    const depth = polys.reduce((n, q, j) => (j !== i && q.length > 2 && inside(poly[0], q) ? n + 1 : n), 0);
    const wantPositive = depth % 2 === 0;
    return signedArea(poly) > 0 === wantPositive ? s : reverseSub(s);
  });
}

const fx = (v: number, d = 3) => (Math.round(v * 10 ** d) / 10 ** d).toString();
const ascii = (s: string) => s.replace(/[^\x20-\x7e]/g, '?');

// ------------------------------------------------------------------ AI (Illustrator 3 – PostScript based)

/** Illustrator 3.x file: the most widely importable .ai flavour (every CorelDRAW version reads it). */
export function toAi(r: RenderResult, mirror: boolean, meta?: ProductionMeta): string {
  const PT = 72 / 25.4;
  const W = r.width * PT;
  const H = r.height * PT;
  const X = (p: Pt) => fx(p[0] * PT);
  const Y = (p: Pt) => fx(H - p[1] * PT);
  const lines = [
    '%!PS-Adobe-2.0 EPSF-1.2',
    '%%Creator:Adobe Illustrator(TM) 3.2',
    `%%For:(Stamp2Go) (${ascii(meta?.customer ?? '')})`,
    `%%Title:(${ascii(meta?.orderId ?? 'stamp')}.ai)`,
    `%%CreationDate:(${new Date().toISOString().slice(0, 10)}) ()`,
    `%%BoundingBox:0 0 ${Math.ceil(W)} ${Math.ceil(H)}`,
    `%%HiResBoundingBox:0 0 ${fx(W)} ${fx(H)}`,
    '%%DocumentProcessColors:Black',
    `%%TemplateBox:${fx(W / 2)} ${fx(H / 2)} ${fx(W / 2)} ${fx(H / 2)}`,
    '%%TileBox:0 0 ' + `${fx(W)} ${fx(H)}`,
    '%%DocumentPreview:None',
    '%%EndComments',
    '%%BeginProlog',
    // Minimal procset so the file also prints / previews in any PostScript reader.
    // AI importers (Illustrator, CorelDRAW) parse the operators below directly.
    '%%BeginResource: procset Stamp2Go_AI3 1.0 0',
    '/_cp false def',
    '/m {moveto} bind def /l {lineto} bind def /L {lineto} bind def /c {curveto} bind def /C {curveto} bind def',
    '/f {closepath _cp not {fill} if} bind def /F {_cp not {fill} if} bind def',
    '/*u {/_cp true def newpath} bind def /*U {/_cp false def fill} bind def',
    '/k {setcmykcolor} bind def /K {pop pop pop pop} bind def /A {pop} bind def /O {pop} bind def /R {pop} bind def',
    '/u {} def /U {} def /annotatepage {} def',
    '%%EndResource',
    '%%EndProlog',
    '%%BeginSetup',
    '%%EndSetup',
    '0 A',
    'u',
  ];
  for (const it of vectorItems(r, mirror)) {
    const path = it.fillRule === 'evenodd' ? orientForNonzero(it.path) : it.path;
    const subs: string[][] = [];
    let cur: string[] = [];
    for (const c of path) {
      if (c.t === 'M') {
        if (cur.length) subs.push(cur);
        cur = [`${X(c.p)} ${Y(c.p)} m`];
      } else if (c.t === 'L') cur.push(`${X(c.p)} ${Y(c.p)} L`);
      else if (c.t === 'C') cur.push(`${X(c.c1)} ${Y(c.c1)} ${X(c.c2)} ${Y(c.c2)} ${X(c.p)} ${Y(c.p)} C`);
    }
    if (cur.length) subs.push(cur);
    if (!subs.length) continue;
    const compound = subs.length > 1;
    if (compound) lines.push('*u');
    for (const s of subs) lines.push('0 O', '0 0 0 1 k', '0 R', '0 0 0 0 K', ...s, 'f');
    if (compound) lines.push('*U');
  }
  lines.push('U', '%%PageTrailer', 'gsave annotatepage grestore showpage', '%%Trailer', '%%EOF', '');
  return lines.join('\r\n');
}

// ------------------------------------------------------------------ DXF (R12, outlines in mm)

export function toDxf(r: RenderResult, mirror: boolean): string {
  const H = r.height;
  const o: string[] = [];
  const g = (code: number, v: string | number) => o.push(String(code), typeof v === 'number' ? fx(v, 4) : v);
  g(0, 'SECTION');
  g(2, 'HEADER');
  g(9, '$ACADVER');
  g(1, 'AC1009');
  g(9, '$INSUNITS');
  g(70, '4');
  g(9, '$MEASUREMENT');
  g(70, '1');
  g(9, '$EXTMIN');
  g(10, 0);
  g(20, 0);
  g(9, '$EXTMAX');
  g(10, r.width);
  g(20, r.height);
  g(0, 'ENDSEC');
  g(0, 'SECTION');
  g(2, 'TABLES');
  g(0, 'TABLE');
  g(2, 'LAYER');
  g(70, '1');
  g(0, 'LAYER');
  g(2, 'STAMP');
  g(70, '0');
  g(62, '7');
  g(6, 'CONTINUOUS');
  g(0, 'ENDTAB');
  g(0, 'ENDSEC');
  g(0, 'SECTION');
  g(2, 'ENTITIES');
  for (const it of vectorItems(r, mirror)) {
    for (const poly of flatten(it.path)) {
      g(0, 'POLYLINE');
      g(8, 'STAMP');
      g(66, '1');
      g(70, '1');
      g(10, 0);
      g(20, 0);
      g(30, 0);
      for (const [x, y] of poly) {
        g(0, 'VERTEX');
        g(8, 'STAMP');
        g(10, x);
        g(20, H - y);
        g(30, 0);
      }
      g(0, 'SEQEND');
      g(8, 'STAMP');
    }
  }
  g(0, 'ENDSEC');
  g(0, 'EOF');
  return o.join('\r\n') + '\r\n';
}

// ------------------------------------------------------------------ PLT (HPGL, 40 plotter units per mm)

export function toPlt(r: RenderResult, mirror: boolean): string {
  const U = 40;
  const H = r.height;
  const q = (p: Pt) => `${Math.round(p[0] * U)},${Math.round((H - p[1]) * U)}`;
  const out = ['IN;', 'SP1;'];
  for (const it of vectorItems(r, mirror)) {
    for (const poly of flatten(it.path)) {
      out.push(`PU${q(poly[0])};`, `PD${[...poly.slice(1), poly[0]].map(q).join(',')};`);
    }
  }
  out.push('PU;', 'SP0;', 'IN;');
  return out.join('\n') + '\n';
}

// ------------------------------------------------------------------ EMF (vector, 0.01 mm units, real Béziers)

class Bin {
  private chunks: Buffer[] = [];
  length = 0;
  push(b: Buffer) {
    this.chunks.push(b);
    this.length += b.length;
  }
  out() {
    return Buffer.concat(this.chunks);
  }
}

export function toEmf(r: RenderResult, mirror: boolean): Uint8Array {
  const S = 100; // 1 logical unit = 0.01 mm
  const W = Math.round(r.width * S);
  const H = Math.round(r.height * S);
  const P = (p: Pt) => [Math.round(p[0] * S), Math.round(p[1] * S)];
  const body = new Bin();
  let records = 0;
  const rec = (type: number, payload: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(type, 0);
    head.writeUInt32LE(8 + payload.length, 4);
    body.push(head);
    body.push(payload);
    records++;
  };
  const u32 = (...v: number[]) => {
    const b = Buffer.alloc(v.length * 4);
    v.forEach((x, i) => (x < 0 ? b.writeInt32LE(x, i * 4) : b.writeUInt32LE(x >>> 0, i * 4)));
    return b;
  };
  const bounds = u32(0, 0, W, H);

  // Solid black brush (handle 1) + null pen (stock object) → filled shapes, no outline.
  rec(39, u32(1, 0, 0x00000000, 0)); // EMR_CREATEBRUSHINDIRECT
  rec(37, u32(1)); // EMR_SELECTOBJECT brush
  rec(37, u32(0x80000008)); // EMR_SELECTOBJECT NULL_PEN
  for (const it of vectorItems(r, mirror)) {
    rec(19, u32(it.fillRule === 'evenodd' ? 1 : 2)); // EMR_SETPOLYFILLMODE
    rec(59, Buffer.alloc(0)); // EMR_BEGINPATH
    let open = false;
    for (const c of it.path) {
      if (c.t === 'M') {
        if (open) rec(61, Buffer.alloc(0)); // EMR_CLOSEFIGURE
        rec(27, u32(...P(c.p))); // EMR_MOVETOEX
        open = true;
      } else if (c.t === 'L') rec(54, u32(...P(c.p))); // EMR_LINETO
      else if (c.t === 'C') rec(5, Buffer.concat([bounds, u32(3, ...P(c.c1), ...P(c.c2), ...P(c.p))])); // EMR_POLYBEZIERTO
      else if (open) {
        rec(61, Buffer.alloc(0));
        open = false;
      }
    }
    if (open) rec(61, Buffer.alloc(0));
    rec(60, Buffer.alloc(0)); // EMR_ENDPATH
    rec(62, bounds); // EMR_FILLPATH
  }
  rec(14, u32(0, 16, 20)); // EMR_EOF

  const total = 88 + body.length;
  const header = Buffer.alloc(88);
  header.writeUInt32LE(1, 0); // EMR_HEADER
  header.writeUInt32LE(88, 4);
  u32(0, 0, W, H).copy(header, 8); // rclBounds (device units)
  u32(0, 0, W, H).copy(header, 24); // rclFrame (0.01 mm)
  header.writeUInt32LE(0x464d4520, 40); // " EMF"
  header.writeUInt32LE(0x10000, 44);
  header.writeUInt32LE(total, 48);
  header.writeUInt32LE(records + 1, 52);
  header.writeUInt16LE(2, 56); // handles: reserved + brush
  header.writeUInt32LE(0, 60); // nDescription
  header.writeUInt32LE(0, 64);
  header.writeUInt32LE(0, 68); // palette entries
  // Reference device where one pixel is exactly 0.01 mm.
  header.writeInt32LE(200000, 72);
  header.writeInt32LE(200000, 76);
  header.writeInt32LE(2000, 80);
  header.writeInt32LE(2000, 84);
  return new Uint8Array(Buffer.concat([header, body.out()]));
}

// ------------------------------------------------------------------ WMF (placeable, 0.01 mm units, polygons)

export function toWmf(r: RenderResult, mirror: boolean): Uint8Array {
  const S = 100;
  const W = Math.round(r.width * S);
  const H = Math.round(r.height * S);
  const recs: Buffer[] = [];
  let maxRec = 0;
  const rec = (fn: number, words: number[]) => {
    const b = Buffer.alloc(6 + words.length * 2);
    b.writeUInt32LE(3 + words.length, 0);
    b.writeUInt16LE(fn, 4);
    words.forEach((w, i) => b.writeUInt16LE(w & 0xffff, 6 + i * 2));
    recs.push(b);
    maxRec = Math.max(maxRec, 3 + words.length);
  };
  rec(0x020b, [0, 0]); // SETWINDOWORG (y, x)
  rec(0x020c, [H, W]); // SETWINDOWEXT (y, x)
  rec(0x02fc, [0, 0, 0, 0]); // CREATEBRUSHINDIRECT solid black → object 0
  rec(0x012d, [0]); // SELECTOBJECT brush
  rec(0x02fa, [5, 0, 0, 0, 0]); // CREATEPENINDIRECT PS_NULL → object 1
  rec(0x012d, [1]); // SELECTOBJECT pen
  for (const it of vectorItems(r, mirror)) {
    const polys = flatten(it.path, 0.02).map((p) => p.map(([x, y]) => [Math.round(x * S), Math.round(y * S)]));
    if (!polys.length) continue;
    rec(0x0106, [it.fillRule === 'evenodd' ? 1 : 2]); // SETPOLYFILLMODE
    rec(0x0538, [polys.length, ...polys.map((p) => p.length), ...polys.flatMap((p) => p.flat())]); // POLYPOLYGON
  }
  rec(0x0000, []); // EOF
  const bodyWords = recs.reduce((n, b) => n + b.length / 2, 0);
  const meta = Buffer.alloc(18);
  meta.writeUInt16LE(1, 0);
  meta.writeUInt16LE(9, 2);
  meta.writeUInt16LE(0x0300, 4);
  meta.writeUInt32LE(9 + bodyWords, 6);
  meta.writeUInt16LE(2, 10); // objects
  meta.writeUInt32LE(maxRec, 12);
  meta.writeUInt16LE(0, 16);
  const place = Buffer.alloc(22);
  place.writeUInt32LE(0x9ac6cdd7, 0);
  place.writeInt16LE(0, 4);
  place.writeInt16LE(0, 6);
  place.writeInt16LE(0, 8);
  place.writeInt16LE(W, 10);
  place.writeInt16LE(H, 12);
  place.writeUInt16LE(2540, 14); // units per inch → 0.01 mm
  place.writeUInt32LE(0, 16);
  let sum = 0;
  for (let i = 0; i < 10; i++) sum ^= place.readUInt16LE(i * 2);
  place.writeUInt16LE(sum, 20);
  return new Uint8Array(Buffer.concat([place, meta, ...recs]));
}

// ------------------------------------------------------------------ raster (1-bit, scan-line fill)

export interface Bitmap {
  width: number;
  height: number;
  dpi: number;
  /** 1 = ink. */
  ink: Uint8Array;
}

export function rasterize(r: RenderResult, mirror: boolean, dpi = 1200): Bitmap {
  const px = dpi / 25.4;
  const width = Math.max(1, Math.round(r.width * px));
  const height = Math.max(1, Math.round(r.height * px));
  const ink = new Uint8Array(width * height);
  for (const it of vectorItems(r, mirror)) {
    const edges: { x0: number; y0: number; x1: number; y1: number; dir: number }[] = [];
    for (const poly of flatten(it.path, 0.004)) {
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        if (a[1] === b[1]) continue;
        edges.push({ x0: a[0] * px, y0: a[1] * px, x1: b[0] * px, y1: b[1] * px, dir: b[1] > a[1] ? 1 : -1 });
      }
    }
    for (let y = 0; y < height; y++) {
      const sy = y + 0.5;
      const xs: { x: number; dir: number }[] = [];
      for (const e of edges) {
        const lo = Math.min(e.y0, e.y1);
        const hi = Math.max(e.y0, e.y1);
        if (sy < lo || sy >= hi) continue;
        xs.push({ x: e.x0 + ((sy - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), dir: e.dir });
      }
      if (!xs.length) continue;
      xs.sort((a, b) => a.x - b.x);
      let wind = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        wind += it.fillRule === 'evenodd' ? 1 : xs[i].dir;
        const inside = it.fillRule === 'evenodd' ? wind % 2 === 1 : wind !== 0;
        if (!inside) continue;
        const from = Math.max(0, Math.round(xs[i].x));
        const to = Math.min(width, Math.round(xs[i + 1].x));
        ink.fill(1, y * width + from, y * width + to);
      }
    }
  }
  return { width, height, dpi, ink };
}

const crc32 = (b: Buffer) => zlib.crc32(b) >>> 0;

export function toPng(bmp: Bitmap): Uint8Array {
  const rowBytes = Math.ceil(bmp.width / 8);
  const raw = Buffer.alloc((rowBytes + 1) * bmp.height, 0xff);
  for (let y = 0; y < bmp.height; y++) {
    const off = y * (rowBytes + 1);
    raw[off] = 0; // filter: none
    for (let x = 0; x < bmp.width; x++) if (bmp.ink[y * bmp.width + x]) raw[off + 1 + (x >> 3)] &= ~(0x80 >> (x & 7)); // 0 = black
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(bmp.width, 0);
  ihdr.writeUInt32BE(bmp.height, 4);
  ihdr[8] = 1; // bit depth
  ihdr[9] = 0; // greyscale
  const phys = Buffer.alloc(9);
  const ppm = Math.round((bmp.dpi / 25.4) * 1000);
  phys.writeUInt32BE(ppm, 0);
  phys.writeUInt32BE(ppm, 4);
  phys[8] = 1;
  return new Uint8Array(
    Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('pHYs', phys), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]),
  );
}

export function toBmp(bmp: Bitmap): Uint8Array {
  const rowBytes = Math.ceil(bmp.width / 32) * 4;
  const dataSize = rowBytes * bmp.height;
  const off = 14 + 40 + 8;
  const b = Buffer.alloc(off + dataSize);
  b.write('BM', 0, 'ascii');
  b.writeUInt32LE(off + dataSize, 2);
  b.writeUInt32LE(off, 10);
  b.writeUInt32LE(40, 14);
  b.writeInt32LE(bmp.width, 18);
  b.writeInt32LE(bmp.height, 22); // bottom-up
  b.writeUInt16LE(1, 26);
  b.writeUInt16LE(1, 28); // 1 bit
  b.writeUInt32LE(dataSize, 34);
  const ppm = Math.round((bmp.dpi / 25.4) * 1000);
  b.writeInt32LE(ppm, 38);
  b.writeInt32LE(ppm, 42);
  b.writeUInt32LE(2, 46);
  b.writeUInt32LE(0x00000000, 54); // palette 0 = black
  b.writeUInt32LE(0x00ffffff, 58); // palette 1 = white
  for (let y = 0; y < bmp.height; y++) {
    const row = off + (bmp.height - 1 - y) * rowBytes;
    b.fill(0xff, row, row + rowBytes);
    for (let x = 0; x < bmp.width; x++) if (bmp.ink[y * bmp.width + x]) b[row + (x >> 3)] &= ~(0x80 >> (x & 7));
  }
  return new Uint8Array(b);
}

// ------------------------------------------------------------------ ZIP (stored, for "all formats")

export function zip(files: { name: string; data: Uint8Array | string }[]): Uint8Array {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const data = typeof f.data === 'string' ? Buffer.from(f.data, 'utf8') : Buffer.from(f.data);
    const name = Buffer.from(f.name, 'utf8');
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // UTF-8 names
    lh.writeUInt16LE(0, 8); // stored
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    local.push(lh, name, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, cd, end]));
}

// ------------------------------------------------------------------ dispatcher

export async function exportRender(r: RenderResult, format: ExportFormat, mirror: boolean, meta?: ProductionMeta): Promise<Uint8Array | string> {
  switch (format) {
    case 'pdf':
      return toProductionPdf(r, { mirror }, meta);
    case 'svg':
      return toProductionSvg(r, { mirror });
    case 'eps':
      return toProductionEps(r, { mirror }, meta);
    case 'ai':
      return toAi(r, mirror, meta);
    case 'dxf':
      return toDxf(r, mirror);
    case 'plt':
      return toPlt(r, mirror);
    case 'emf':
      return toEmf(r, mirror);
    case 'wmf':
      return toWmf(r, mirror);
    case 'png':
      return toPng(rasterize(r, mirror));
    case 'bmp':
      return toBmp(rasterize(r, mirror));
  }
}

export const README = (meta: ProductionMeta) =>
  [
    `${PRODUCTION_PROFILE.name}`,
    `Order: ${meta.orderId ?? ''}   Size: ${meta.width} x ${meta.height} mm   Ink: ${meta.ink}`,
    '',
    'All files are 1:1 in millimetres, text converted to curves, black only.',
    'CorelDRAW: File > Import (Ctrl+I) – AI / EPS / PDF / EMF / WMF / DXF / PLT / SVG.',
    '  To keep a CorelDRAW file: import, then File > Save As > CDR.',
    'Laser software: DXF / PLT (outlines) or PNG / BMP 1200 dpi (raster engraving).',
    '',
  ].join('\r\n');
