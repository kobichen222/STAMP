#!/usr/bin/env node
/**
 * Generates the stamp2go logo as fixed SVG paths, so the site logo never depends on webfont loading.
 *
 * Fonts (WOFF, from @fontsource on jsDelivr) are downloaded once and cached in scripts/.logo-fonts/ (git-ignored).
 * Outputs:
 *   src/components/logo-paths.ts   LOGO_FULL (two lines, shared "2") and LOGO_COMPACT (one line "stamp2go")
 *   public/logo.svg                standalone full lockup
 *   public/favicon.svg, icon.svg   the blue "2" icon
 *   [optional] preview copies into the folder given by LOGO_PREVIEW_DIR (or the first CLI argument)
 *
 * Run: node scripts/generate-logo.mjs [previewDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentypeModule from 'opentype.js';

const opentype = opentypeModule.parse ? opentypeModule : opentypeModule.default;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CACHE = path.join(HERE, '.logo-fonts');
const PREVIEW = process.argv[2] || process.env.LOGO_PREVIEW_DIR || '';

const FONTS = {
  mplus: 'https://cdn.jsdelivr.net/npm/@fontsource/m-plus-rounded-1c@5/files/m-plus-rounded-1c-latin-800-normal.woff',
  nunito600i: 'https://cdn.jsdelivr.net/npm/@fontsource/nunito@5/files/nunito-latin-600-italic.woff',
  nunito800i: 'https://cdn.jsdelivr.net/npm/@fontsource/nunito@5/files/nunito-latin-800-italic.woff',
  rubik: 'https://cdn.jsdelivr.net/npm/@fontsource/rubik@5/files/rubik-hebrew-700-normal.woff',
};

const FILL_LATIN = '#0b1426';
const FILL_HEBREW = '#1c2a44';
const FILL_TWO = '#2457ff';

// Design-size constants (px; y grows downward).
const LAT = 50; // Latin size (M PLUS Rounded 1c 800)
const HEB = 30; // Hebrew size (Rubik 700) - smaller than the Latin so stamp2go stays the name and the Hebrew is the tagline
const RG = 4; // row gap
const G = 6; // ink gap beside the 2 (full lockup)
const DOWN = 2; // the 2 starts this far below the x-height
const SX = 0.85; // horizontal squeeze of the 2

const KERN = { kerning: true };

async function loadFont(key) {
  fs.mkdirSync(CACHE, { recursive: true });
  const url = FONTS[key];
  const file = path.join(CACHE, path.basename(new URL(url).pathname));
  if (!fs.existsSync(file)) {
    console.log(`Downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Font download failed (${res.status}): ${url}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const buf = fs.readFileSync(file);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  // Plain cmap mapping, no shaping: opentype.js 2.x always runs its own ccmp/bidi pass, which throws on
  // Rubik's Hebrew lookups. The logo text needs no shaping; kerning is still applied by getPath/getPaths.
  // This also guarantees glyph order == string order, so the reversed Hebrew strings stay in visual order.
  font.stringToGlyphs = (s) => [...s].map((ch) => font.charToGlyph(ch));
  return font;
}

const asc = (f, s) => (f.ascender / f.unitsPerEm) * s;
const desc = (f, s) => (-f.descender / f.unitsPerEm) * s;
/** opentype.js has no bidi: Hebrew is passed in visual (reversed) order. */
const rev = (s) => [...s].reverse().join('');

/** Applies x' = x*sx + dx, y' = y + dy to every point of the path; returns a new Path. */
function transform(p, sx, dx, dy) {
  const out = new opentype.Path();
  for (const c of p.commands) {
    const n = { ...c };
    for (const k of ['x', 'x1', 'x2']) if (k in n) n[k] = n[k] * sx + dx;
    for (const k of ['y', 'y1', 'y2']) if (k in n) n[k] = n[k] + dy;
    out.commands.push(n);
  }
  return out;
}

/** Dense sample of every contour segment (endpoints included). */
function samplePoints(p, per = 48) {
  const pts = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const line = (x0, y0, x1, y1) => {
    for (let i = 0; i <= per; i++) {
      const t = i / per;
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  };
  for (const c of p.commands) {
    if (c.type === 'M') {
      cx = sx = c.x; cy = sy = c.y;
      pts.push([cx, cy]);
    } else if (c.type === 'L') {
      line(cx, cy, c.x, c.y);
      cx = c.x; cy = c.y;
    } else if (c.type === 'Q') {
      for (let i = 0; i <= per; i++) {
        const t = i / per, u = 1 - t;
        pts.push([u * u * cx + 2 * u * t * c.x1 + t * t * c.x, u * u * cy + 2 * u * t * c.y1 + t * t * c.y]);
      }
      cx = c.x; cy = c.y;
    } else if (c.type === 'C') {
      for (let i = 0; i <= per; i++) {
        const t = i / per, u = 1 - t;
        pts.push([
          u * u * u * cx + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          u * u * u * cy + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        ]);
      }
      cx = c.x; cy = c.y;
    } else if (c.type === 'Z') {
      line(cx, cy, sx, sy);
      cx = sx; cy = sy;
    }
  }
  return pts;
}

/** Left/right ink edge of a filled path within the horizontal band [y0, y1]. */
function inkInBand(p, y0, y1) {
  let l = Infinity, r = -Infinity;
  for (const [x, y] of samplePoints(p)) {
    if (y < y0 || y > y1) continue;
    if (x < l) l = x;
    if (x > r) r = x;
  }
  if (!Number.isFinite(l)) throw new Error(`No ink in band [${y0}, ${y1}]`);
  return { l, r };
}

/**
 * SVG path data rounded to 1 decimal (same output as toPathData(1)). Written here because opentype.js 2.x's
 * toPathData emits NaN for some coordinates. Zero-length L commands (2.x outlines repeat on-curve points) are dropped.
 */
function pathData(p) {
  const num = (v) => {
    const s = (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
    return s === '-0' ? '0' : s;
  };
  const pack = (...vs) => vs.map((v, i) => (i > 0 && !num(v).startsWith('-') ? ' ' : '') + num(v)).join('');
  let d = '';
  let cx = NaN, cy = NaN;
  for (const c of p.commands) {
    if (c.type === 'L' && Math.abs(c.x - cx) < 1e-6 && Math.abs(c.y - cy) < 1e-6) continue;
    if (c.type === 'M' || c.type === 'L') d += c.type + pack(c.x, c.y);
    else if (c.type === 'Q') d += 'Q' + pack(c.x1, c.y1, c.x, c.y);
    else if (c.type === 'C') d += 'C' + pack(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else if (c.type === 'Z') d += 'Z';
    if ('x' in c) { cx = c.x; cy = c.y; }
  }
  if (d.includes('NaN')) throw new Error('NaN in path data');
  return d;
}

const bbox = (p) => p.getBoundingBox();
const r2 = (n) => Math.round(n * 100) / 100;
const ceil1 = (n) => Math.ceil(n * 10 - 1e-9) / 10;

/** The "2" (italic, squeezed by SX about x=0) with ink from yTop to yBottom. */
function placeTwo(font, yTop, yBottom) {
  const h100 = bbox(font.getPath('2', 0, 0, 100)).y2 - bbox(font.getPath('2', 0, 0, 100)).y1;
  const fs = ((yBottom - yTop) / h100) * 100;
  const raw = font.getPath('2', 0, 0, fs);
  const path2 = transform(raw, SX, 0, yTop - bbox(raw).y1);
  return { fs, path: path2 };
}

/** Text whose bbox.x2 (anchor 'end') or bbox.x1 (anchor 'start') lands on x. */
function placeText(font, text, baseline, size, anchor, x) {
  const p = font.getPath(text, 0, baseline, size, KERN);
  const b = bbox(p);
  const dx = anchor === 'end' ? x - b.x2 : x - b.x1;
  return { dx, path: transform(p, 1, dx, 0) };
}

/** Moves the union bbox to (0,0), merges paths by fill and returns the lockup record. */
function finish(parts) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const { path: p } of parts) {
    const b = bbox(p);
    x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1);
    x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2);
  }
  const W = ceil1(x2 - x1), H = ceil1(y2 - y1);
  const byFill = new Map();
  for (const { path: p, fill } of parts) {
    const d = pathData(transform(p, 1, -x1, -y1));
    byFill.set(fill, (byFill.get(fill) ?? '') + d);
  }
  return { viewBox: `0 0 ${W} ${H}`, width: W, height: H, paths: [...byFill].map(([fill, d]) => ({ d, fill })) };
}

function svgFile(l) {
  const paths = l.paths.map((p) => `<path fill="${p.fill}" d="${p.d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${l.viewBox}" width="${l.width}" height="${l.height}">${paths}</svg>\n`;
}

async function main() {
  const mplus = await loadFont('mplus');
  const nunito600i = await loadFont('nunito600i');
  const nunito800i = await loadFont('nunito800i');
  const rubik = await loadFont('rubik');

  const yL = (LAT - (asc(mplus, LAT) + desc(mplus, LAT))) / 2 + asc(mplus, LAT);
  const yH = LAT + RG + (HEB - (asc(rubik, HEB) + desc(rubik, HEB))) / 2 + asc(rubik, HEB);
  const xTop = yL + bbox(mplus.getPath('sampgo', 0, 0, LAT)).y1;

  // A. Full lockup
  const two = placeTwo(nunito600i, xTop + DOWN, yH);
  const band1 = inkInBand(two.path, LAT * 0.25, LAT * 0.75);
  const band2 = inkInBand(two.path, LAT + RG + HEB * 0.25, LAT + RG + HEB * 0.75);
  const stamp = placeText(mplus, 'stamp', yL, LAT, 'end', band1.l - G);
  const go = placeText(mplus, 'go', yL, LAT, 'start', band1.r + G);
  const heLeft = placeText(rubik, rev('דקות'), yH, HEB, 'end', band2.l - G);
  const heRight = placeText(rubik, rev('חותמות תוך'), yH, HEB, 'start', band2.r + G);
  const full = finish([
    { path: stamp.path, fill: FILL_LATIN },
    { path: go.path, fill: FILL_LATIN },
    { path: heLeft.path, fill: FILL_HEBREW },
    { path: heRight.path, fill: FILL_HEBREW },
    { path: two.path, fill: FILL_TWO },
  ]);

  // B. Compact lockup
  const tTop = yL + bbox(mplus.getPath('t', 0, 0, LAT)).y1;
  const twoC = placeTwo(nunito600i, tTop, yL);
  const bandY0 = xTop + (yL - xTop) * 0.25;
  const bandY1 = xTop + (yL - xTop) * 0.75;
  const bandC = inkInBand(twoC.path, bandY0, bandY1);
  // Natural ink gap between "m" and "p" inside "stamp" (glyphs at their kerned positions).
  const glyphs = mplus.getPaths('stamp', 0, yL, LAT, KERN);
  const G2 = inkInBand(glyphs[4], bandY0, bandY1).l - inkInBand(glyphs[3], bandY0, bandY1).r;
  const stampC = placeText(mplus, 'stamp', yL, LAT, 'end', bandC.l - G2);
  const goC = placeText(mplus, 'go', yL, LAT, 'start', bandC.r + G2);
  const compact = finish([
    { path: stampC.path, fill: FILL_LATIN },
    { path: goC.path, fill: FILL_LATIN },
    { path: twoC.path, fill: FILL_TWO },
  ]);

  // D. Icon
  const iconRaw = transform(nunito800i.getPath('2', 0, 0, 100), SX, 0, 0);
  const ib = bbox(iconRaw);
  const side = ceil1((ib.y2 - ib.y1) * 1.18);
  const iconPath = transform(iconRaw, 1, side / 2 - (ib.x1 + ib.x2) / 2, side / 2 - (ib.y1 + ib.y2) / 2);
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}"><path fill="${FILL_TWO}" d="${pathData(iconPath)}"/></svg>\n`;

  console.log('Computed values:');
  console.log({
    yL: r2(yL), yH: r2(yH), xTop: r2(xTop), tTop: r2(tTop),
    full: { fs2: r2(two.fs), band1: { l: r2(band1.l), r: r2(band1.r) }, band2: { l: r2(band2.l), r: r2(band2.r) }, stampShift: r2(stamp.dx), goShift: r2(go.dx), hebLeftShift: r2(heLeft.dx), hebRightShift: r2(heRight.dx), viewBox: full.viewBox },
    compact: { fs2: r2(twoC.fs), band: { y0: r2(bandY0), y1: r2(bandY1), l: r2(bandC.l), r: r2(bandC.r) }, G2: r2(G2), stampShift: r2(stampC.dx), goShift: r2(goC.dx), viewBox: compact.viewBox },
    icon: { viewBox: `0 0 ${side} ${side}` },
  });

  const ts = `// Generated by scripts/generate-logo.mjs – do not edit by hand; edit the script and re-run.

export const LOGO_FULL = ${JSON.stringify(full, null, 2)} as const;

export const LOGO_COMPACT = ${JSON.stringify(compact, null, 2)} as const;
`;
  fs.writeFileSync(path.join(ROOT, 'src/components/logo-paths.ts'), ts);
  fs.writeFileSync(path.join(ROOT, 'public/logo.svg'), svgFile(full));
  fs.writeFileSync(path.join(ROOT, 'public/favicon.svg'), icon);
  fs.writeFileSync(path.join(ROOT, 'public/icon.svg'), icon);
  console.log('Wrote src/components/logo-paths.ts, public/logo.svg, public/favicon.svg, public/icon.svg');

  if (PREVIEW) {
    fs.mkdirSync(PREVIEW, { recursive: true });
    fs.writeFileSync(path.join(PREVIEW, 'full.svg'), svgFile(full));
    fs.writeFileSync(path.join(PREVIEW, 'compact.svg'), svgFile(compact));
    fs.writeFileSync(path.join(PREVIEW, 'icon.svg'), icon);
    console.log(`Wrote previews to ${PREVIEW}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
