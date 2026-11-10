/**
 * Trotec cut line: pure red (RGB 255,0,0) hairline (0.01 mm) around the plate.
 * The Trotec driver cuts red hairlines and engraves the rest, and with
 * "Size Optimization" the job is cropped to the drawing – so the outline also
 * makes the job exactly the stamp's size, even when the design has no frame.
 */
export function withCutLine(svg: string, shape: 'rect' | 'round', w: number, h: number): string {
  const s = 0.01;
  const line =
    shape === 'round'
      ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - s / 2}" ry="${h / 2 - s / 2}" fill="none" stroke="#FF0000" stroke-width="${s}" />`
      : `<rect x="${s / 2}" y="${s / 2}" width="${w - s}" height="${h - s}" fill="none" stroke="#FF0000" stroke-width="${s}" />`;
  const i = svg.lastIndexOf('</svg>');
  return i < 0 ? svg : `${svg.slice(0, i)}${line}\n${svg.slice(i)}`;
}
