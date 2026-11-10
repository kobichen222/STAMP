/**
 * Trotec cut line: pure red (RGB 255,0,0) hairline (0.01 mm) on the plate edge.
 * The Trotec driver cuts red hairlines and engraves black; with "Size
 * Optimization" the job is cropped to the drawing, so the outline also makes the
 * job exactly the stamp's size.
 *
 * The printed page is CUT_MARGIN larger on every side: a line lying exactly on
 * the page edge is dropped by the printer driver (only top/bottom survived).
 */
export const CUT_MARGIN = 1; // mm around the plate

export function withCutLine(svg: string, shape: 'rect' | 'round', w: number, h: number): string {
  const m = CUT_MARGIN;
  const s = 0.01;
  const line =
    shape === 'round'
      ? `<ellipse cx="${m + w / 2}" cy="${m + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="none" stroke="#FF0000" stroke-width="${s}" />`
      : `<rect x="${m}" y="${m}" width="${w}" height="${h}" fill="none" stroke="#FF0000" stroke-width="${s}" />`;
  // Re-wrap the plate in a page that is 2 × margin larger, the plate centred.
  const open = svg.match(/<svg\b[^>]*>/);
  if (!open) return svg;
  const inner = svg.slice(open.index! + open[0].length, svg.lastIndexOf('</svg>'));
  const W = w + 2 * m;
  const H = h + 2 * m;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}"><g transform="translate(${m} ${m})">${inner}</g>${line}</svg>`;
}

/** Page size (mm) of a print: the plate plus the margin when a cut line is added. */
export const printSize = (w: number, h: number, cut: boolean) => (cut ? { w: w + 2 * CUT_MARGIN, h: h + 2 * CUT_MARGIN } : { w, h });
