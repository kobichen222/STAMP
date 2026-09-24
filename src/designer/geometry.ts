/**
 * Tiny vector-path toolkit. Everything the designer draws ends up as filled
 * paths made of M/L/C/Z commands in absolute millimetre coordinates, so the
 * same geometry can be written to SVG, PDF and EPS without transforms, strokes
 * or fonts – exactly what a CorelDRAW / laser workflow wants.
 */

export type Pt = [number, number];
export type Cmd = { t: 'M' | 'L'; p: Pt } | { t: 'C'; c1: Pt; c2: Pt; p: Pt } | { t: 'Z' };
export type Path = Cmd[];

/** Affine matrix [a, b, c, d, e, f] like SVG: x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  // m ∘ n  (apply n first, then m)
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
export const scale = (sx: number, sy = sx): Matrix => [sx, 0, 0, sy, 0, 0];
export function rotate(deg: number): Matrix {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}
/** Compose matrices so that the LAST one is applied first (reads like SVG transform lists). */
export const compose = (...ms: Matrix[]): Matrix => ms.reduce((acc, m) => multiply(acc, m), IDENTITY);

export const apply = (m: Matrix, [x, y]: Pt): Pt => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export function transformPath(path: Path, m: Matrix): Path {
  return path.map((c) => {
    if (c.t === 'Z') return c;
    if (c.t === 'C') return { t: 'C', c1: apply(m, c.c1), c2: apply(m, c.c2), p: apply(m, c.p) };
    return { t: c.t, p: apply(m, c.p) };
  });
}

/** Mirroring flips winding; keep that in mind when mixing mirrored + unmirrored parts. */
export function reversePath(path: Path): Path {
  // Reverse each subpath so an outline becomes a hole under the non-zero rule.
  const out: Path = [];
  let sub: Cmd[] = [];
  const flush = () => {
    if (!sub.length) return;
    const start = (sub[0] as { p: Pt }).p;
    const pts: { cmd: Cmd; from: Pt }[] = [];
    let prev = start;
    for (let i = 1; i < sub.length; i++) {
      const c = sub[i];
      if (c.t === 'Z') continue;
      pts.push({ cmd: c, from: prev });
      prev = c.p;
    }
    out.push({ t: 'M', p: prev });
    for (let i = pts.length - 1; i >= 0; i--) {
      const { cmd, from } = pts[i];
      if (cmd.t === 'C') out.push({ t: 'C', c1: cmd.c2, c2: cmd.c1, p: from });
      else out.push({ t: 'L', p: from });
    }
    out.push({ t: 'Z' });
    sub = [];
  };
  for (const c of path) {
    if (c.t === 'M') flush();
    sub.push(c);
  }
  flush();
  return out;
}

const n = (v: number) => {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
};

export function toSvgD(path: Path): string {
  let d = '';
  for (const c of path) {
    if (c.t === 'Z') d += 'Z';
    else if (c.t === 'C') d += `C${n(c.c1[0])} ${n(c.c1[1])} ${n(c.c2[0])} ${n(c.c2[1])} ${n(c.p[0])} ${n(c.p[1])}`;
    else d += `${c.t}${n(c.p[0])} ${n(c.p[1])}`;
  }
  return d;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const EMPTY_BBOX: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

export function pathPoints(path: Path): Pt[] {
  const pts: Pt[] = [];
  for (const c of path) {
    if (c.t === 'Z') continue;
    if (c.t === 'C') {
      // Sample the curve instead of using control points for a tight box.
      const last = pts[pts.length - 1] ?? c.p;
      for (let i = 1; i <= 4; i++) {
        const t = i / 4;
        const u = 1 - t;
        pts.push([
          u * u * u * last[0] + 3 * u * u * t * c.c1[0] + 3 * u * t * t * c.c2[0] + t * t * t * c.p[0],
          u * u * u * last[1] + 3 * u * u * t * c.c1[1] + 3 * u * t * t * c.c2[1] + t * t * t * c.p[1],
        ]);
      }
    } else pts.push(c.p);
  }
  return pts;
}

export function bboxOf(pts: Pt[]): BBox {
  const b = { ...EMPTY_BBOX };
  for (const [x, y] of pts) {
    if (x < b.minX) b.minX = x;
    if (y < b.minY) b.minY = y;
    if (x > b.maxX) b.maxX = x;
    if (y > b.maxY) b.maxY = y;
  }
  return b;
}

export const unionBBox = (a: BBox, b: BBox): BBox => ({
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
});

export const isEmptyBBox = (b: BBox) => !Number.isFinite(b.minX);

// ------------------------------------------------------------ primitives

const K = 0.5522847498;

/** Ellipse centred on (cx, cy); clockwise (in y-down space) unless ccw. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number, ccw = false): Path {
  const p: Path = [
    { t: 'M', p: [cx, cy - ry] },
    { t: 'C', c1: [cx + K * rx, cy - ry], c2: [cx + rx, cy - K * ry], p: [cx + rx, cy] },
    { t: 'C', c1: [cx + rx, cy + K * ry], c2: [cx + K * rx, cy + ry], p: [cx, cy + ry] },
    { t: 'C', c1: [cx - K * rx, cy + ry], c2: [cx - rx, cy + K * ry], p: [cx - rx, cy] },
    { t: 'C', c1: [cx - rx, cy - K * ry], c2: [cx - K * rx, cy - ry], p: [cx, cy - ry] },
    { t: 'Z' },
  ];
  return ccw ? reversePath(p) : p;
}

export function rectPath(x: number, y: number, w: number, h: number, r = 0, ccw = false): Path {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  let p: Path;
  if (!r) {
    p = [{ t: 'M', p: [x, y] }, { t: 'L', p: [x + w, y] }, { t: 'L', p: [x + w, y + h] }, { t: 'L', p: [x, y + h] }, { t: 'Z' }];
  } else {
    const k = r * (1 - K);
    p = [
      { t: 'M', p: [x + r, y] },
      { t: 'L', p: [x + w - r, y] },
      { t: 'C', c1: [x + w - k, y], c2: [x + w, y + k], p: [x + w, y + r] },
      { t: 'L', p: [x + w, y + h - r] },
      { t: 'C', c1: [x + w, y + h - k], c2: [x + w - k, y + h], p: [x + w - r, y + h] },
      { t: 'L', p: [x + r, y + h] },
      { t: 'C', c1: [x + k, y + h], c2: [x, y + h - k], p: [x, y + h - r] },
      { t: 'L', p: [x, y + r] },
      { t: 'C', c1: [x, y + k], c2: [x + k, y], p: [x + r, y] },
      { t: 'Z' },
    ];
  }
  return ccw ? reversePath(p) : p;
}

/** Outline of a stroked rectangle as a filled ring (outer CW + inner CCW). */
export function rectRing(x: number, y: number, w: number, h: number, t: number, r = 0): Path {
  if (t * 2 >= Math.min(w, h)) return rectPath(x, y, w, h, r);
  return [...rectPath(x, y, w, h, r), ...rectPath(x + t, y + t, w - 2 * t, h - 2 * t, Math.max(0, r - t), true)];
}

export function ellipseRing(cx: number, cy: number, rx: number, ry: number, t: number): Path {
  if (t >= Math.min(rx, ry)) return ellipsePath(cx, cy, rx, ry);
  return [...ellipsePath(cx, cy, rx, ry), ...ellipsePath(cx, cy, rx - t, ry - t, true)];
}

export function polygonPath(points: Pt[]): Path {
  // Normalise to clockwise (y-down) so fills combine predictably.
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  const pts = area < 0 ? [...points].reverse() : points;
  return [{ t: 'M', p: pts[0] }, ...pts.slice(1).map((p) => ({ t: 'L' as const, p })), { t: 'Z' }];
}

export function starPoints(cx: number, cy: number, rOuter: number, rInner: number, spikes = 5): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? rInner : rOuter;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// ------------------------------------------------------------ SVG path parsing

/**
 * Parses SVG path data (all commands, absolute or relative) into M/L/C/Z.
 * Used for vector logos, traced bitmaps and the icon library.
 */
export function parseSvgPath(d: string): Path {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) || [];
  const out: Path = [];
  let i = 0;
  let cmd = '';
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  let lastCtrl: Pt | null = null;
  let lastQ: Pt | null = null;
  const num = () => parseFloat(tokens[i++]);
  const isNum = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);

  const cubic = (c1: Pt, c2: Pt, p: Pt) => {
    out.push({ t: 'C', c1, c2, p });
    lastCtrl = c2;
    cur = p;
  };
  const quad = (q: Pt, p: Pt) => {
    const c1: Pt = [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])];
    const c2: Pt = [p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])];
    out.push({ t: 'C', c1, c2, p });
    lastQ = q;
    cur = p;
  };

  while (i < tokens.length) {
    if (!isNum()) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cur[0] : 0;
    const oy = rel ? cur[1] : 0;
    if (C !== 'C' && C !== 'S') lastCtrl = null;
    if (C !== 'Q' && C !== 'T') lastQ = null;
    switch (C) {
      case 'M': {
        const p: Pt = [num() + ox, num() + oy];
        out.push({ t: 'M', p });
        cur = start = p;
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L': {
        const p: Pt = [num() + ox, num() + oy];
        out.push({ t: 'L', p });
        cur = p;
        break;
      }
      case 'H': {
        const p: Pt = [num() + ox, cur[1]];
        out.push({ t: 'L', p });
        cur = p;
        break;
      }
      case 'V': {
        const p: Pt = [cur[0], num() + oy];
        out.push({ t: 'L', p });
        cur = p;
        break;
      }
      case 'C':
        cubic([num() + ox, num() + oy], [num() + ox, num() + oy], [num() + ox, num() + oy]);
        break;
      case 'S': {
        const c1: Pt = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur;
        cubic(c1, [num() + ox, num() + oy], [num() + ox, num() + oy]);
        break;
      }
      case 'Q':
        quad([num() + ox, num() + oy], [num() + ox, num() + oy]);
        break;
      case 'T': {
        const q: Pt = lastQ ? [2 * cur[0] - lastQ[0], 2 * cur[1] - lastQ[1]] : cur;
        quad(q, [num() + ox, num() + oy]);
        break;
      }
      case 'A': {
        const rx = num();
        const ry = num();
        const phi = num();
        const large = num();
        const sweep = num();
        const p: Pt = [num() + ox, num() + oy];
        for (const seg of arcToCubics(cur, rx, ry, phi, !!large, !!sweep, p)) cubic(seg[0], seg[1], seg[2]);
        cur = p;
        break;
      }
      case 'Z':
        out.push({ t: 'Z' });
        cur = start;
        break;
      default:
        i++; // unknown token – skip
    }
  }
  return out;
}

function arcToCubics(p0: Pt, rx: number, ry: number, phiDeg: number, large: boolean, sweep: boolean, p1: Pt): [Pt, Pt, Pt][] {
  if (!rx || !ry) return [[p0, p1, p1]];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2;
  const dy = (p0[1] - p1[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const sign = large === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const co = sign * Math.sqrt(Math.max(0, num / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
  const cx1 = (co * rx * y1) / ry;
  const cy1 = (-co * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0[0] + p1[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (p0[1] + p1[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dt) / (Math.PI / 2));
  const out: [Pt, Pt, Pt][] = [];
  const d = dt / segs;
  const k = (4 / 3) * Math.tan(d / 4);
  const pt = (t: number): Pt => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const der = (t: number): Pt => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  for (let s = 0; s < segs; s++) {
    const a = t1 + s * d;
    const b = a + d;
    const pa = pt(a);
    const pb = pt(b);
    const da = der(a);
    const db = der(b);
    out.push([
      [pa[0] + k * da[0], pa[1] + k * da[1]],
      [pb[0] - k * db[0], pb[1] - k * db[1]],
      pb,
    ]);
  }
  return out;
}
