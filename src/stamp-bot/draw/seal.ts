// the round seal. placement is a fixed rule by slot, the same every time:
// the head rides the top arc, the first contact (or the last number, or the sub / org) the bottom arc,
// everything else stacks in the center with the icon. ornaments stand on the ring between the two arcs.
// the center stack (stack, the items, the split of a long line) is shared with plain.ts
import { linePath, setLine, type Line } from '../glyphs'
import { spikes, star } from '../icons'
import type { StampSize } from '../kinds'
import type { Block, Form, IconSize, Slot } from '../form'
import { MIN_CAP, MIN_STROKE, U, curve, iconInkH, iconSvg, ink, n, splitLine, type Laid, type Shape } from './kit'

export type Weight = Parameters<typeof setLine>[2]
type Border = 'single' | 'double' | 'triple'
type Sep = 'star' | 'diamond' | 'dot'
type SealLook = { id: string; label: string; border: Border; sep: Sep }

const LOOKS: SealLook[] = [
  { id: 'modern', label: 'מודרני', border: 'double', sep: 'star' },
  { id: 'classic', label: 'קלאסי', border: 'triple', sep: 'diamond' },
  { id: 'clean', label: 'נקי', border: 'single', sep: 'dot' },
]

export const MARGIN = 4
// [inset of the line's center from the outer line, stroke width] - outside in
export const BORDERS: Record<Border, [number, number][]> = {
  single: [[0, 6]],
  double: [[0, 6], [9.5, 1.6]],
  triple: [[0, 1.8], [6.5, 5], [13, 1.8]],
}
const THIN = Math.max(MIN_STROKE, 1.6) // the line between the ring and the center - thin, never under what the laser files take
const ARC_CAP = 0.12 // the letter height of the ring, of its radius
const TRACK = 0.06 // the air between the letters of the ring, in font sizes - letters on a curve need more than on a line
const SPREAD = 0.2 // the most a short ring text may open up, in font sizes between two letters
const WORD_AIR = 2.5 // a space opens this many times as much as the gap between two letters, so the words still read apart
const TOP_MIN = 0.24 // a short head is spread to this much of the ring, so it does not sit as a lump on the top
const BOT_MIN = 0.16
const TOP_MAX = { both: 0.6, alone: 0.75 } // of the ring. a long head may take the whole upper ring and more when nothing is under it
const BOT_MAX = 0.4
const CENTER_OVER = 1.3 // a center line is at most this much taller than the ring letters
const NARROW = 0.88 // how narrow the letters of a long line may get before it gets smaller
const FLOOR = 0.7 // a long line gives in down to this much of its place in the hierarchy before the whole stack shrinks
const ICON_REL = 2.4 // the side of an icon in the stack, in font sizes of a detail line
export const ISIZE: Record<IconSize, number> = { s: 0.75, m: 1, l: 1.3 }

// a line by what it is: its size next to the others and its weight
export type Sizes = Record<Slot, { rel: number; weight: Weight }>
// a number is what a seal is for - bold
const SLOT: Sizes = {
  head: { rel: 1.5, weight: 'bold' },
  status: { rel: 1.5, weight: 'black' },
  role: { rel: 1.1, weight: 'bold' },
  org: { rel: 1.1, weight: 'bold' },
  sub: { rel: 1, weight: 'regular' },
  id: { rel: 1, weight: 'bold' },
  contact: { rel: 0.95, weight: 'regular' },
  extra: { rel: 0.95, weight: 'regular' },
}

// an item of a stack, measured at font size 1. lead = the size the gaps around it come from.
// cls = the lines of one place in the hierarchy (the halves of a split line among them): they stay ONE size,
// so a long number does not come out smaller than the number under it
export type Item = { cls?: string; w: number; cap: number; up: number; down: number; rel: number; lead: number; text: boolean; narrow: boolean; draw: (x: number, top: number, s: number, sx: number) => string }

export function textItem(form: Form, text: string, slot: Slot, sizes: Sizes): Item {
  const { rel, weight } = sizes[slot]
  const m = setLine(text, form.font, weight, 1)
  return {
    cls: String(rel),
    w: m.w,
    cap: m.cap,
    up: m.up,
    down: m.down,
    rel,
    lead: 1,
    text: true,
    narrow: true,
    draw: (x, top, s, sx) => {
      const l = setLine(text, form.font, weight, s, 0, sx)
      return `<path d="${linePath(l, (gx) => ({ x: x + gx, y: top + l.cap, a: 0 }))}"/>`
    },
  }
}

// a label on the right and a blank line to write on, left of it
export function fieldItem(form: Form, label: string, rel: number): Item {
  const m = setLine(label + ':', form.font, 'bold', 1)
  const blank = 5.5
  const w = m.w + 0.4 + blank
  return {
    cls: String(rel),
    w,
    cap: m.cap,
    up: m.up,
    down: Math.max(m.down, 0.1),
    rel,
    lead: 1,
    text: true,
    narrow: true,
    draw: (x, top, s, sx) => {
      const l = setLine(label + ':', form.font, 'bold', s, 0, sx)
      const y = top + l.cap
      const W = w * s * sx
      const text = linePath(l, (gx) => ({ x: x + W / 2 - l.w / 2 + gx, y, a: 0 }))
      return `<path d="${text}"/><path d="M${n(x - W / 2)} ${n(y)}H${n(x - W / 2 + blank * s * sx)}" fill="none" stroke="${ink(form)}" stroke-width="${n(Math.max(MIN_STROKE, s * 0.07))}"/>`
    },
  }
}

export function iconItem(form: Form, rel = ICON_REL): Item {
  return { w: 1, cap: iconInkH(form, 1), up: 0, down: 0, rel: rel * ISIZE[form.iconSize], lead: 0.4, text: false, narrow: false, draw: (x, top, s) => iconSvg(form, x, top, s) }
}

// the items stacked, centered by their ink on cx, cy, as big as the area lets them be.
// room(y) = the width of the area at the distance y from cy, <= 0 = outside it. a long line first gets narrow letters,
// then smaller, before the whole stack does. air = how much the gaps may open to take the height left over (halfH)
export function stack(items: Item[], cx: number, cy: number, room: (y: number) => number, maxCap: number, air = 0, halfH = 0) {
  if (!items.length) return { body: '', cap: Infinity }

  const gaps = (s: number[]) =>
    items.slice(1).map((it, i) => {
      const p = items[i]
      const mean = Math.sqrt(p.lead * s[i] * it.lead * s[i + 1])
      // never less than what keeps a ק from touching a ל under it
      return Math.max(mean * 0.42, p.down * s[i] + it.up * s[i + 1] + mean * 0.08)
    })
  const height = (s: number[], g: number[]) => items[0].up * s[0] + items.reduce((a, it, i) => a + it.cap * s[i], 0) + g.reduce((a, b) => a + b, 0) + items[items.length - 1].down * s[items.length - 1]
  const tops = (s: number[], g: number[]) => {
    let y = -height(s, g) / 2 + items[0].up * s[0]
    return items.map((it, i) => {
      const t = y
      y += it.cap * s[i] + (g[i] || 0)
      return t
    })
  }

  const at = (k: number) => {
    const s = items.map((it) => k * it.rel)
    const sx = items.map(() => 1)
    for (let iter = 0; iter < 40; iter++) {
      const t = tops(s, gaps(s))
      let changed = false
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const y = Math.max(Math.abs(t[i] - it.up * s[i]), Math.abs(t[i] + (it.cap + it.down) * s[i]))
        const r = room(y)
        if (r <= 0) return null
        const need = it.w * s[i]
        sx[i] = 1
        if (need <= r) continue
        if (it.narrow && need * NARROW <= r) {
          sx[i] = r / need
          continue
        }
        const ns = r / (it.w * (it.narrow ? NARROW : 1)) - 0.01
        if (ns < k * it.rel * FLOOR) return null
        s[i] = ns
        sx[i] = it.narrow ? NARROW : 1
        changed = true
      }
      // the lines of a class keep one size and one narrowness
      for (const c of new Set(items.map((it) => it.cls).filter((c) => c !== undefined))) {
        const idx = items.flatMap((it, i) => (it.cls === c ? [i] : []))
        const ms = Math.min(...idx.map((i) => s[i]))
        const mx = Math.min(...idx.map((i) => sx[i]))
        for (const i of idx) {
          if (s[i] > ms + 0.001) changed = true
          s[i] = ms
          sx[i] = mx
        }
      }
      // and never comes out bigger than a line above it in the hierarchy
      for (let i = 0; i < items.length; i++) {
        for (let j = 0; j < items.length; j++) {
          if (items[i].text && items[j].text && items[j].rel > items[i].rel && s[i] > s[j] + 0.001) {
            s[i] = s[j]
            changed = true
          }
        }
      }
      if (!changed) return { s, sx }
    }
    return null
  }

  const caps = items.filter((it) => it.text).map((it) => it.cap * it.rel)
  let hi = caps.length ? maxCap / Math.max(...caps) : 1e4
  let lo = 0
  for (let i = 0; i < 40; i++) {
    const k = (lo + hi) / 2
    if (at(k)) lo = k
    else hi = k
  }
  const got = at(lo)
  if (!got) return { body: '', cap: 0 }
  let g = gaps(got.s)
  const all = g.reduce((a, b) => a + b, 0)
  const free = 2 * halfH - height(got.s, g)
  if (air > 0 && all > 0 && free > 0) g = g.map((v) => v + (Math.min(free, all * air) * v) / all)
  const t = tops(got.s, g)
  return {
    body: items.map((it, i) => it.draw(cx, cy + t[i], got.s[i], got.sx[i])).join(''),
    cap: Math.min(...items.map((it, i) => (it.text ? it.cap * got.s[i] : Infinity))),
  }
}

export type Text = { text: string; slot: Slot; split?: boolean }
export type Tried = { body: string; cap: number; rows: number }

// the texts laid as they are, then with the longest line split in two (twice at most). a split is kept when it
// leaves the letters clearly bigger and the rows still fit. only a long line, and never between a label and its
// number: a line with digits splits only where both halves keep some (two licenses, two phones)
export function bestSplit(form: Form, texts: Text[], sizes: Sizes, lines: number, lay: (texts: Text[]) => Tried): Tried {
  const tries = [lay(texts)]
  const cut = (text: string) => {
    const parts = splitLine(text)
    return parts && (!/\d/.test(text) || parts.every((p) => /\d/.test(p))) ? parts : null
  }
  for (let k = 0; k < 2; k++) {
    const m = texts.map((t) => (!t.split && t.text.length >= 12 && cut(t.text) ? setLine(t.text, form.font, sizes[t.slot].weight, sizes[t.slot].rel).w : -1))
    const i = m.indexOf(Math.max(0, ...m))
    const parts = i < 0 ? null : cut(texts[i].text)
    if (!parts) break
    texts = [...texts.slice(0, i), ...parts.map((text) => ({ text, slot: texts[i].slot, split: true })), ...texts.slice(i + 1)]
    tries.push(lay(texts))
  }
  const fit = (t: Tried) => t.rows <= lines && t.cap >= MIN_CAP - 0.01
  const best = (list: Tried[]) => list.reduce((a, b) => (b.cap > a.cap * 1.15 ? b : a))
  if (tries.some(fit)) return best(tries.filter(fit))
  const inRows = tries.filter((t) => t.rows <= lines)
  return inRows.length ? best(inRows) : tries[0]
}

// the arcs and the center, by slot. a center left empty takes the bottom arc's line, and a head alone is the center
function place(blocks: Block[], centerIcon: boolean, fields: boolean) {
  const rest = [...blocks]
  const take = (i: number) => (i < 0 ? null : rest.splice(i, 1)[0])
  let top = take(rest.findIndex((b) => b.slot === 'head'))
  if (!top) top = take(0)
  let i = rest.findIndex((b) => b.slot === 'contact')
  if (i < 0) i = rest.findLastIndex((b) => b.slot === 'id')
  if (i < 0) i = rest.findIndex((b) => b.slot === 'sub' || b.slot === 'org')
  let bottom = take(i)
  if (!rest.length && !centerIcon && !fields) {
    if (bottom) [rest[0], bottom] = [bottom, null]
    else if (top) [rest[0], top] = [top, null]
  }
  return { top, bottom, center: rest }
}

// a star stands upright wherever it is, a diamond points away from the center
function ornament(sep: Sep, x: number, y: number, cap: number, a: number) {
  if (sep === 'star') return `<path d="${star(x, y, cap * 0.62, 0)}"/>`
  if (sep === 'diamond') return `<path d="${spikes(x, y, cap * 0.62, a, 4, 0.5)}"/>`
  return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(cap * 0.22)}"/>`
}
const SEP_W: Record<Sep, number> = { star: 1.25, diamond: 0.7, dot: 0.45 } // along the ring, of its letter height

// a short ring text gets air between its letters instead of sitting as a small lump on a long arc, up to `want` wide
function spread(l: Line | null, want: number, most: number): Line | null {
  if (!l || l.glyphs.length < 2 || l.w >= want) return l
  const gaps = l.glyphs.slice(1).map((gl, i) => (gl.g.cmds.length && l.glyphs[i].g.cmds.length ? 1 : WORD_AIR / 2))
  const units = gaps.reduce((a, b) => a + b, 0)
  const add = Math.min(most, (want - l.w) / units)
  let off = 0
  const glyphs = l.glyphs.map((gl, i) => {
    if (i) off += gaps[i - 1] * add
    return { g: gl.g, x: gl.x + off }
  })
  for (const gl of glyphs) gl.x -= off / 2
  return { ...l, w: l.w + off, glyphs }
}

// the ring: the head on the top arc, a detail on the bottom arc, ornaments (or the icons) between them.
// a0, b0 = where the ring starts, the inner side of the border. returns the center area inside it
function ring(form: Form, look: SealLook, top: Block | null, bot: Block | null, sides: boolean, cx: number, cy: number, a0: number, b0: number) {
  const capRatio = setLine('ה', form.font, 'bold', 1).cap
  const both = !!top && !!bot
  let cap = Math.min(a0, b0) * ARC_CAP
  let f = 0
  let pad = 0
  let half = 0
  let box = 0
  let tl: Line | null = null
  let bl: Line | null = null
  let mid = curve(cx, cy, a0, b0)

  // the biggest letters that leave room for the ornaments between the two texts
  for (; ; cap -= 0.25) {
    f = cap / capRatio
    tl = top ? setLine(top.text, form.font, 'bold', f, f * TRACK) : null
    bl = bot ? setLine(bot.text, form.font, 'bold', f, f * TRACK) : null
    const lines = [tl, bl].filter((l): l is Line => !!l)
    // ascenders and descenders: on the top arc a ל points out and a ק in, on the bottom arc the other way round
    const ext = lines.length ? Math.max(...lines.map((l) => Math.max(l.up, l.down))) : cap * 0.35
    pad = cap * 0.4
    half = cap / 2 + ext
    mid = curve(cx, cy, a0 - pad - half, b0 - pad - half)
    box = Math.min(2 * half + pad, cap * 1.9 * ISIZE[form.iconSize])
    const gap = (sides ? box : cap * SEP_W[look.sep]) + cap * 1.6
    const T = mid.total
    const tw = tl?.w || 0
    const bw = bl?.w || 0
    let ok = true
    if (both) ok = tw + bw + 2 * gap <= T && tw <= T * TOP_MAX.both && bw <= T * BOT_MAX
    else if (top && sides) ok = tw <= T / 2 - gap
    else if (top) ok = tw + gap <= T && tw <= T * TOP_MAX.alone
    if (ok || cap <= 6) break
  }

  const T = mid.total
  tl = spread(tl, T * TOP_MIN, f * SPREAD)
  bl = spread(bl, T * BOT_MIN, f * SPREAD)

  // glyph centers ride the middle of the band; the baseline is half a letter height away from it.
  // the bottom arc runs the other way, so its letters stand upright and read left to right
  const on = (l: Line, s0: number, dir: 1 | -1) =>
    linePath(l, (x) => {
      const p = mid.at(s0 + dir * x)
      const ux = p.nx * dir
      const uy = p.ny * dir
      return { x: p.x - (ux * l.cap) / 2, y: p.y - (uy * l.cap) / 2, a: Math.atan2(ux, -uy) }
    })
  let svg = ''
  if (tl) svg += `<path d="${on(tl, 0, 1)}"/>`
  if (bl) svg += `<path d="${on(bl, T / 2, -1)}"/>`

  // the ornaments stand in the middle of the free arcs. icons on the sides take the place of the side ones
  const tw = tl?.w || 0
  const bw = bl?.w || 0
  const at = (s: number, icon: boolean) => {
    const p = mid.at(s)
    if (icon) return iconSvg(form, p.x, p.y - iconInkH(form, box) / 2, box)
    return ornament(look.sep, p.x, p.y, cap, Math.atan2(p.nx, -p.ny))
  }
  if (bl) {
    const s = (tw / 2 + T / 2 - bw / 2) / 2
    svg += at(s, sides) + at(T - s, sides)
  } else {
    if (sides) svg += at(T / 4, true) + at((3 * T) / 4, true)
    // a ring with no text at all is kept symmetric: an ornament on the top as on the bottom
    svg += (tl ? '' : at(0, false)) + at(T / 2, false)
  }

  const band = 2 * (pad + half)
  svg += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(a0 - band)}" ry="${n(b0 - band)}" fill="none" stroke="${ink(form)}" stroke-width="${n(THIN)}"/>`
  const inner = band + THIN / 2 + Math.max(8, cap * 0.5)
  return { svg, cap: Math.min(tl?.cap ?? Infinity, bl?.cap ?? Infinity), ai: a0 - inner, bi: b0 - inner, rows: (tl ? 1 : 0) + (bl ? 1 : 0) }
}

function seal(): Shape {
  return {
    looks: LOOKS.map(({ id, label }) => ({ id, label })),
    lay(form: Form, blocks: Block[], size: StampSize, lookId: string): Laid | null {
      const look = LOOKS.find((l) => l.id === lookId) ?? LOOKS[0]
      const w = size.w * U
      const h = size.h * U
      const cx = w / 2
      const cy = h / 2
      const A = w / 2 - MARGIN
      const B = h / 2 - MARGIN
      const color = ink(form)
      const pos = form.icon ? form.iconPos : null
      const sides = pos === 'sides'

      let body = ''
      let edge = 0
      for (const [inset, sw] of BORDERS[look.border]) {
        body += `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(A - inset)}" ry="${n(B - inset)}" fill="none" stroke="${color}" stroke-width="${n(Math.max(MIN_STROKE, sw))}"/>`
        edge = inset + Math.max(MIN_STROKE, sw) / 2
      }
      const a0 = A - edge
      const b0 = a0

      const { top, bottom, center } = place(blocks, pos === 'center' || pos === 'bottom', form.fields.length > 0)
      let ai = a0 - 12
      let bi = b0 - 12
      let ringCap = Infinity
      let rows = 0
      let maxCap = Math.min(ai, bi) * 0.42
      if (top || bottom || sides) {
        const r = ring(form, look, top, bottom, sides, cx, cy, a0, b0)
        body += r.svg
        ;({ ai, bi, rows } = r)
        ringCap = r.cap
        if (r.cap < Infinity) maxCap = r.cap * CENTER_OVER
      }

      const room = (y: number) => (y >= bi || ai <= 0 ? 0 : 2 * ai * Math.sqrt(1 - (y / bi) ** 2))
      const lay = (texts: Text[]): Tried => {
        const items: Item[] = []
        if (pos === 'center') items.push(iconItem(form))
        for (const t of texts) items.push(textItem(form, t.text, t.slot, SLOT))
        for (const fl of form.fields) items.push(fieldItem(form, fl, SLOT.extra.rel))
        if (pos === 'bottom') items.push(iconItem(form))
        const st = stack(items, cx, cy, room, maxCap)
        return { body: st.body, cap: Math.min(st.cap, ringCap), rows: rows + texts.length + form.fields.length }
      }
      const got = bestSplit(form, center.map((b) => ({ text: b.text, slot: b.slot })), SLOT, size.lines, lay)
      return { body: body + got.body, cap: got.cap, rows: got.rows }
    },
  }
}

export const ROUND: Shape = seal()
