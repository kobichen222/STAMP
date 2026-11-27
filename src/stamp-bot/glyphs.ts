// NOT a 'use server' file on purpose - server-internal. text becomes glyph OUTLINES from the bundled fonts:
// a <text> element is drawn with whatever font the viewer's machine has, so its width is never known in advance
// and nothing can be fitted to a circle. outlines look identical everywhere and are what a stamp maker needs
import fs from 'fs'
import path from 'path'
import { parse, type Font, type PathCommand } from 'opentype.js'
import type { Family } from './kinds'

export type Weight = 'regular' | 'bold' | 'black'

const FILES = { sans: 'Heebo', serif: 'FrankRuhlLibre' }
const WEIGHTS = { regular: 'Regular', bold: 'Bold', black: 'Black' }
const HEB = /[א-ת]/

// everything in em. y grows DOWN, the baseline is y = 0
type Glyph = { cmds: PathCommand[]; adv: number; top: number; bot: number }
type Face = { font: Font; glyphs: Map<string, Glyph | null>; cap: number; num: number }

// x = the CENTER of the glyph, measured from the center of the line. sx = how narrow the letters are, 1 = as the font drew them
export type Line = { w: number; size: number; sx: number; cap: number; up: number; down: number; glyphs: { g: Glyph; x: number }[] }
// where the baseline point under a glyph's center lies, and the angle the glyph stands at
export type Place = (x: number) => { x: number; y: number; a: number }

const faces = new Map<string, Face>()

function face(family: Family, weight: Weight) {
  const key = `${FILES[family]}-${WEIGHTS[weight]}`
  let f = faces.get(key)
  if (!f) {
    const buf = fs.readFileSync(path.join(process.cwd(), 'src', 'stamp-bot', 'fonts', key + '.ttf'))
    f = { font: parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer), glyphs: new Map(), cap: 0, num: 0 }
    f.cap = glyph(f, 'ה')!.top
    f.num = glyph(f, '1')!.top
    faces.set(key, f)
  }
  return f
}

function glyph(f: Face, ch: string) {
  let g = f.glyphs.get(ch)
  if (g !== undefined) return g

  const raw = f.font.charToGlyph(ch)
  if (raw.index === 0) g = null // the font has no such character
  else {
    const box = raw.getBoundingBox()
    const em = f.font.unitsPerEm
    g = { cmds: raw.getPath(0, 0, 1).commands, adv: (raw.advanceWidth ?? 0) / em, top: Math.max(0, box.y2 / em), bot: Math.max(0, -box.y1 / em) }
  }
  f.glyphs.set(ch, g)
  return g
}

function clean(text: string) {
  return text
    .replace(/[֑-ׇ‎‏‪-‮]/g, '') // nikud and direction marks
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/([א-ת])["“”](?=[א-ת])/g, '$1״') // עו"ד - a real gershayim, not an inch mark
    .replace(/([א-ת])['‘’]/g, '$1׳')
}

const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '<': '>', '>': '<' }
// a number or a latin phrase stays readable left to right, inner separators included: 02-6251234, 050 123 4567, Cohen & Co
const LTR_RUN = /[A-Za-z0-9]+(?:[ .,:/\-'@&+]+[A-Za-z0-9]+)*/g

// logical order -> the order on paper, left to right
function visual(text: string) {
  if (!HEB.test(text)) return [...text]

  const out: string[] = []
  let last = 0
  const rtl = (s: string) => out.unshift(...[...s].reverse().map((ch) => MIRROR[ch] || ch))
  for (const m of text.matchAll(LTR_RUN)) {
    rtl(text.slice(last, m.index))
    out.unshift(...m[0])
    last = m.index + m[0].length
  }
  rtl(text.slice(last))
  return out
}

export function setLine(text: string, family: Family, weight: Weight, size: number, track = 0, sx = 1): Line {
  const f = face(family, weight)
  const glyphs: Line['glyphs'] = []
  let x = 0
  let top = 0
  let bot = 0

  text = clean(text)
  for (const ch of visual(text)) {
    const g = glyph(f, ch) || glyph(face('sans', weight), ch)
    if (!g) continue
    glyphs.push({ g, x: x + (g.adv * size * sx) / 2 })
    x += g.adv * size * sx + track
    top = Math.max(top, g.top)
    bot = Math.max(bot, g.bot)
  }

  const w = Math.max(0, x - track)
  for (const gl of glyphs) gl.x -= w / 2
  const cap = (HEB.test(text) ? f.cap : f.num) * size
  return { w, size, sx, cap, up: Math.max(0, top * size - cap), down: bot * size, glyphs }
}

function num(v: number) {
  return String(+v.toFixed(2))
}

// the whole line as ONE path. every glyph is rotated around its own center, so on a curve each letter stands upright on it
export function linePath(line: Line, place: Place) {
  let d = ''
  for (const { g, x } of line.glyphs) {
    if (!g.cmds.length) continue
    const p = place(x)
    const cos = Math.cos(p.a) * line.size
    const sin = Math.sin(p.a) * line.size
    const half = g.adv / 2
    const pt = (gx: number, gy: number) => num(p.x + (gx - half) * line.sx * cos - gy * sin) + ' ' + num(p.y + (gx - half) * line.sx * sin + gy * cos)

    for (const c of g.cmds) {
      if (c.type === 'Z') d += 'Z'
      else if (c.type === 'Q') d += `Q${pt(c.x1, c.y1)} ${pt(c.x, c.y)}`
      else if (c.type === 'C') d += `C${pt(c.x1, c.y1)} ${pt(c.x2, c.y2)} ${pt(c.x, c.y)}`
      else d += c.type + pt(c.x, c.y)
    }
  }
  return d
}
