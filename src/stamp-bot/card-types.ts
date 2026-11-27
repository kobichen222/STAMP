// What the server hands a stamp card on the home page. Types only and no imports, on purpose: the browser
// imports this file, and anything it imported at runtime (the kinds table reads the whole catalog) would ship too.

// one body the customer can order the stamp on: a catalog product whose stamp area is the size the stamp was drawn in
export type Body = { slug: string; title: string; price: number }

export type Stamp = {
  svg: string
  form: string // the clean form as JSON - sent back with the next correction and with an ink change
  kind: string // 'rect' | 'status' | 'round' | 'square'
  size: string // the size it was drawn in, '38x14'
  ink: string // a key of the site's INK_COLORS
  bodies: Body[] // visible products of that size with a price, cheapest first. empty = nothing to order at this size right now
}

// one turn of one stamp's conversation. stamp is null when the bot only answered in words
export type CardResult = { err: true; msg: string } | { err: false; text: string; stamp: Stamp | null }
