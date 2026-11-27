// the square stamp (a centered stack in a frame) and the status stamp (the word IS the stamp: big and black,
// what else the customer asked for small under it, the fields to fill in by hand at the bottom).
// the stack itself is the seal's (seal.ts), set into a rectangle instead of an ellipse
import type { StampSize } from '../kinds'
import type { Block, Form } from '../form'
import { MIN_STROKE, U, iconInkH, iconSvg, ink, n, type Laid, type Shape } from './kit'
import { BORDERS, ISIZE, MARGIN, bestSplit, fieldItem, iconItem, stack, textItem, type Item, type Sizes, type Text, type Tried } from './seal'

type Frame = 'single' | 'double'
type PlainLook = { id: string; label: string; frame: Frame }

const SQUARE_LOOKS: PlainLook[] = [
  { id: 'single', label: 'מסגרת יחידה', frame: 'single' },
  { id: 'double', label: 'מסגרת כפולה', frame: 'double' },
]
const STATUS_LOOKS: PlainLook[] = [
  { id: 'double', label: 'מסגרת כפולה', frame: 'double' },
  { id: 'single', label: 'מסגרת יחידה', frame: 'single' },
]

const SQUARE_SIZES: Sizes = {
  head: { rel: 1.5, weight: 'bold' },
  status: { rel: 1.5, weight: 'black' },
  role: { rel: 1.1, weight: 'bold' },
  org: { rel: 1.1, weight: 'bold' },
  sub: { rel: 1, weight: 'regular' },
  id: { rel: 1, weight: 'regular' },
  contact: { rel: 1, weight: 'regular' },
  extra: { rel: 1, weight: 'regular' },
}
// the word of a status stamp, and the head of one the customer wrote line by line, is the stamp
const STATUS_SIZES: Sizes = { ...SQUARE_SIZES, head: { rel: 2.2, weight: 'black' }, status: { rel: 2.2, weight: 'black' } }

const SIDE_ICON = 0.3 // an icon beside the text takes at most this much of the width
// pad = of the smaller side, cap = the biggest letter, of the height. air = how much the gaps may open.
// icon = the side of an icon on a row of its own, in font sizes of a detail line - beside the word of a status it stays smaller
const PART = { square: { pad: 0.05, cap: 0.22, air: 1.2, icon: 2.4 }, status: { pad: 0.09, cap: 0.62, air: 0.6, icon: 1.6 } }

function plain(looks: PlainLook[], sizes: Sizes, status: boolean): Shape {
  const part = status ? PART.status : PART.square
  return {
    looks: looks.map(({ id, label }) => ({ id, label })),
    lay(form: Form, blocks: Block[], size: StampSize, lookId: string): Laid | null {
      const look = looks.find((l) => l.id === lookId) ?? looks[0]
      const w = size.w * U
      const h = size.h * U
      let cx = w / 2
      const cy = h / 2
      // a small stamp gets a lighter frame, down to what rubber can still hold
      const bs = Math.min(1, Math.max(0.6, Math.min(w, h) / 300))
      const A = w / 2 - MARGIN * bs
      const B = h / 2 - MARGIN * bs
      const color = ink(form)

      let body = ''
      let edge = 0
      for (const [inset, sw] of BORDERS[look.frame]) {
        const i = inset * bs
        const s = Math.max(MIN_STROKE, sw * bs)
        body += `<rect x="${n(cx - A + i)}" y="${n(cy - B + i)}" width="${n((A - i) * 2)}" height="${n((B - i) * 2)}" rx="${n(Math.max(2, 14 * bs - i))}" fill="none" stroke="${color}" stroke-width="${n(s)}"/>`
        edge = i + s / 2
      }
      const pad = Math.max(8, Math.min(w, h) * part.pad)
      let W = (A - edge - pad) * 2
      const H = (B - edge - pad) * 2

      // the word first (a status stamp), then the lines in their order
      const texts: Text[] = blocks.map((b) => ({ text: b.text, slot: b.slot }))
      if (status && texts.length && texts[0].slot !== 'status' && texts[0].slot !== 'head') texts[0] = { ...texts[0], slot: 'status' }
      const pos = form.icon ? form.iconPos : null
      const hasText = texts.length + form.fields.length > 0

      // an icon beside the text. with no text beside it, it takes a row of its own
      if ((pos === 'right' || pos === 'left') && hasText) {
        const s = Math.min(H, W * SIDE_ICON * ISIZE[form.iconSize])
        const gap = W * 0.04
        const x = pos === 'right' ? cx + W / 2 - s / 2 : cx - W / 2 + s / 2
        body += iconSvg(form, x, cy - iconInkH(form, s) / 2, s)
        cx += ((pos === 'right' ? -1 : 1) * (s + gap)) / 2
        W -= s + gap
      }
      const row = !!pos && !((pos === 'right' || pos === 'left') && hasText)

      const room = (y: number) => (y >= H / 2 ? 0 : W)
      const lay = (list: Text[]): Tried => {
        const items: Item[] = []
        if (row && pos !== 'bottom') items.push(iconItem(form, part.icon))
        for (const t of list) items.push(textItem(form, t.text, t.slot, sizes))
        for (const f of form.fields) items.push(fieldItem(form, f, 1))
        if (row && pos === 'bottom') items.push(iconItem(form, part.icon))
        const st = stack(items, cx, cy, room, H * part.cap, part.air, H / 2)
        return { body: st.body, cap: st.cap, rows: list.length + form.fields.length }
      }
      const got = bestSplit(form, texts, sizes, size.lines, lay)
      return { body: body + got.body, cap: got.cap, rows: got.rows }
    },
  }
}

export const SQUARE: Shape = plain(SQUARE_LOOKS, SQUARE_SIZES, false)
export const STATUS: Shape = plain(STATUS_LOOKS, STATUS_SIZES, true)
