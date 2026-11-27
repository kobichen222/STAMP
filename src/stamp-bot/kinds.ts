// the stamp KINDS - ONE table that says what every kind of stamp is: the sizes it is really made in,
// how much text it holds, its default ink and where an icon may stand. form.ts takes its defaults from here,
// draw/ its sizes, and the editor offers the customer the same sizes

export type Kind = 'rect' | 'status' | 'round' | 'oval' | 'square'
export type Family = 'sans' | 'serif'
export type Border = 'none' | 'single' | 'double' | 'triple'
export type Sep = 'star' | 'dot' | 'diamond' | 'none'
export type Ink = keyof typeof INKS
// where an icon stands. a straight stamp: beside the text or on a row of its own. a seal: in the center area, under its text, or on the ring in place of the ornaments
export type IconPos = 'right' | 'left' | 'top' | 'bottom' | 'center' | 'sides'
export const ICON_POS_LABELS: Record<IconPos, string> = { right: 'מימין', left: 'משמאל', top: 'למעלה', bottom: 'למטה', center: 'במרכז', sides: 'בצדדים' }

// w, h in mm. lines = how many lines of text a stamp of this size holds, arcs and fields included
export type StampSize = { w: number; h: number; lines: number }
// the looks of every kind are its closed catalog of templates, in draw/

type KindDef = {
  label: string
  sizes: StampSize[] // small to big - the engine takes the first one the text fits in
  ink: Ink
  iconPos: IconPos[] // where an icon may stand on this kind. the first is where it goes when the customer named no place
}

// the inks stamp pads are sold in
export const INKS = { blue: '#1e3a8a', black: '#1c1b18', red: '#b91c1c', green: '#15803d' } as const
export const INK_LABELS: Record<Ink, string> = { blue: 'כחול', black: 'שחור', red: 'אדום', green: 'ירוק' }

export const KINDS: Record<Kind, KindDef> = {
  // the everyday stamp: the details of a person or a business. small, and the text fills all of it
  rect: {
    label: 'מלבנית',
    sizes: [
      { w: 38, h: 14, lines: 4 }, // a stamp shop sets 4 short lines in it; a long 4th line still moves up a size by the letter-height floor
      { w: 47, h: 18, lines: 5 },
      { w: 58, h: 22, lines: 6 },
      { w: 70, h: 25, lines: 7 },
      { w: 75, h: 38, lines: 10 },
    ],
    ink: 'blue',
    iconPos: ['right', 'left', 'top', 'bottom'],
  },
  // one big word (שולם, בוטל, התקבל), sometimes with a line to fill in by hand
  status: {
    label: 'סטטוס',
    sizes: [
      { w: 38, h: 14, lines: 1 },
      { w: 47, h: 18, lines: 2 },
      { w: 58, h: 22, lines: 3 },
      { w: 70, h: 25, lines: 4 },
    ],
    ink: 'red',
    iconPos: ['right', 'left', 'top', 'bottom'],
  },
  // the official seal: the name rides the top arc
  round: {
    label: 'עגולה',
    sizes: [
      { w: 30, h: 30, lines: 3 },
      { w: 40, h: 40, lines: 5 },
      { w: 50, h: 50, lines: 7 },
    ],
    ink: 'blue',
    iconPos: ['center', 'bottom', 'sides'],
  },
  oval: {
    label: 'סגלגלה',
    sizes: [
      { w: 45, h: 30, lines: 4 },
      { w: 55, h: 35, lines: 6 },
    ],
    ink: 'blue',
    iconPos: ['center', 'bottom', 'sides'],
  },
  square: {
    label: 'ריבועית',
    sizes: [
      { w: 30, h: 30, lines: 4 },
      { w: 40, h: 40, lines: 6 },
      { w: 50, h: 50, lines: 8 },
    ],
    ink: 'blue',
    iconPos: ['top', 'bottom', 'right', 'left'],
  },
}

export const KIND_NAMES = Object.keys(KINDS) as Kind[]

export function sizeName(s: StampSize) {
  return `${s.w}x${s.h}`
}

export function maxLines(kind: Kind) {
  return Math.max(...KINDS[kind].sizes.map((s) => s.lines))
}
