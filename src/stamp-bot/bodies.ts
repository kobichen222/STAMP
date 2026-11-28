// the BODIES a stamp is ordered on: ONE list, per kind, of the sizes the bot draws in, small to big - each with how many
// lines the bot sets in it and the catalog products (by slug) whose stamp area is that size.
// the mm of a size are not written here: they come from the catalog at load, so the bot never draws a size the shop
// does not sell. a slug that is missing, has no area or disagrees with its siblings stops the server at load.
// prices and `hidden` change at runtime (admin settings), so bodiesFor reads the products at call time
import { getProduct } from '@/lib/content'
import { designerModelForProduct } from '@/designer/models'
import type { Body } from './card-types'
import type { Kind, StampSize } from './kinds' // type-only: kinds.ts imports this file

// short = the model's name on the card's chips, without "חותמת", "אישית" or "דגם"
type Model = { slug: string; short: string }
type Entry = { lines: number; models: Model[] }

const RECT: Entry[] = [
  {
    lines: 4,
    models: [
      { slug: 'חותמת-פרינט-20', short: 'פרינט 20' },
      { slug: 'חותמת-כיס-20', short: 'כיס 20' },
      { slug: 'חותמת-דגם-עכבר', short: 'עכבר' },
      { slug: 'חותמת-אישית-דגם-סליידר', short: 'סליידר' },
    ],
  },
  {
    lines: 5,
    models: [
      { slug: 'חותמת-פרינט-30', short: 'פרינט 30' },
      { slug: 'חותמת-כיס-30', short: 'כיס 30' },
    ],
  },
  { lines: 6, models: [{ slug: 'חותמת-פרינט-40', short: 'פרינט 40' }] },
  { lines: 7, models: [{ slug: 'חותמת-פרינט-50', short: 'פרינט 50' }] },
  { lines: 10, models: [{ slug: 'חותמת-פרינט-60', short: 'פרינט 60' }] },
]

const LIST: Record<Kind, Entry[]> = {
  rect: RECT,
  // one big word: the first four rect bodies, a line per size
  status: RECT.slice(0, 4).map((e, i) => ({ lines: i + 1, models: e.models })),
  round: [
    { lines: 3, models: [{ slug: 'print-r-530', short: 'PRINT R 530' }] },
    {
      lines: 5,
      models: [
        { slug: 'print-r-540', short: 'PRINT R 540' },
        { slug: 'חותמת-כיס-עגולה-קוטר-עד-40-ממ', short: 'כיס עגולה' },
      ],
    },
    { lines: 7, models: [{ slug: 'print-r-550', short: 'PRINT R 550' }] },
  ],
  square: [
    { lines: 4, models: [{ slug: 'print-q-530', short: 'PRINT Q 530' }] },
    { lines: 6, models: [{ slug: 'print-q-540', short: 'PRINT Q 540' }] },
  ],
}

// the w x h every slug of an entry has in the catalog - they must all agree
function sizeOf(e: Entry): StampSize {
  let wh: { w: number; h: number } | null = null
  for (const { slug } of e.models) {
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
  (Object.keys(LIST) as Kind[]).map((k) => [k, LIST[k].map((e) => ({ size: sizeOf(e), models: e.models }))]),
) as Record<Kind, { size: StampSize; models: Model[] }[]>

// the sizes of every kind, small to big - KINDS takes them from here
export const KIND_SIZES = Object.fromEntries((Object.keys(TABLE) as Kind[]).map((k) => [k, TABLE[k].map((t) => t.size)])) as Record<Kind, StampSize[]>

// the products a stamp of this kind and size can be ordered on now: visible, with a price, cheapest first
export function bodiesFor(kind: string, size: string): Body[] {
  if (!Object.hasOwn(TABLE, kind)) return []
  const row = TABLE[kind as Kind].find((t) => `${t.size.w}x${t.size.h}` === size)
  if (!row) return []
  const out: Body[] = []
  for (const { slug, short } of row.models) {
    const p = getProduct(slug)
    if (!p || p.hidden || typeof p.price !== 'number' || !(p.price > 0)) continue
    out.push({ slug: p.slug, title: p.title, short, price: p.price })
  }
  return out.sort((a, b) => a.price - b.price) // stable: equal prices keep the list's order
}
