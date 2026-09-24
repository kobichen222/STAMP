/**
 * Sample vector logos for templates "with logo". They are real vector image
 * elements (filled, even-odd), so a template looks complete out of the box and
 * produces clean production files; the customer replaces them in the Logo tab.
 * Drawn in a 24×24 box and normalised to width 1 (like traced logos).
 */
import { parseSvgPath, scale, toSvgD, transformPath } from './geometry';
import { iconById } from './icons';
import type { ImageElement } from './types';

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;

function gear(cx: number, cy: number, rOut: number, rIn: number, teeth: number) {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, r] of [
      [-0.28, rIn],
      [-0.16, rOut],
      [0.16, rOut],
      [0.28, rIn],
    ] as const) {
      const t = a + da * step * 1.6;
      pts.push(`${(cx + Math.cos(t) * r).toFixed(2)} ${(cy + Math.sin(t) * r).toFixed(2)}`);
    }
  }
  return `M${pts.join('L')}z`;
}

function star(cx: number, cy: number, ro: number, ri: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? ri : ro;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}z`;
}

const RAW: Record<string, { label: string; d: string }> = {
  tooth: {
    label: 'שן',
    d: 'M12 4.2c-1.7-1-3.2-1.4-5-1.2C4.3 3.3 2.8 5.6 3 8.6c.2 2.6 1.3 4.3 1.8 7 .5 3 1.1 5.4 2.6 5.4 1.8 0 1.9-5.3 4.6-5.3s2.8 5.3 4.6 5.3c1.5 0 2.1-2.4 2.6-5.4.5-2.7 1.6-4.4 1.8-7 .2-3-1.3-5.3-4-5.6-1.8-.2-3.3.2-5 1.2z',
  },
  paw: {
    label: 'כף רגל',
    d: [
      'M12 11.5c-3.2 0-6.2 3.9-6.2 6.6 0 1.9 1.7 2.6 3 2.6 1.4 0 2.1-.9 3.2-.9s1.8.9 3.2.9c1.3 0 3-.7 3-2.6 0-2.7-3-6.6-6.2-6.6z',
      ellipse(5.2, 9.6, 1.9, 2.4),
      ellipse(18.8, 9.6, 1.9, 2.4),
      ellipse(9, 5.3, 1.9, 2.5),
      ellipse(15, 5.3, 1.9, 2.5),
    ].join(''),
  },
  scales: {
    label: 'מאזני צדק',
    d: [
      'M11.2 4.5h1.6v14.3h-1.6z', // post
      'M7 18.8h10v2.2H7z', // base
      'M3.5 5.6h17v1.5h-17z', // beam
      circle(12, 4.2, 1.3),
      'M5.2 7.1h.9L9 13.2h-.9zM5.2 7.1h.9L2.9 13.2H2z', // left strings
      'M17.9 7.1h.9l3.2 6.1h-.9zM17.9 7.1h.9l-2.8 6.1h-.9z', // right strings
      'M1.8 13.2h7.6a3.8 3 0 0 1-7.6 0z', // left pan
      'M14.6 13.2h7.6a3.8 3 0 0 1-7.6 0z', // right pan
    ].join(''),
  },
  house: {
    label: 'בית',
    d: 'M12 2.6 1.5 11.4l1.2 1.4L4.5 11.3V21h5.8v-6h3.4v6h5.8v-9.7l1.8 1.5 1.2-1.4zM16 4h2.5v3.6L16 5.5z',
  },
  cup: {
    label: 'כוס קפה',
    d: [
      'M3.5 9h12.5v5.2a5.2 5.2 0 0 1-5.2 5.2H8.7a5.2 5.2 0 0 1-5.2-5.2z',
      'M16 10h1.6a3 3 0 0 1 0 6H16v-1.8h1.6a1.2 1.2 0 0 0 0-2.4H16z',
      'M2.5 20.2h15v1.6h-15z',
      'M7.2 2.4c-1.2 1.6 1.2 2.6 0 4.6h1.5c1.2-2-1.2-3 0-4.6zM11.4 2.4c-1.2 1.6 1.2 2.6 0 4.6h1.5c1.2-2-1.2-3 0-4.6z',
    ].join(''),
  },
  building: {
    label: 'בניין',
    d: [
      'M3.5 21.5V5l8.5-3v19.5z',
      'M13 21.5V8.2l7.5 3v10.3z',
      'M5.6 6.5h2v2h-2zM8.8 6.5h2v2h-2zM5.6 10.5h2v2h-2zM8.8 10.5h2v2h-2zM5.6 14.5h2v2h-2zM8.8 14.5h2v2h-2z',
      'M15.2 12.5h1.8v2h-1.8zM17.8 12.5h1.8v2h-1.8zM15.2 16.3h1.8v2h-1.8zM17.8 16.3h1.8v2h-1.8z',
    ].join(''),
  },
  gear: { label: 'גלגל שיניים', d: gear(12, 12, 10.5, 8, 10) + circle(12, 12, 3.6) },
  leaf: {
    label: 'עלה',
    d: 'M20.8 3.2C10.4 3 3.6 8 3.6 15.2c0 1.8.5 3.3 1.3 4.6.9-4.2 3.8-8 8.8-10.5-4 3.1-6.2 6.4-7 11 1.1.4 2.3.6 3.6.6 7.4 0 10.9-7.5 10.5-17.7z',
  },
  crown: {
    label: 'כתר',
    d: 'M2.5 7.5l4.8 4L12 4l4.7 7.5 4.8-4-2.1 11H4.6zM4.6 19.8h14.8V22H4.6z' + circle(12, 3, 1.5) + circle(2.5, 6.6, 1.3) + circle(21.5, 6.6, 1.3),
  },
  book: {
    label: 'ספר',
    d: 'M2.5 5.2c3.4-1.3 6.8-1 9.5 1.1 2.7-2.1 6.1-2.4 9.5-1.1v14.6c-3.4-1.2-6.8-.9-9.5 1.2-2.7-2.1-6.1-2.4-9.5-1.2zM11.3 7.4v11.8h1.4V7.4z',
  },
  medical: { label: 'צלב רפואי', d: circle(12, 12, 11) + circle(12, 12, 9.4) + 'M9.8 5h4.4v4.8H19v4.4h-4.8V19H9.8v-4.8H5V9.8h4.8z' },
  'star-badge': { label: 'כוכב', d: circle(12, 12, 11) + circle(12, 12, 9.3) + star(12, 12.4, 7.2, 3) },
  scissors: {
    label: 'מספריים',
    d: circle(6, 17.5, 3.4) + circle(6, 17.5, 1.9) + circle(18, 17.5, 3.4) + circle(18, 17.5, 1.9) + 'M8.2 15 18.1 2.4l1.5 1.1-8.4 11.9zM15.8 15 5.9 2.4 4.4 3.5l8.4 11.9z',
  },
  camera: { label: 'מצלמה', d: 'M2.5 7.2h4.2l1.6-2.7h7.4l1.6 2.7h4.2v12.3h-19z' + circle(12, 13.3, 4.4) + circle(12, 13.3, 2.7) },
  key: { label: 'מפתח', d: circle(6.8, 12, 4.6) + circle(6.8, 12, 2.1) + 'M11.6 11h10v2.1h-1.8v3.2h-2.1v-3.2h-1.6v2.2H14v-2.2h-2.4z' },
  heart: { label: 'לב', d: iconById('heart')?.d ?? circle(12, 12, 10) },
  shield: { label: 'מגן', d: 'M12 1.8 3.6 5v6.1c0 5.2 3.5 9.8 8.4 11.1 4.9-1.3 8.4-5.9 8.4-11.1V5zM10.6 15.3l-3.3-3.3 1.4-1.4 1.9 1.9 4.9-4.9 1.4 1.4z' },
  tree: { label: 'עץ', d: circle(12, 9, 7.2) + 'M10.9 16.1h2.2v6.4h-2.2z' },
  wrench: { label: 'מפתח ברגים', d: 'M21.2 6.4a5.3 5.3 0 0 1-7 5l-8.1 8.3a2.1 2.1 0 0 1-3-3l8.3-8.1a5.3 5.3 0 0 1 5-7l-3.1 3.1.6 3.2 3.2.6z' },
  plane: { label: 'מטוס', d: 'M21.5 16v-2.1l-8.2-5.1V3.6a1.5 1.5 0 0 0-3 0v5.2L2.1 13.9V16l8.2-2.6v5.4l-2.1 1.6V22l3.6-1 3.6 1v-1.6l-2.1-1.6v-5.4z' },
  note: { label: 'תו מוזיקה', d: 'M11 3v10.5a3.6 3.6 0 1 0 2.2 3.3V7.4h5.3V3z' },
  cake: { label: 'עוגה', d: 'M3.5 13h17v8.5h-17zM6 9h12v4H6zM7.9 4.2h1.2V9H7.9zM11.4 4.2h1.2V9h-1.2zM14.9 4.2h1.2V9h-1.2z' + circle(8.5, 3, 0.9) + circle(12, 3, 0.9) + circle(15.5, 3, 0.9) },
  dumbbell: { label: 'משקולת', d: 'M1.5 10h2.3V7.5H7v9H3.8V14H1.5zM22.5 10h-2.3V7.5H17v9h3.2V14h2.3zM7 11h10v2H7z' },
  cap: { label: 'כובע סיום', d: 'M12 3 .8 8.3 12 13.6l9.1-4.3v5.9h1.9V8.3zM5.4 11.7v4c0 1.8 3 3.6 6.6 3.6s6.6-1.8 6.6-3.6v-4L12 14.8z' },
};

export const SAMPLE_LOGOS = Object.keys(RAW);

/** A ready-to-place vector logo element (size and position are set by the layout). */
export function sampleLogo(id: keyof typeof RAW | string): ImageElement {
  const raw = RAW[id] ?? RAW['star-badge'];
  return {
    id: `img-sample-${id}`,
    type: 'image',
    x: 0,
    y: 0,
    rotation: 0,
    width: 10,
    height: 10,
    src: '',
    vector: toSvgD(transformPath(parseSvgPath(raw.d), scale(1 / 24))),
    source: { name: `לוגו לדוגמה – ${raw.label}`, mime: 'image/svg+xml', pxWidth: 24, pxHeight: 24, isVector: true },
  };
}
