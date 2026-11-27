// the RECTANGULAR stamp - the everyday one. its looks are a CLOSED catalog: every look is a finished design
// (a frame, a structure, an alignment) and the blocks are set into it. nothing about the design comes from the text:
// the lines have a fixed hierarchy by slot, a long line gets narrower letters a little, a long head splits into
// two rows, and past that the stamp gets bigger (index.ts walks the sizes)
import { linePath, setLine } from '../glyphs'
import type { StampSize } from '../kinds'
import type { Block, Form, IconSize, Slot } from '../form'
import { MIN_CAP, MIN_STROKE, U, iconInkH, iconSvg, ink, n, splitLine, type Laid, type Shape } from './kit'

type Weight = 'regular' | 'bold' | 'black'
type Design = {
  label: string
  frame: 'none' | 'single' | 'double'
  layout: 'stack' | 'split' // the lines one under another | the name beside the details
  align: 'center' | 'right'
  head: 'plain' | 'rule' | 'band' | 'bar' // what sets the name apart from the details
}

// the catalog. the first one is the default
const DESIGNS: Record<string, Design> = {
  classic: { label: 'קלאסי', frame: 'none', layout: 'stack', align: 'center', head: 'plain' },
  rule: { label: 'קו מפריד', frame: 'none', layout: 'stack', align: 'center', head: 'rule' },
  frame: { label: 'ממוסגר', frame: 'single', layout: 'stack', align: 'center', head: 'plain' },
  band: { label: 'כותרת מלאה', frame: 'none', layout: 'stack', align: 'center', head: 'band' },
  split: { label: 'שני טורים', frame: 'none', layout: 'split', align: 'center', head: 'rule' },
  bar: { label: 'פס צד', frame: 'none', layout: 'stack', align: 'right', head: 'bar' },
  double: { label: 'מסגרת כפולה', frame: 'double', layout: 'stack', align: 'center', head: 'plain' },
}

// the classes of lines. every line of a class has ONE size
type Cls = 'head' | 'sub' | 'role' | 'detail' | 'icon'
type TextCls = Exclude<Cls, 'icon'>
const CLS: Record<Slot, TextCls> = { head: 'head', status: 'head', sub: 'sub', role: 'role', org: 'role', id: 'detail', contact: 'detail', extra: 'detail' }
// how tall the letters of a class are seen, in heights of a detail line. seen = digits and latin capitals included:
// they stand a quarter taller than hebrew letters, and a number line set like the head would look as big as it
// a pair is [tight, full]: the design is drawn full, and eases toward tight only as far as it takes to keep
// the details readable - many lines on a small stamp, the way a stamp shop sets them
type Pair = [number, number]
const REL: Record<TextCls, Pair> = { head: [1.25, 1.5], sub: [1.1, 1.2], role: [1.05, 1.1], detail: [1, 1] }
const WEIGHT: Record<TextCls, Weight> = { head: 'bold', sub: 'bold', role: 'bold', detail: 'regular' }
// a long line gets smaller, and the head still stays at least this much bigger than the lines under it
const OVER: Record<Exclude<TextCls, 'head'>, Pair> = { sub: [1.05, 1.18], role: [1.03, 1.14], detail: [1.05, 1.25] }
const HEAD_TRACK = 0.015 // the air between the letters of the head, in font sizes
const NARROW = 0.86 // how narrow the letters of a long line may get. past that the lines of its class get smaller, all together
const MAX_UNIT = 0.25 // the seen height of a detail line, of the height of the area. one word alone is big, and still does not swell to all of it
const LEAD = 0.46 // between two lines, in font sizes
const GROUP: Pair = [1.15, 1.7] // the gap between the head's lines and the details, in gaps of two lines
const MAX_AIR = 0.6 // how much the gaps may open to fill a stamp the text does not reach the edges of
const RULE = { gap: [1.8, 2.4] as Pair, sw: 0.055 } // the gap a rule lies in the middle of, and how thick it is (of the font size)
const BAND = { pad: 0.5, side: 0.7, gap: 1.35 } // a band: its padding above and under the text and at the sides, in letter heights, and the gap under it
const BAR = { w: 0.045, gap: 0.08 } // the side bar and the gap between it and the text, of the height of the area
const COLS = { gap: 2.3, air: 0.5, grow: 1.4 } // two columns: the gap the rule stands in, how much free width it may take, how much the head may grow
const FIELD = { blank: 5.5, gap: 0.4 } // a field: the line to write on and the gap before it, in font sizes
const ICON_ROW: Pair = [1.2, 1.7] // an icon on a row of its own: its box, in font sizes of the head
const SIDE_ICON = 0.28 // an icon beside the text: its box, of the width
const ISIZE: Record<IconSize, number> = { s: 0.75, m: 1, l: 1.3 }

// a line measured at font size 1. sx = how narrow its letters are drawn
type Row = { w: number; cap: number; seen: number; up: number; down: number; cls: Cls; text: boolean; draw: (x: number, top: number, size: number, sx: number, fill?: string) => string }
// band = the rows on the band [from, to). body = the row the details start at. k = how full the design is drawn, 0 = tight
type Opts = { band?: [number, number]; body?: number; rule?: boolean; k?: number }
// a column at a unit: size and sx per row, gap under every row but the last, pre/post = ink over the first / under the last
type Col = { size: number[]; sx: number[]; gap: number[]; pre: number; post: number; pad: number; h: number; w: number; cap: number }

function sum(list: number[]) {
  return list.reduce((a, b) => a + b, 0)
}

function at(p: Pair, k = 1) {
  return p[0] + (p[1] - p[0]) * k
}

function textRow(form: Form, text: string, cls: TextCls): Row {
  const weight = WEIGHT[cls]
  const track = cls === 'head' ? HEAD_TRACK : 0
  const m = setLine(text, form.font, weight, 1, track)
  return {
    w: m.w,
    cap: m.cap,
    seen: /[0-9A-Z]/.test(text) ? Math.max(m.cap, setLine('0', form.font, weight, 1).cap) : m.cap,
    up: m.up,
    down: m.down,
    cls,
    text: true,
    draw: (x, top, s, sx, fill) => `<path d="${linePath(setLine(text, form.font, weight, s, track * s * sx, sx), (gx) => ({ x: x + gx, y: top + m.cap * s, a: 0 }))}"${fill ? ` fill="${fill}"` : ''}/>`,
  }
}

// a label on the right and a blank line to write on, left of it - at the size of the details
function fieldRow(form: Form, field: string): Row {
  const label = field.replace(/:$/, '') + ':'
  const m = setLine(label, form.font, 'bold', 1)
  const fw = m.w + FIELD.gap + FIELD.blank
  return {
    w: fw,
    cap: m.cap,
    seen: m.cap,
    up: m.up,
    down: Math.max(m.down, 0.1),
    cls: 'detail',
    text: true,
    draw: (x, top, s, sx) => {
      const l = setLine(label, form.font, 'bold', s, 0, sx)
      const w = fw * s * sx
      const y = top + m.cap * s
      const text = linePath(l, (gx) => ({ x: x + w / 2 - l.w / 2 + gx, y, a: 0 }))
      return `<path d="${text}"/><path d="M${n(x - w / 2)} ${n(y)}H${n(x - w / 2 + FIELD.blank * s * sx)}" fill="none" stroke="${ink(form)}" stroke-width="${n(Math.max(MIN_STROKE, s * 0.07))}"/>`
    },
  }
}

function iconRow(form: Form): Row {
  return { w: 1, cap: iconInkH(form, 1), seen: 1, up: 0, down: 0, cls: 'icon', text: false, draw: (x, top, s) => iconSvg(form, x, top, s) }
}

// the rows of the stamp in two groups: the head's lines (head, its second name, positions) and the details under them
function rowsOf(form: Form, blocks: Block[], split: boolean) {
  const heads: Row[] = []
  const dets: Row[] = []
  let headRows = 0
  blocks.forEach((b) => {
    const cls = CLS[b.slot]
    const parts = cls === 'head' && split ? splitLine(b.text) || [b.text] : [b.text]
    const rows = parts.map((t) => textRow(form, t, cls)).filter((r) => r.w > 0)
    if (b.slot === 'head' || b.slot === 'status') headRows += rows.length
    // the details start at the first number, contact or free line; what follows stays with them
    if (dets.length || cls === 'detail') dets.push(...rows)
    else heads.push(...rows)
  })
  for (const f of form.fields) dets.push(fieldRow(form, f))
  return { heads, dets, headRows }
}

// a column at the unit u = the seen height of a detail line. a class takes the height of its place in the hierarchy,
// or a smaller one when its longest line does not fit the width W even with narrow letters
function setCol(form: Form, list: Row[], W: number, u: number, o: Opts): Col {
  const last = list.length - 1
  const inBand = (i: number) => !!o.band && i >= o.band[0] && i < o.band[1]
  const wide = list.map((r, i) => r.w + (inBand(i) ? 2 * BAND.side * r.cap : 0))
  const of = (c: Cls) => list.filter((r) => r.cls === c)
  const has = (c: Cls) => of(c).length > 0
  const seen = (c: Cls) => Math.max(...of(c).map((r) => r.seen))
  // the seen height that lets the longest line of the class fit
  const room = (c: Cls) => (has(c) ? (W / (Math.max(...wide.filter((_, i) => list[i].cls === c)) * NARROW)) * seen(c) : Infinity)

  const k = o.k ?? 1
  const head = Math.min(u * at(REL.head, k), room('head'))
  const top = has('head') ? head : Infinity
  const sub = Math.min(u * at(REL.sub, k), room('sub'), top / at(OVER.sub, k))
  const role = Math.min(u * at(REL.role, k), room('role'), top / at(OVER.role, k), has('sub') ? sub : Infinity)
  const detail = Math.min(u, room('detail'), top / at(OVER.detail, k), has('role') ? role : Infinity, has('sub') ? sub : Infinity)
  const font = (v: number, c: Cls) => (has(c) ? v / seen(c) : 0)
  const icon = Math.min((has('head') ? font(head, 'head') : (u * at(REL.head, k)) / 0.6) * at(ICON_ROW, k) * ISIZE[form.iconSize], W)
  const sizes: Record<Cls, number> = { head: font(head, 'head'), sub: font(sub, 'sub'), role: font(role, 'role'), detail: font(detail, 'detail'), icon }

  const size = list.map((r) => sizes[r.cls])
  const sx = list.map((_, i) => Math.min(1, W / (wide[i] * size[i])))
  const pad = o.band ? BAND.pad * list[o.band[0]].cap * size[o.band[0]] : 0
  const gap = list.slice(1).map((r, i) => {
    const mean = Math.sqrt(size[i] * size[i + 1])
    // never less than what keeps a ק from touching a ל under it
    const g = Math.max(mean * LEAD, list[i].down * size[i] + r.up * size[i + 1] + mean * 0.06)
    if (o.band && i + 1 === o.band[0]) return list[i].down * size[i] + mean * LEAD * BAND.gap + pad
    if (o.band && i + 1 === o.band[1]) return pad + mean * LEAD * BAND.gap + r.up * size[i + 1]
    if (i + 1 === o.body) return g * at(o.rule ? RULE.gap : GROUP, k)
    return g
  })
  const pre = o.band && o.band[0] === 0 ? pad : list[0].up * size[0]
  const post = o.band && o.band[1] === list.length ? pad : list[last].down * size[last]
  const h = pre + sum(list.map((r, i) => r.cap * size[i])) + sum(gap) + post
  const w = Math.max(...list.map((_, i) => wide[i] * size[i] * sx[i]))
  return { size, sx, gap, pre, post, pad, h, w, cap: Math.min(...list.map((r, i) => (r.text ? r.cap * size[i] : Infinity))) }
}

// the biggest unit the test passes at
function most(hi: number, ok: (u: number) => boolean) {
  let lo = 0
  for (let i = 0; i < 40; i++) {
    const u = (lo + hi) / 2
    if (ok(u)) lo = u
    else hi = u
  }
  return lo
}

// the gaps of a column open up to take the height it does not reach, up to `part` of what they are
function air(col: Col, H: number, part: number): Col {
  const all = sum(col.gap)
  const add = Math.min(H - col.h, all * part)
  if (add <= 0 || !all) return col
  return { ...col, gap: col.gap.map((g) => g + (add * g) / all), h: col.h + add }
}

// x = the center of the column, W wide. right = the lines end at its right edge
function drawCol(form: Form, list: Row[], col: Col, o: Opts, x: number, cy: number, W: number, right: boolean) {
  const tops: number[] = []
  let y = cy - col.h / 2 + col.pre
  list.forEach((r, i) => {
    tops.push(y)
    y += r.cap * col.size[i] + (col.gap[i] || 0)
  })
  const bottom = (i: number) => tops[i] + list[i].cap * col.size[i]
  let body = ''

  if (o.band) {
    const [a, b] = o.band
    const y0 = tops[a] - col.pad
    const y1 = bottom(b - 1) + col.pad
    body += `<rect x="${n(x - W / 2)}" y="${n(y0)}" width="${n(W)}" height="${n(y1 - y0)}" rx="${n(col.pad * 0.5)}"/>`
  }
  list.forEach((r, i) => {
    const s = col.size[i]
    const lx = right ? x + W / 2 - (r.w * s * col.sx[i]) / 2 : x
    const band = !!o.band && i >= o.band[0] && i < o.band[1]
    body += r.draw(lx, tops[i], s, col.sx[i], band ? '#fff' : undefined)
  })
  if (o.rule && o.body) {
    // in the middle between the ink of the head's last line and the ink of the first detail
    const i = o.body - 1
    const ry = (bottom(i) + list[i].down * col.size[i] + tops[i + 1] - list[i + 1].up * col.size[i + 1]) / 2
    const rw = Math.min(W, col.w + 2 * Math.min(...col.size))
    const sw = Math.max(MIN_STROKE, Math.min(...col.size) * RULE.sw)
    body += `<path d="M${n(x - rw / 2)} ${n(ry)}H${n(x + rw / 2)}" fill="none" stroke="${ink(form)}" stroke-width="${n(sw)}"/>`
  }
  return body
}

// the design drawn full when that keeps the text readable, else as full as it can be and still keep it readable
function tight<T extends { cap: number }>(set: (k: number) => T): T {
  const full = set(1)
  if (full.cap >= MIN_CAP) return full
  return set(most(1, (k) => set(k).cap >= MIN_CAP))
}

type Area = { cx: number; cy: number; W: number; H: number }
type Out = { body: string; cap: number; rows: number }

// the lines one under another, as big as the area lets them be
function stack(form: Form, d: Design, heads: Row[], dets: Row[], headRows: number, a: Area): Out {
  const iconOwn = !!form.icon && (form.iconPos === 'top' || form.iconPos === 'bottom')
  const lead = iconOwn && form.iconPos === 'top' ? 1 : 0
  const list = [...(lead ? [iconRow(form)] : []), ...heads, ...dets, ...(iconOwn && !lead ? [iconRow(form)] : [])]
  // a two part design with no details under the head's lines splits after the first line
  const two = d.head === 'rule'
  const body = heads.length && dets.length ? lead + heads.length : two && heads.length > headRows ? lead + headRows : 0
  const o: Opts = { body, rule: two && body > 0, band: d.head === 'band' ? [lead, lead + headRows] : undefined }

  let { cx, W } = a
  let out = ''
  let bw = 0
  if (d.head === 'bar') {
    bw = Math.max(MIN_STROKE * 3, a.H * BAR.w)
    cx -= (bw + a.H * BAR.gap) / 2
    W -= bw + a.H * BAR.gap
  }
  const full = (k: number) => {
    const ok = { ...o, k }
    return setCol(form, list, W, most(a.H * MAX_UNIT, (u) => setCol(form, list, W, u, ok).h <= a.H), ok)
  }
  const col = air(tight(full), a.H, MAX_AIR)
  if (d.head === 'bar') {
    // the bar stands beside the text, as tall as it
    const x = a.cx + a.W / 2 - bw
    out += `<rect x="${n(x)}" y="${n(a.cy - col.h / 2)}" width="${n(bw)}" height="${n(col.h)}" rx="${n(bw / 3)}"/>`
  }
  out += drawCol(form, list, col, o, cx, a.cy, W, d.align === 'right')
  return { body: out, cap: col.cap, rows: heads.length + dets.length }
}

// the head's lines on the right, the details on the left, a rule between them
function twoCols(form: Form, heads: Row[], dets: Row[], headRows: number, a: Area): Out {
  if (!dets.length) {
    dets = heads.slice(headRows)
    heads = heads.slice(0, headRows)
  }
  const iconOwn = !!form.icon && (form.iconPos === 'top' || form.iconPos === 'bottom')
  const right = iconOwn ? (form.iconPos === 'top' ? [iconRow(form), ...heads] : [...heads, iconRow(form)]) : heads
  const set = (u: number, k: number, grow = 1) => ({ r: setCol(form, right, Infinity, u * grow, { k }), l: setCol(form, dets, Infinity, u, { k }), gap: u * COLS.gap })
  const ok = (u: number, k: number, grow = 1) => {
    const { r, l, gap } = set(u, k, grow)
    return r.h <= a.H && l.h <= a.H && (r.w + l.w) * NARROW + gap <= a.W
  }
  const best = (k: number) => {
    const u = most(a.H * MAX_UNIT, (u) => ok(u, k))
    // a head beside many details grows, to weigh as much as they do
    const grow = Math.max(1, most(COLS.grow, (g) => g < 1 || ok(u, k, g)))
    const s = set(u, k, grow)
    return { u, ...s, cap: Math.min(s.r.cap, s.l.cap) }
  }

  const { u, r, l, gap } = tight(best)
  const sx = Math.min(1, (a.W - gap) / (r.w + l.w))
  const free = a.W - gap - (r.w + l.w) * sx
  const mid = gap + Math.min(free * COLS.air, gap)
  const tall = Math.max(r.h, l.h)
  const left = a.cx - ((r.w + l.w) * sx + mid) / 2

  const col = (c: Col) => air({ ...c, sx: c.sx.map(() => sx) }, tall, 1)
  const rx = left + l.w * sx + mid / 2
  const sw = Math.max(MIN_STROKE, (u / 0.6) * RULE.sw)
  const rule = `<path d="M${n(rx)} ${n(a.cy - tall / 2)}V${n(a.cy + tall / 2)}" fill="none" stroke="${ink(form)}" stroke-width="${n(sw)}"/>`
  return {
    body: drawCol(form, dets, col(l), {}, left + (l.w * sx) / 2, a.cy, l.w * sx, false) + rule + drawCol(form, right, col(r), {}, left + l.w * sx + mid + (r.w * sx) / 2, a.cy, r.w * sx, false),
    cap: Math.min(r.cap, l.cap),
    rows: Math.max(heads.length, dets.length),
  }
}

// the frame and the area inside it the text is set in
function frameOf(form: Form, d: Design, size: StampSize) {
  const w = size.w * U
  const h = size.h * U
  const bs = Math.min(1, Math.max(0.6, Math.min(w, h) / 300)) // a small stamp gets a lighter frame, down to what rubber holds
  const m = 4 * bs
  const lines: [number, number][] = d.frame === 'single' ? [[0, 6]] : d.frame === 'double' ? [[0, 6], [9.5, 1.6]] : []
  let body = ''
  let edge = -m
  for (const [inset, sw] of lines) {
    const i = inset * bs
    const s = Math.max(MIN_STROKE, sw * bs)
    body += `<rect x="${n(m + i)}" y="${n(m + i)}" width="${n(w - 2 * (m + i))}" height="${n(h - 2 * (m + i))}" rx="${n(Math.max(2, 14 * bs - i))}" fill="none" stroke="${ink(form)}" stroke-width="${n(s)}"/>`
    edge = i + s / 2
  }
  // the margins grow with the stamp. a frame is printed, so the text keeps further away from it
  const pad = d.frame === 'none' ? [h * 0.07, h * 0.06] : [h * 0.085, h * 0.065]
  const area: Area = { cx: w / 2, cy: h / 2, W: w - 2 * (m + edge + pad[0]), H: h - 2 * (m + edge + pad[1]) }
  return { body, area }
}

function layOnce(form: Form, blocks: Block[], size: StampSize, d: Design, split: boolean): Laid {
  const { body: frame, area } = frameOf(form, d, size)
  const { heads, dets, headRows } = rowsOf(form, blocks, split)
  const side = !!form.icon && (form.iconPos === 'right' || form.iconPos === 'left')
  let body = frame
  let a = area

  if (!heads.length && !dets.length) {
    // no text: the icon alone is the stamp
    const s = Math.min(a.H, a.W) * 0.8 * ISIZE[form.iconSize]
    return { body: body + (form.icon ? iconSvg(form, a.cx, a.cy - iconInkH(form, s) / 2, s) : ''), cap: Infinity, rows: 0 }
  }

  if (side) {
    const s = Math.min(a.H, a.W * SIDE_ICON * ISIZE[form.iconSize])
    const gap = a.W * 0.04
    const right = form.iconPos === 'right'
    body += iconSvg(form, right ? a.cx + a.W / 2 - s / 2 : a.cx - a.W / 2 + s / 2, a.cy - iconInkH(form, s) / 2, s)
    a = { ...a, cx: a.cx + ((right ? -1 : 1) * (s + gap)) / 2, W: a.W - s - gap }
  }

  const out = d.layout === 'split' ? twoCols(form, heads, dets, headRows, a) : stack(form, d, heads, dets, headRows, a)
  return { body: body + out.body, cap: out.cap, rows: out.rows }
}

function fits(laid: Laid, size: StampSize) {
  return laid.rows <= size.lines && laid.cap >= MIN_CAP - 0.01
}

export const RECT: Shape = {
  looks: Object.entries(DESIGNS).map(([id, d]) => ({ id, label: d.label })),
  lay(form, blocks, size, look) {
    const d = DESIGNS[look] ?? DESIGNS.classic
    const count = blocks.length + form.fields.length
    // a design made of two parts needs two parts: a head alone has nothing to set apart from
    if (count < 2 && (d.head === 'rule' || d.head === 'band' || d.layout === 'split')) return null
    const one = layOnce(form, blocks, size, d, false)
    if (fits(one, size)) return one
    // a head too long for one readable row goes on two, before anything gets smaller than readable
    const head = blocks.find((b) => b.slot === 'head')
    if (!head || !splitLine(head.text)) return one
    const two = layOnce(form, blocks, size, d, true)
    return fits(two, size) ? two : one
  },
}
