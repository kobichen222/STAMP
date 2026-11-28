'use server'

// the production check is the checkout's own. no import cycle: the orders service imports order.ts and production.ts,
// never this file, and nothing under stamp-bot imports the service but this server-action file
import { botProductionError } from '@/server/orders/service'
import type { CardMiss, CartLine, LinesResult, OrderAsk, Stamp } from './card-types'
import { MAX_FORM, biggerStamp, confirmedStamp, reframed, reinked, unpinned } from './card'
import { botLine } from './order'
import { settings, systems, warmAll } from './serve'

// the quick calls of the home box. the two long ones (the split and a turn) are route handlers (app/api/stamp-bot):
// Next runs a page's server actions one after the other, and those must run side by side and be stoppable

// called on the first keystroke: the processes of every prompt boot while the customer is still typing
export async function warmStamps() {
  warmAll(systems())
}

// the same stamp in another ink: no model call. null = the form cannot be read or the ink is not one of the site's
export async function inkStamp(form: string, ink: string): Promise<Stamp | null> {
  await settings() // first, so the bodies carry the live prices
  return reinked(form, ink)
}

// the same stamp with (a single frame) or without a frame: no model call. null = the form cannot be read
export async function frameStamp(form: string, on: boolean): Promise<Stamp | null> {
  await settings()
  return reframed(form, on)
}

// a bot stamp from the cart, opened for editing on the home page: the same drawing, with the size and look the line
// pinned let loose when that draws the same stamp (card.ts unpinned). null = the form or the ink cannot be read
export async function lineStamp(form: string, ink: string): Promise<Stamp | null> {
  await settings()
  return unpinned(form, ink)
}

// the card's "המספר נכון": the numbers it asks about confirmed as they stand, no model call. null = unreadable form
export async function confirmStamp(form: string): Promise<Stamp | null> {
  await settings()
  return confirmedStamp(form)
}

// the card's "מידה גדולה יותר": the same stamp in the next size up that has a product, no model call.
// null = the form cannot be read or there is no larger size
export async function enlargeStamp(form: string): Promise<Stamp | null> {
  await settings()
  return biggerStamp(form)
}

const MAX_LINES = 50
const PRODUCTION_FAILED = 'לא הצלחנו להכין את קובץ הייצור של החותמת הזו. נסו לקצר את הטקסט או לבחור מידה אחרת.'

// one card -> its cart line, or why it cannot be ordered: the line's checks, then the checkout's production check,
// so a stamp whose laser file cannot be built is told on its card here and not after the checkout form
function orderLine(a: OrderAsk): CartLine | string {
  const got = a && typeof a === 'object' && typeof a.form === 'string' && a.form.length <= MAX_FORM ? botLine(a) : 'לא הצלחנו לקרוא את החותמת. נסו ליצור אותה שוב.'
  if (typeof got === 'string') return got
  return botProductionError(got.design, got.productSlug) ? PRODUCTION_FAILED : got
}

// the line under the summary bar when stamps did not go through; the reason itself is shown on each of those cards
function missText(n: number) {
  return n === 1 ? 'חותמת אחת לא עברה להזמנה, התיקון מסומן עליה' : `${n} חותמות לא עברו להזמנה, התיקון מסומן עליהן`
}

// "continue to order": every card the customer orders -> its cart line, built here from the form (the browser's svg
// and prices are never taken). all or nothing: any stamp that cannot be ordered stops the order, and each such
// stamp's reason comes back with the id of its card
export async function orderLines(asks: OrderAsk[]): Promise<LinesResult> {
  if (!Array.isArray(asks) || !asks.length) return { err: true, msg: 'לא נבחרו חותמות להזמנה' }
  if (asks.length > MAX_LINES) return { err: true, msg: `אפשר להזמין עד ${MAX_LINES} חותמות בבת אחת` }
  await settings() // first, so the lines carry the live prices and hidden products
  const lines: CartLine[] = []
  const cards: CardMiss[] = []
  let loose = '' // a stamp sent without its card's id: its reason can only be told under the bar
  for (let i = 0; i < asks.length; i++) {
    const a = asks[i]
    const got = orderLine(a)
    if (typeof got !== 'string') {
      lines.push(got)
      continue
    }
    const id = a && typeof a === 'object' && typeof a.id === 'string' ? a.id.slice(0, 64) : ''
    if (id) cards.push({ id, msg: got })
    else loose ||= `חותמת ${i + 1}: ${got}`
  }
  if (loose) return { err: true, msg: loose, cards }
  if (cards.length) return { err: true, msg: missText(cards.length), cards }
  return { err: false, lines }
}
