// the BODIES a stamp is ordered on: ONE list, per kind, of the sizes the bot draws in, small to big - each with how many
// lines the bot sets in it and the catalog products (by slug) whose stamp area is that size.
// the mm of a size are not written here: they come from the catalog at load, so the bot never draws a size the shop
// does not sell. a slug that is missing, has no area or disagrees with its siblings stops the server at load.
// prices and `hidden` change at runtime (admin settings), so bodiesFor reads the products at call time
import { getProduct } from '@/lib/content'
import { designerModelForProduct } from '@/designer/models'
import type { Body } from './card-types'
import type { Kind, StampSize } from './kinds' // type-only: kinds.ts imports this file

type Entry = { lines: number; slugs: string[] }

const RECT: Entry[] = [
  { lines: 4, slugs: ['חותמת-פרינט-20', 'חותמת-כיס-20', 'חותמת-דגם-עכבר', 'חותמת-אישית-דגם-סליידר'] },
  { lines: 5, slugs: ['חותמת-פרינט-30', 'חותמת-כיס-30'] },
  { lines: 6, slugs: ['חותמת-פרינט-40'] },
  { lines: 7, slugs: ['חותמת-פרינט-50'] },
  { lines: 10, slugs: ['חותמת-פרינט-60'] },
]

const LIST: Record<Kind, Entry[]> = {
  rect: RECT,
  // one big word: the first four rect bodies, a line per size
  status: RECT.slice(0, 4).map((e, i) => ({ lines: i + 1, slugs: e.slugs })),
  round: [
    { lines: 3, slugs: ['print-r-530'] },
    { lines: 5, slugs: ['print-r-540', 'חותמת-כיס-עגולה-קוטר-עד-40-ממ'] },
    { lines: 7, slugs: ['print-r-550'] },
  ],
  square: [
    { lines: 4, slugs: ['print-q-530'] },
    { lines: 6, slugs: ['print-q-540'] },
  ],
}

// the w x h every slug of an entry has in the catalog - they must all agree
function sizeOf(e: Entry): StampSize {
  let wh: { w: number; h: number } | null = null
  for (const slug of e.slugs) {
    const p = getProduct(slug)
    if (!p) throw new Error(`stamp-bot bodies: product "${slug}" is not in the catalog`)
    const m = designerModelForProduct(p)
    if (!m) throw new Error(`stamp-bot bodies: product "${slug}" has no stamp area`)
    if (wh && (wh.w !== m.width || wh.h !== m.height)) throw new Error(`stamp-bot bodies: product "${slug}" is ${m.width}x${m.height}, its siblings are ${wh.w}x${wh.h}`)
    wh = { w: m.width, h: m.height }
  }
  if (!wh) throw new Error('stamp-bot bodies: a size with no products')
  return { ...wh, lines: e.lines }
}

const TABLE = Object.fromEntries(
  (Object.keys(LIST) as Kind[]).map((k) => [k, LIST[k].map((e) => ({ size: sizeOf(e), slugs: e.slugs }))]),
) as Record<Kind, { size: StampSize; slugs: string[] }[]>

// the sizes of every kind, small to big - KINDS takes them from here
export const KIND_SIZES = Object.fromEntries((Object.keys(TABLE) as Kind[]).map((k) => [k, TABLE[k].map((t) => t.size)])) as Record<Kind, StampSize[]>

// the products a stamp of this kind and size can be ordered on now: visible, with a price, cheapest first
export function bodiesFor(kind: string, size: string): Body[] {
  if (!Object.hasOwn(TABLE, kind)) return []
  const row = TABLE[kind as Kind].find((t) => `${t.size.w}x${t.size.h}` === size)
  if (!row) return []
  const out: Body[] = []
  for (const slug of row.slugs) {
    const p = getProduct(slug)
    if (!p || p.hidden || typeof p.price !== 'number' || !(p.price > 0)) continue
    out.push({ slug: p.slug, title: p.title, price: p.price })
  }
  return out.sort((a, b) => a.price - b.price) // stable: equal prices keep the list's order
}
