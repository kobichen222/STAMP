// The bot's drawing as production geometry: the SVG the drawer builds -> the RenderResult the site's production
// chain already turns into the laser files (filled paths only, mm). The laser file is built from the same drawing the
// customer saw: the drawer's own SVG is read back, and every stroke becomes the filled outline it paints on screen.
// NOT a 'use server' file - server-internal (the drawer reads its fonts from disk).
import type { Design } from '@/designer/types'
import type { ElementInfo, RenderItem, RenderResult } from '@/designer/render'
import { overflow, type Issue } from '@/designer/validate'
import {
  bboxOf,
  compose,
  ellipsePath,
  ellipseRing,
  type Matrix,
  parseSvgPath,
  type Path,
  pathPoints,
  type Pt,
  polygonPath,
  rectPath,
  rectRing,
  reversePath,
  scale,
  transformPath,
  translate,
} from '@/designer/geometry'
import { drawForm } from './draw'
import { botForm } from './order'

const UNITS_PER_MM = 10 // the drawer's svg units (draw/kit.ts U)
const TOL = 0.01 // mm: how far a flattened curve may stray from the real one

// ------------------------------------------------------------------ reading the drawer's svg

type Node = { tag: string; attrs: Record<string, string>; kids: Node[] }

// the closed set the drawer writes. anything else is refused, never skipped
const ATTRS: Record<string, readonly string[]> = {
  svg: ['xmlns', 'viewBox', 'role'],
  title: [],
  g: ['fill', 'transform'],
  path: ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'fill', 'stroke', 'stroke-width'],
  ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width'],
  circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width'],
}

const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=/>"]+\s*=\s*"[^"]*")*)\s*(\/?)>/y
const ATTR = /([^\s=/>"]+)\s*=\s*"([^"]*)"/g

function parseSvg(svg: string): Node {
  const root: Node = { tag: '#root', attrs: {}, kids: [] }
  const stack: Node[] = [root]
  let i = 0
  while (i < svg.length) {
    const lt = svg.indexOf('<', i)
    const text = svg.slice(i, lt < 0 ? svg.length : lt)
    if (text.trim() && stack[stack.length - 1].tag !== 'title') throw new Error(`bot svg: unexpected text "${text.trim().slice(0, 30)}"`)
    if (lt < 0) break
    TAG.lastIndex = lt
    const m = TAG.exec(svg)
    if (!m) throw new Error(`bot svg: unreadable markup "${svg.slice(lt, lt + 40)}"`)
    i = TAG.lastIndex
    const [, close, tag, rawAttrs, self] = m
    if (!Object.hasOwn(ATTRS, tag)) throw new Error(`bot svg: unknown element <${tag}>`)
    if (close) {
      const top = stack.pop()
      if (!top || top.tag !== tag || rawAttrs.trim() || self) throw new Error(`bot svg: unbalanced </${tag}>`)
      continue
    }
    const attrs: Record<string, string> = {}
    for (const a of rawAttrs.matchAll(ATTR)) {
      if (!ATTRS[tag].includes(a[1])) throw new Error(`bot svg: unknown attribute ${a[1]} on <${tag}>`)
      if (Object.hasOwn(attrs, a[1])) throw new Error(`bot svg: attribute ${a[1]} twice on <${tag}>`)
      attrs[a[1]] = a[2]
    }
    const parent = stack[stack.length - 1]
    if (parent.tag === 'title') throw new Error(`bot svg: <${tag}> inside <title>`)
    const node: Node = { tag, attrs, kids: [] }
    parent.kids.push(node)
    if (!self) stack.push(node)
  }
  if (stack.length !== 1) throw new Error(`bot svg: <${stack[stack.length - 1].tag}> is never closed`)
  if (root.kids.length !== 1 || root.kids[0].tag !== 'svg') throw new Error('bot svg: the document is not one <svg>')
  return root.kids[0]
}

const NUM = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i

function num(node: Node, name: string, def?: number): number {
  const v = node.attrs[name]
  if (v === undefined) {
    if (def === undefined) throw new Error(`bot svg: <${node.tag}> has no ${name}`)
    return def
  }
  if (!NUM.test(v.trim())) throw new Error(`bot svg: ${name}="${v}" on <${node.tag}> is not a number`)
  return Number(v)
}

const WHITE = /^(#fff|#ffffff|white)$/i

// ------------------------------------------------------------------ geometry

const close = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9

// every sub-path of a filled path closed, as SVG fills an open one
function closed(path: Path): Path {
  const out: Path = []
  let open = false
  for (const c of path) {
    if (c.t === 'M' && open) out.push({ t: 'Z' })
    out.push(c)
    open = c.t !== 'Z'
  }
  if (open) out.push({ t: 'Z' })
  return out
}

type Sub = { pts: Pt[]; closed: boolean }

// a path as polylines no further than tol from it
function flatten(path: Path, tol: number): Sub[] {
  const subs: Sub[] = []
  let cur: Sub | null = null
  let at: Pt = [0, 0]
  let start: Pt = [0, 0]
  const open = () => {
    if (!cur) {
      cur = { pts: [start], closed: false }
      subs.push(cur)
    }
    return cur
  }
  for (const c of path) {
    if (c.t === 'M') {
      cur = { pts: [c.p], closed: false }
      subs.push(cur)
      at = start = c.p
    } else if (c.t === 'Z') {
      open().closed = true
      cur = null
      at = start
    } else if (c.t === 'L') {
      open().pts.push(c.p)
      at = c.p
    } else if (c.t === 'C') {
      const s = open()
      const p0 = at
      // the chord of n equal steps strays at most max|B''| / (8 n^2), |B''| <= 6 * the second differences
      const dd = Math.max(
        Math.hypot(p0[0] - 2 * c.c1[0] + c.c2[0], p0[1] - 2 * c.c1[1] + c.c2[1]),
        Math.hypot(c.c1[0] - 2 * c.c2[0] + c.p[0], c.c1[1] - 2 * c.c2[1] + c.p[1]),
      )
      const n = Math.max(1, Math.ceil(Math.sqrt((0.75 * dd) / tol)))
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const u = 1 - t
        s.pts.push([
          u * u * u * p0[0] + 3 * u * u * t * c.c1[0] + 3 * u * t * t * c.c2[0] + t * t * t * c.p[0],
          u * u * u * p0[1] + 3 * u * u * t * c.c1[1] + 3 * u * t * t * c.c2[1] + t * t * t * c.p[1],
        ])
      }
      at = c.p
    }
  }
  for (const s of subs) {
    s.pts = s.pts.filter((p, i) => i === 0 || !close(p, s.pts[i - 1]))
    if (s.closed && s.pts.length > 1 && close(s.pts[0], s.pts[s.pts.length - 1])) s.pts.pop()
  }
  return subs
}

// a straight piece of stroke, butt ends: the rectangle it paints
function bar(a: Pt, b: Pt, half: number): Path {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (len < 1e-12) return []
  const nx = (-(b[1] - a[1]) / len) * half
  const ny = ((b[0] - a[0]) / len) * half
  return polygonPath([
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ])
}

// a stroke with round caps and round joins: one bar per flattened segment and one disc at every vertex, all wound the
// same way (polygonPath and ellipsePath both turn clockwise in y-down), so under nonzero they are their union
function roundStroke(path: Path, width: number): Path {
  const half = width / 2
  const out: Path = []
  for (const s of flatten(path, TOL)) {
    const pts = s.pts
    const n = pts.length
    const segs = s.closed && n > 2 ? n : n - 1
    for (let i = 0; i < segs; i++) out.push(...bar(pts[i], pts[(i + 1) % n], half))
    for (const p of pts) out.push(...ellipsePath(p[0], p[1], half, half))
  }
  return out
}

// the ring a stroke of width sw paints along an ellipse, exactly: the offset curves at +-sw/2. a circle's offsets are
// circles (bezier); an ellipse's are not ellipses, so they are sampled finely enough (tol, in the units given)
function ellipseStroke(cx: number, cy: number, rx: number, ry: number, sw: number, tol: number): Path {
  const h = sw / 2
  if (Math.abs(rx - ry) < 1e-9) return ellipseRing(cx, cy, rx + h, ry + h, sw)
  const R = Math.max(rx, ry) + h
  const N = Math.max(64, Math.ceil((2 * Math.PI) / Math.sqrt((8 * tol) / R)))
  const ring = (d: number) =>
    Array.from({ length: N }, (_, i): Pt => {
      const t = (2 * Math.PI * i) / N
      const nx = ry * Math.cos(t)
      const ny = rx * Math.sin(t)
      const l = Math.hypot(nx, ny)
      return [cx + rx * Math.cos(t) + (nx / l) * d, cy + ry * Math.sin(t) + (ny / l) * d]
    })
  if (h >= Math.min(rx, ry)) return polygonPath(ring(h))
  return [...polygonPath(ring(h)), ...reversePath(polygonPath(ring(-h)))]
}

// the ring a stroke of width sw paints along a rectangle with corner radius rx (default miter joins: a sharp corner
// stays sharp outside). outer corner rx + sw/2, inner max(0, rx - sw/2)
function rectStroke(x: number, y: number, w: number, h: number, rx: number, sw: number): Path {
  const half = sw / 2
  return rectRing(x - half, y - half, w + sw, h + sw, sw, rx > 0 ? rx + half : 0)
}

// ------------------------------------------------------------------ convert

type Paint = { fill: boolean; stroke: number } // stroke = width in the element's own units, 0 = none

/**
 * An SVG string built by src/stamp-bot/draw -> filled paths in mm. Throws on anything it does not know how to convert:
 * nothing of the drawing is ever dropped silently, and white paint is refused.
 */
export function convert(svg: string, shape: Design['shape'] = 'rect'): RenderResult {
  const root = parseSvg(svg)
  if (root.attrs.xmlns !== undefined && root.attrs.xmlns !== 'http://www.w3.org/2000/svg') throw new Error(`bot svg: xmlns="${root.attrs.xmlns}"`)
  const vb = (root.attrs.viewBox ?? '').trim().split(/[\s,]+/)
  if (vb.length !== 4 || !vb.every((v) => NUM.test(v)) || Number(vb[0]) !== 0 || Number(vb[1]) !== 0 || !(Number(vb[2]) > 0) || !(Number(vb[3]) > 0)) {
    throw new Error(`bot svg: viewBox="${root.attrs.viewBox ?? ''}" is not "0 0 w h"`)
  }
  const items: RenderItem[] = []
  const info: Record<string, ElementInfo> = {}
  let count = 0

  const push = (id: string, path: Path) => {
    if (!path.length) return
    const bbox = bboxOf(pathPoints(path))
    items.push({ kind: 'path', id, path, fillRule: 'nonzero', bbox })
    info[id] = { id, bbox }
  }

  // what an element paints. fill = the ink inherited from the group, or the ink itself, or none
  const paintOf = (node: Node, ink: string | null): Paint => {
    const f = node.attrs.fill
    const s = node.attrs.stroke
    for (const [name, v] of [['fill', f], ['stroke', s]] as const) {
      if (v !== undefined && WHITE.test(v.trim())) throw new Error(`bot svg: white paint (${name}="${v}") on <${node.tag}> - a stamp has no white`)
    }
    if (!ink) throw new Error(`bot svg: <${node.tag}> outside the ink group`)
    if (f !== undefined && f !== 'none' && f !== ink) throw new Error(`bot svg: fill="${f}" on <${node.tag}> is not the ink ${ink}`)
    if (s !== undefined && s !== 'none' && s !== ink) throw new Error(`bot svg: stroke="${s}" on <${node.tag}> is not the ink ${ink}`)
    const stroked = s !== undefined && s !== 'none'
    if (!stroked && node.attrs['stroke-width'] !== undefined) throw new Error(`bot svg: stroke-width without a stroke on <${node.tag}>`)
    const stroke = stroked ? num(node, 'stroke-width', 1) : 0
    if (stroked && !(stroke > 0)) throw new Error(`bot svg: stroke-width="${node.attrs['stroke-width']}" on <${node.tag}>`)
    return { fill: f !== 'none', stroke }
  }

  const walk = (node: Node, m: Matrix, k: number, ink: string | null) => {
    for (const el of node.kids) {
      if (el.tag === 'title') {
        if (node !== root) throw new Error('bot svg: <title> not directly under <svg>')
        continue
      }
      if (el.tag === 'svg') throw new Error('bot svg: a nested <svg>')
      if (el.tag === 'g') {
        let gm = m
        let gk = k
        const t = el.attrs.transform
        if (t !== undefined) {
          const tm = /^\s*translate\(\s*([^\s,()]+)[\s,]+([^\s,()]+)\s*\)\s*scale\(\s*([^\s,()]+)\s*\)\s*$/.exec(t)
          if (!tm || !tm.slice(1).every((v) => NUM.test(v)) || !(Number(tm[3]) > 0)) throw new Error(`bot svg: transform="${t}" is not "translate(x y) scale(s)"`)
          gm = compose(m, translate(Number(tm[1]), Number(tm[2])), scale(Number(tm[3])))
          gk = k * Number(tm[3])
        }
        let gi = ink
        const f = el.attrs.fill
        if (f !== undefined) {
          if (WHITE.test(f.trim())) throw new Error(`bot svg: white paint (fill="${f}") on <g>`)
          if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(f)) throw new Error(`bot svg: fill="${f}" on <g> is not an ink`)
          if (ink && f !== ink) throw new Error(`bot svg: a second ink ${f} under ${ink}`)
          gi = f
        }
        walk(el, gm, gk, gi)
        continue
      }
      if (el.kids.length) throw new Error(`bot svg: <${el.tag}> has children`)
      const paint = paintOf(el, ink)
      const id = `bot-${++count}`
      const sw = paint.stroke
      const tolLocal = TOL / k
      if (el.tag === 'path') {
        const d = el.attrs.d
        if (d === undefined) throw new Error('bot svg: <path> has no d')
        const local = parseSvgPath(d)
        if (local.length && local[0].t !== 'M') throw new Error(`bot svg: path data does not start with M "${d.slice(0, 30)}"`)
        if (paint.fill) push(`${id}-fill`, transformPath(closed(local), m))
        if (sw) {
          const cap = el.attrs['stroke-linecap'] ?? 'butt'
          const join = el.attrs['stroke-linejoin'] ?? 'miter'
          if (cap !== 'butt' && cap !== 'round') throw new Error(`bot svg: stroke-linecap="${cap}"`)
          if (join !== 'miter' && join !== 'round') throw new Error(`bot svg: stroke-linejoin="${join}"`)
          const single = local.length === 2 && local[1].t === 'L'
          let out: Path
          if (single && cap === 'butt') {
            const a = local[0] as { p: Pt }
            const b = local[1] as { p: Pt }
            out = transformPath(bar(a.p, b.p, sw / 2), m)
          } else if (cap === 'round' && (join === 'round' || single)) {
            out = roundStroke(transformPath(local, m), sw * k)
          } else {
            throw new Error(`bot svg: a stroked path with ${cap} caps and ${join} joins that is not one straight segment "${d.slice(0, 40)}"`)
          }
          push(`${id}-stroke`, out)
        }
      } else if (el.tag === 'rect') {
        const x = num(el, 'x', 0)
        const y = num(el, 'y', 0)
        const w = num(el, 'width')
        const h = num(el, 'height')
        const rx = num(el, 'rx', 0)
        if (!(w > 0) || !(h > 0)) throw new Error(`bot svg: a <rect> of ${w} x ${h}`)
        if (rx < 0 || rx > Math.min(w, h) / 2 + 1e-9) throw new Error(`bot svg: rx="${rx}" on a <rect> of ${w} x ${h}`)
        if (paint.fill) push(`${id}-fill`, transformPath(rectPath(x, y, w, h, rx), m))
        if (sw) push(`${id}-stroke`, transformPath(rectStroke(x, y, w, h, rx, sw), m))
      } else {
        const cx = num(el, 'cx', 0)
        const cy = num(el, 'cy', 0)
        const rx = el.tag === 'circle' ? num(el, 'r') : num(el, 'rx')
        const ry = el.tag === 'circle' ? rx : num(el, 'ry')
        if (!(rx > 0) || !(ry > 0)) throw new Error(`bot svg: <${el.tag}> with radius ${rx} x ${ry}`)
        if (paint.fill) push(`${id}-fill`, transformPath(ellipsePath(cx, cy, rx, ry), m))
        if (sw) push(`${id}-stroke`, transformPath(ellipseStroke(cx, cy, rx, ry, sw, tolLocal), m))
      }
    }
  }

  walk(root, scale(1 / UNITS_PER_MM), 1 / UNITS_PER_MM, null)
  return { width: Number(vb[2]) / UNITS_PER_MM, height: Number(vb[3]) / UNITS_PER_MM, shape, items, info }
}

// a bot line (a Design with bot.form) -> its production geometry: redraws the form, then convert()
export function renderBot(design: Design): RenderResult {
  const drawn = drawForm(botForm(design))
  if (!drawn.ok) throw new Error(`the bot drawing of this line cannot be ordered: ${drawn.warn}`)
  return convert(drawn.svg, design.shape)
}

/**
 * The preflight of a bot line, in the shape validateDesign returns: not empty, every point inside the artboard (a
 * circle for a round stamp), the size equal to the design's. Line thickness is not checked here: the drawer
 * guarantees every line is thick enough for rubber.
 */
export function botPreflight(render: RenderResult, design: Design): Issue[] {
  const issues: Issue[] = []
  const visible = render.items.filter((i) => i.kind === 'image' || i.path.length)
  if (!visible.length) {
    issues.push({ code: 'empty', severity: 'error', message: 'העיצוב ריק – אין בחותמת שום דבר להדפיס' })
    return issues
  }
  for (const item of visible) {
    if (item.kind !== 'path') continue
    if (overflow(design, pathPoints(item.path), 0) > 0.05) {
      issues.push({ code: 'out-of-bounds', severity: 'error', elementId: item.id, message: 'חלק מהציור חורג מאזור ההדפסה', fix: 'move-inside' })
    }
  }
  if (Math.abs(render.width - design.width) > 0.01 || Math.abs(render.height - design.height) > 0.01) {
    issues.push({ code: 'size-mismatch', severity: 'error', message: 'מידות הקובץ אינן תואמות למוצר' })
  }
  issues.push({ code: 'summary', severity: 'info', message: `חותמת מהבוט · ${design.width}×${design.height} מ"מ · טקסט יומר לקווים` })
  return issues
}
