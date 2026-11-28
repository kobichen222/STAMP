import { sampleBox } from '@/stamp-bot/samples';

// The zone the imprint may take beside the 96px body photo: 160 + 26 gap + 96 = 282, inside the 320px card's inner
// width (286). ZONE_H is the whole height of the card's top row, so the tallest imprint fills it. Exported for the test.
export const ZONE_W = 160;
export const ZONE_H = 134;
const POWER = 0.24;

/**
 * The imprint's box in px on a home catalog card (ModelCard). The scale is compressed on purpose (a power well
 * under 1): a small stamp still looks smaller than a big one, but at the real ratio a 38×14 imprint would be
 * unreadable next to a 75×36 one, and the pair (imprint + body) would not stay tight.
 * maxW / maxH = the largest w and h among the cards shown. Kept apart from the .tsx so a test can import it.
 */
export function imprintSize(w: number, h: number, maxW: number, maxH: number): { width: number; height: number } {
  const box = sampleBox(w, h);
  const aspect = box.w / box.h; // the sample SVG's own viewBox, so the <img> is never letterboxed
  const rw = w / maxW;
  const rh = h / maxH;
  let width = rw >= rh ? ZONE_W * rw ** POWER : ZONE_H * rh ** POWER * aspect;
  let height = width / aspect;
  if (height > ZONE_H) {
    height = ZONE_H;
    width = height * aspect;
  }
  if (width > ZONE_W) {
    width = ZONE_W;
    height = width / aspect;
  }
  return { width: Math.round(width), height: Math.round(height) };
}
