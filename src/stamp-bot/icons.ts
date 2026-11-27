// the ICON library: bold simple outlines a rubber stamp can hold. shared by render.ts (draws them on the stamp),
// the editor (shows them to pick from) and the prompt (the model picks by name - it never draws one itself).
// every icon lives in a 100x100 box. y = where the ink starts and ends, so the gaps around it are measured from what is seen
export type Icon = { label: string; fill?: string; stroke?: string; sw?: number; y: [number, number] }

// points around a center, every second one pulled in: 10 points = a star, 4 = a diamond, 16 = a gear
export function spikes(cx: number, cy: number, r: number, a: number, points: number, inner: number) {
  let d = ''
  for (let i = 0; i < points; i++) {
    const rad = i % 2 ? r * inner : r
    const t = a + (i * 2 * Math.PI) / points
    d += (i ? 'L' : 'M') + +(cx + rad * Math.sin(t)).toFixed(2) + ' ' + +(cy - rad * Math.cos(t)).toFixed(2)
  }
  return d + 'Z'
}

export function star(cx: number, cy: number, r: number, a: number) {
  return spikes(cx, cy, r, a, 10, 0.4)
}

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`

export const ICONS: Record<string, Icon> = {
  scales: {
    label: 'מאזניים',
    fill: 'M50 5a6.5 6.5 0 1 0 .01 0ZM1 57H31C31 67 25 74 16 74C7 74 1 67 1 57ZM69 57H99C99 67 93 74 84 74C75 74 69 67 69 57ZM40 80H60V86H72V94H28V86H40Z',
    stroke: 'M50 14V82M15 25H85M16 25L4 57M16 25L28 57M84 25L72 57M84 25L96 57',
    sw: 4.5,
    y: [0, 94],
  },
  star: { label: 'כוכב', fill: star(50, 52, 50, 0), y: [2, 93] },
  magen: { label: 'מגן דוד', stroke: 'M50 7L87.2 71.5H12.8ZM50 93L12.8 28.5H87.2Z', sw: 6, y: [4, 96] },
  check: { label: 'וי', stroke: 'M14 54L39 79L87 22', sw: 13, y: [15, 86] },
  x: { label: 'איקס', stroke: 'M20 20L80 80M80 20L20 80', sw: 13, y: [13, 87] },
  plus: { label: 'פלוס', fill: 'M37 8H63V37H92V63H63V92H37V63H8V37H37Z', y: [8, 92] },
  heart: { label: 'לב', fill: 'M50 90C20 68 6 51 6 33C6 19 17 9 30 9C39 9 46 14 50 21C54 14 61 9 70 9C83 9 94 19 94 33C94 51 80 68 50 90Z', y: [9, 90] },
  house: { label: 'בית', stroke: 'M50 12L10 48H22V88H78V48H90ZM42 88V62H58V88', sw: 7, y: [8, 92] },
  building: { label: 'בניין', stroke: 'M16 92V16H64V92M64 40H86V92M8 92H92', fill: 'M28 28h10v10h-10zM46 28h10v10h-10zM28 48h10v10h-10zM46 48h10v10h-10zM28 68h10v10h-10zM46 68h10v10h-10zM71 52h8v8h-8zM71 70h8v8h-8z', sw: 6, y: [13, 95] },
  car: { label: 'רכב', stroke: `M14 66L23 42C25 36 28 34 34 34H66C72 34 75 36 77 42L86 66V78H14ZM14 66H86M30 52V66M70 52V66${circle(30, 78, 6)}${circle(70, 78, 6)}`, sw: 6, y: [31, 87] },
  truck: { label: 'משאית', stroke: `M8 28H60V72H8ZM60 44H78L90 58V72H60${circle(24, 76, 8)}${circle(74, 76, 8)}`, sw: 6, y: [25, 87] },
  bike: { label: 'אופניים', stroke: `${circle(24, 68, 16)}${circle(76, 68, 16)}M24 68L42 36H64L76 68M42 36L54 68L64 36M58 26H70`, sw: 5, y: [23, 87] },
  tooth: { label: 'שן', stroke: 'M50 30C42 20 22 18 20 38C18 54 28 64 30 82C32 92 41 92 43 80C45 72 47 70 50 70C53 70 55 72 57 80C59 92 68 92 70 82C72 64 82 54 80 38C78 18 58 20 50 30Z', sw: 6, y: [17, 94] },
  scissors: { label: 'מספריים', stroke: `${circle(28, 78, 9)}${circle(72, 78, 9)}M34 70L70 20M66 70L30 20`, sw: 7, y: [16, 90] },
  envelope: { label: 'מעטפה', stroke: 'M10 26H90V76H10ZM10 28L50 56L90 28', sw: 6, y: [23, 79] },
  phone: { label: 'טלפון', stroke: 'M22 14C14 14 12 22 14 34C20 62 40 82 68 88C78 90 86 86 86 78L86 70L68 62L60 72C46 66 34 54 28 40L38 32L30 14Z', sw: 6, y: [11, 92] },
  mobile: { label: 'נייד', stroke: 'M28 8H72V92H28ZM28 74H72M46 83H54', sw: 6, y: [5, 95] },
  at: { label: 'שטרודל', stroke: `${circle(50, 50, 16)}M66 50V58C66 66 78 66 78 56V50A28 28 0 1 0 66 74`, sw: 6, y: [19, 81] },
  globe: { label: 'כדור הארץ', stroke: `${circle(50, 50, 40)}M10 50H90M50 10C30 30 30 70 50 90C70 70 70 30 50 10`, sw: 5, y: [7, 93] },
  pin: { label: 'מיקום', stroke: `M50 94C50 94 20 60 20 38A30 30 0 0 1 80 38C80 60 50 94 50 94Z${circle(50, 38, 10)}`, sw: 6, y: [5, 96] },
  wrench: { label: 'מפתח ברגים', fill: 'M88 24L74 38L62 26L76 12A24 24 0 0 0 44 42L12 74A9 9 0 0 0 26 88L58 56A24 24 0 0 0 88 24Z', y: [9, 92] },
  hammer: { label: 'פטיש', stroke: 'M14 86L48 52', fill: 'M68.3 14.1L83.9 29.7L55.7 57.9L40.1 42.3ZM68.3 14.1L60 6L46 20L54 28Z', sw: 9, y: [6, 90] },
  gavel: { label: 'פטיש שופטים', stroke: 'M14 84L50 48M52 90H90', fill: 'M70.5 15.3L84.7 29.5L53.5 60.7L39.3 46.5Z', sw: 8, y: [15, 94] },
  gear: { label: 'גלגל שיניים', stroke: `${spikes(50, 50, 42, 0, 16, 0.78)}${circle(50, 50, 12)}`, sw: 6, y: [5, 95] },
  key: { label: 'מפתח', stroke: `${circle(30, 50, 20)}M50 50H92M80 50V66M92 50V62`, sw: 7, y: [27, 73] },
  bolt: { label: 'ברק', fill: 'M56 6L20 56H46L40 94L80 42H54Z', y: [6, 94] },
  leaf: { label: 'עלה', stroke: 'M16 84C16 42 44 16 86 14C88 56 60 86 16 84ZM16 84L64 36', sw: 6, y: [11, 87] },
  tree: { label: 'עץ', stroke: 'M50 10L74 42H62L82 68H56V90H44V68H18L38 42H26Z', sw: 6, y: [6, 93] },
  flower: { label: 'פרח', stroke: `${circle(50, 22, 12)}${circle(69, 36, 12)}${circle(62, 58, 12)}${circle(38, 58, 12)}${circle(31, 36, 12)}M50 70V94`, sw: 5, y: [7, 94] },
  sun: { label: 'שמש', stroke: `${circle(50, 50, 16)}M76 50H86M24 50H14M50 76V86M50 24V14M68.4 68.4L75.5 75.5M31.6 31.6L24.5 24.5M68.4 31.6L75.5 24.5M31.6 68.4L24.5 75.5`, sw: 6, y: [11, 89] },
  drop: { label: 'טיפה', fill: 'M50 8C50 8 20 44 20 64C20 82 34 94 50 94C66 94 80 82 80 64C80 44 50 8 50 8Z', y: [8, 94] },
  flame: { label: 'להבה', fill: 'M50 6C56 26 78 36 78 62C78 80 66 94 50 94C34 94 22 80 22 62C22 52 26 44 32 36C32 50 42 54 44 50C40 40 44 20 50 6Z', y: [6, 94] },
  paw: { label: 'כף רגל', fill: `M50 88C34 88 22 78 24 66C26 56 38 50 50 50C62 50 74 56 76 66C78 78 66 88 50 88Z${circle(28, 44, 8)}${circle(42, 28, 8)}${circle(58, 28, 8)}${circle(72, 44, 8)}`, y: [20, 88] },
  eye: { label: 'עין', stroke: 'M6 50C22 24 78 24 94 50C78 76 22 76 6 50Z', fill: circle(50, 50, 11), sw: 6, y: [28, 72] },
  camera: { label: 'מצלמה', stroke: `M10 32H32L38 20H62L68 32H90V82H10Z${circle(50, 56, 14)}`, sw: 6, y: [17, 85] },
  music: { label: 'תו', fill: `${circle(30, 74, 11)}${circle(66, 66, 11)}`, stroke: 'M41 74V20L77 12V66M41 34L77 26', sw: 7, y: [8, 85] },
  book: { label: 'ספר', stroke: 'M50 30C40 20 24 20 12 24V80C24 76 40 76 50 86C60 76 76 76 88 80V24C76 20 60 20 50 30ZM50 30V86', sw: 6, y: [17, 89] },
  pen: { label: 'עט', stroke: 'M20 76L64 32L78 46L34 90L18 92ZM64 32L74 22L88 36L78 46', sw: 6, y: [19, 95] },
  cap: { label: 'כובע סיום', fill: 'M50 20L94 42L50 64L6 42Z', stroke: 'M22 50V70C36 84 64 84 78 70V50M94 42V66', sw: 6, y: [20, 87] },
  cup: { label: 'כוס', stroke: 'M18 40H70V66A18 18 0 0 1 52 84H36A18 18 0 0 1 18 66ZM70 46H80A10 10 0 0 1 80 66H70M34 30V18M50 30V18', sw: 6, y: [15, 87] },
  chef: { label: 'כובע שף', stroke: 'M28 60C10 60 10 32 30 34C32 16 68 16 70 34C90 32 90 60 72 60V84H28ZM28 72H72', sw: 6, y: [17, 87] },
  cake: { label: 'עוגה', stroke: 'M14 58H86V90H14ZM14 74H86M30 58V42M50 58V40M70 58V42', fill: `${circle(30, 32, 4)}${circle(50, 30, 4)}${circle(70, 32, 4)}`, sw: 6, y: [26, 93] },
  gift: { label: 'מתנה', stroke: 'M12 42H88V56H12ZM18 56V90H82V56M50 42V90M50 42C34 42 26 30 34 24C42 18 50 30 50 42C50 30 58 18 66 24C74 30 66 42 50 42', sw: 6, y: [17, 93] },
  cart: { label: 'עגלה', stroke: 'M6 18H20L32 66H78L88 34H26', fill: `${circle(38, 82, 7)}${circle(72, 82, 7)}`, sw: 6, y: [15, 89] },
  dumbbell: { label: 'משקולת', stroke: 'M12 38V62M22 30V70M78 30V70M88 38V62M22 50H78', sw: 8, y: [26, 74] },
  shield: { label: 'מגן', stroke: 'M50 8L86 22C86 56 72 80 50 92C28 80 14 56 14 22Z', sw: 6, y: [5, 95] },
  crown: { label: 'כתר', stroke: 'M12 30L30 54L50 20L70 54L88 30L82 80H18Z', sw: 6, y: [17, 83] },
  anchor: { label: 'עוגן', stroke: `${circle(50, 16, 8)}M50 24V88M28 46H72M14 60C18 80 34 90 50 90C66 90 82 80 86 60`, sw: 6, y: [5, 93] },
  bell: { label: 'פעמון', stroke: 'M50 10V16M24 68C30 60 30 50 30 40A20 20 0 0 1 70 40C70 50 70 60 76 68ZM40 78A10 10 0 0 0 60 78', sw: 6, y: [7, 91] },
  clock: { label: 'שעון', stroke: `${circle(50, 50, 40)}M50 26V50H68`, sw: 6, y: [7, 93] },
  glasses: { label: 'משקפיים', stroke: `${circle(26, 56, 16)}${circle(74, 56, 16)}M42 56H58M10 56L4 40M90 56L96 40`, sw: 5, y: [37, 75] },
}

export const ICON_NAMES = Object.keys(ICONS)

export function isIcon(name: unknown): name is string {
  return typeof name === 'string' && name in ICONS
}

// the icon as a small svg of its own - the editor's picker
export function iconPreview(name: string, color: string) {
  const ic = ICONS[name]
  if (!ic) return ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${color}">` +
    (ic.fill ? `<path d="${ic.fill}"/>` : '') +
    (ic.stroke ? `<path d="${ic.stroke}" fill="none" stroke="${color}" stroke-width="${ic.sw}" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
    '</svg>'
  )
}
