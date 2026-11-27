// the stamp KINDS - ONE table that says what every kind of stamp is: the sizes it is really made in,
// how much text it holds, its default ink and where an icon may stand. form.ts takes its defaults from here,
// draw/ its sizes. the sizes themselves are the catalog's (bodies.ts): the bot draws only what the shop sells
import { INK_COLORS, type InkColor } from '@/designer/types'
import { KIND_SIZES } from './bodies'

export type Kind = 'rect' | 'status' | 'round' | 'square'
export type Family = 'sans' | 'serif'
export type Border = 'none' | 'single' | 'double' | 'triple'
export type Sep = 'star' | 'dot' | 'diamond' | 'none'
export type Ink = InkColor
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

// the site's inks (the editor's INK_COLORS): key -> hex. their Hebrew labels are INK_COLORS[key].label
export const INKS = Object.fromEntries((Object.keys(INK_COLORS) as Ink[]).map((k) => [k, INK_COLORS[k].hex])) as Record<Ink, string>
export const INK_NAMES = Object.keys(INKS) as Ink[]

export const KINDS: Record<Kind, KindDef> = {
  // the everyday stamp: the details of a person or a business. small, and the text fills all of it
  rect: {
    label: 'מלבנית',
    sizes: KIND_SIZES.rect,
    ink: 'black',
    iconPos: ['right', 'left', 'top', 'bottom'],
  },
  // one big word (שולם, בוטל, התקבל), sometimes with a line to fill in by hand
  status: {
    label: 'סטטוס',
    sizes: KIND_SIZES.status,
    ink: 'black',
    iconPos: ['right', 'left', 'top', 'bottom'],
  },
  // the official seal: the name rides the top arc
  round: {
    label: 'עגולה',
    sizes: KIND_SIZES.round,
    ink: 'black',
    iconPos: ['center', 'bottom', 'sides'],
  },
  square: {
    label: 'ריבועית',
    sizes: KIND_SIZES.square,
    ink: 'black',
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
