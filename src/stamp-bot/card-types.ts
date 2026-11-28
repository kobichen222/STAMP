// What the server hands a stamp card on the home page. Types only, on purpose: the browser imports this file, and
// anything it imported at runtime (the kinds table reads the whole catalog) would ship too. Type imports are erased.
import type { Design } from '@/designer/types'

// one body the customer can order the stamp on: a catalog product whose stamp area is the size the stamp was drawn in
export type Body = { slug: string; title: string; short: string; price: number } // short = the name on the card's chip

export type Stamp = {
  svg: string
  form: string // the clean form as JSON - sent back with the next correction and with an ink change
  kind: string // 'rect' | 'status' | 'round' | 'square'
  size: string // the size it was drawn in, '38x14'
  ink: string // a key of the site's INK_COLORS
  frame: boolean | null // a rect stamp: drawn with a frame or not. null = not the customer's choice (always framed)
  bodies: Body[] // visible products of that size with a price, cheapest first. empty = nothing to order at this size right now
  orderable: boolean // false = this drawing must not be ordered yet (text too crowded, a detail still missing, a number to confirm)
  why: string // when not orderable: one short Hebrew sentence for the customer saying what to fix. '' otherwise
}

// one turn of one stamp's conversation. stamp is null when the bot only answered in words
export type CardResult = { err: true; msg: string } | { err: false; text: string; stamp: Stamp | null }

// "continue to order": what the browser asks for per card, and the cart line the server builds for it.
// the line is built on the server because only it can redraw the form and read the catalog
export type LineAsk = { form: string; slug: string; ink: string; quantity: number }
// the same ask with the id of the card it came from, so a stamp that cannot be ordered is marked on its own card
export type OrderAsk = LineAsk & { id: string }
export type CardMiss = { id: string; msg: string } // msg = why that card's stamp cannot be ordered

export type CartLine = {
  productSlug: string
  productName: string
  modelId: string
  size: string // as the site prints a product's size
  design: Design // the envelope: product size and shape, no elements, no border, inkColor, and bot.form
  previewSvg: string // the bot's drawing, in the chosen ink
  ink: Design['inkColor']
  quantity: number
  unitPrice: number // the product's list price; the cart prices the line through the site's engine
}

// cards: the stamps that did not go through, by card. msg: the line under the summary bar
export type LinesResult = { err: true; msg: string; cards?: CardMiss[] } | { err: false; lines: CartLine[] }
