// what every shape draws with: units, the svg sheet, icons, an ellipse to walk text on, a deterministic line split.
// the shapes (rect.ts, seal.ts, plain.ts) build their own layout on top of this and on glyphs.ts
import { INKS, type StampSize } from '../kinds'
import { ICONS, type Icon } from '../icons'
import type { Block, Form } from '../form'

export const U = 10 // svg units per mm
export const MIN_CAP = 1.5 * U // the height of a letter of a 7pt font - lower than that does not come out readable
export const MIN_STROKE = 1.2

// what a shape exports. index.ts walks the sizes and the looks; the shape only lays one look into one size
export type Laid = { body: string; cap: number; rows: number } // cap = the smallest letter height used, rows = rows of text used (fields included)
export type Shape = {
  looks: { id: string; label: string }[] // the first one is the default
  // the blocks set into a stamp of this size, in this look. null = this look cannot hold this structure at all
  // (not "too small" - that is cap/rows, and index.ts tries a bigger size)
  lay(form: Form, blocks: Block[], size: StampSize, look: string): Laid | null
}

export function n(v: number) {
  return String(+v.toFixed(2))
}

export function esc(s: string) {
  return s.replace(/[<>&"]/g, (ch) => `&#${ch.charCodeAt(0)};`)
}

export function ink(form: Form) {
  return INKS[form.color]
}

// the sheet: real size in mm * U, the ink color on everything, the text in the title for screen readers
export function sheet(form: Form, size: StampSize, title: string, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.w * U} ${size.h * U}" role="img"><title>${esc(title)}</title><g fill="${ink(form)}">${body}</g></svg>`
}

function iconOf(form: Form): Icon | null {
  if (form.icon === 'custom') return form.path ? { label: '', stroke: form.path, sw: 5, y: [2, 98] } : null
  return ICONS[form.icon] ?? null
}

// the height of the ink of the form's icon drawn in a box of side s (0 = no icon)
export function iconInkH(form: Form, s: number) {
  const ic = iconOf(form)
  return ic ? (s * (ic.y[1] - ic.y[0])) / 100 : 0
}

// the form's icon. x = its center, top = where its ink starts, s = the side of its box
export function iconSvg(form: Form, x: number, top: number, s: number) {
  const ic = iconOf(form)
  if (!ic) return ''
  return (
    `<g transform="translate(${n(x - s / 2)} ${n(top - (s * ic.y[0]) / 100)}) scale(${n(s / 100)})">` +
    (ic.fill ? `<path d="${ic.fill}"/>` : '') +
    (ic.stroke ? `<path d="${ic.stroke}" fill="none" stroke="${ink(form)}" stroke-width="${ic.sw}" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
    '</g>'
  )
}

// an ellipse walked by arc length: s = 0 at the top, growing clockwise. nx, ny = the outward normal
export function curve(cx: number, cy: number, a: number, b: number) {
  const N = 720
  const step = (2 * Math.PI) / N
  const len = [0]
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) * step
    len.push(len[i] + Math.hypot(a * Math.cos(t), b * Math.sin(t)) * step)
  }
  const total = len[N]

  function at(s: number) {
    s = ((s % total) + total) % total
    let lo = 0
    let hi = N
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (len[mid] <= s) lo = mid
      else hi = mid
    }
    const t = (lo + (s - len[lo]) / (len[hi] - len[lo])) * step
    const nx = b * Math.sin(t)
    const ny = -a * Math.cos(t)
    const nl = Math.hypot(nx, ny)
    return { x: cx + a * Math.sin(t), y: cy - b * Math.cos(t), nx: nx / nl, ny: ny / nl }
  }

  return { total, at }
}

// words that never start a line of their own: they belong to the word before them
const TAIL = /^(בע"מ|בעמ|ושות'|ושות|\(\d{4}\)|LTD\.?|Ltd\.?|Inc\.?|&)$/

// a line too long for one row, split in two the same way every time: at the space nearest the middle,
// never leaving בע"מ / ושות' / (1998) / LTD at the start of a row and never a word of one letter alone.
// null = it has no place to split
export function splitLine(text: string): [string, string] | null {
  const words = text.split(' ')
  let best: [string, string] | null = null
  let bestD = Infinity
  for (let i = 1; i < words.length; i++) {
    if (TAIL.test(words[i])) continue
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    if (a.replace(/[^\p{L}\p{N}]/gu, '').length < 2 || b.replace(/[^\p{L}\p{N}]/gu, '').length < 2) continue
    const d = Math.abs(a.length - b.length)
    if (d < bestD) {
      best = [a, b]
      bestD = d
    }
  }
  return best
}
