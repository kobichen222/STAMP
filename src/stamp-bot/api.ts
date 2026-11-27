'use server'

import { ensureSettings } from '@/server/settings'
import type { CardResult, CartLine, LineAsk, LinesResult, Stamp } from './card-types'
import { MAX_FORM, reinked, toStamp } from './card'
import { botLine } from './order'
import { SHAPES } from './draw'
import { KIND_NAMES } from './kinds'
import { templatesFor, type Msg } from './form'
import { ask, AskTimeout, warmPool } from './proc'
import { extractSystem, placeSystem, type Looks } from './prompt'
import { split, splitSystem } from './split'
import { runTurn, type Stations } from './turn'

// the three prompts. the looks station 1 may pick are the ones the shapes draw; station 2 places into the general
// templates (accounts come later); split cuts one message into several stamps before the turn
function systems() {
  const looks = Object.fromEntries(KIND_NAMES.map((k) => [k, SHAPES[k].looks.map((l) => ({ id: l.id, label: l.label }))])) as Looks
  return { extract: extractSystem(looks), place: placeSystem(templatesFor(null)), split: splitSystem() }
}

// warmPool drops every pool whose prompt is not passed, so EVERY call site passes all three - or each would kill the others' warm processes
function warmAll(sys: ReturnType<typeof systems>) {
  warmPool(sys.extract, sys.place, sys.split)
}

// the admin's live prices and hidden products, applied to the catalog the bodies are read from.
// when the settings cannot be read the catalog stays as it is - a stamp is never lost for its price list
function settings() {
  return ensureSettings().then(
    () => undefined,
    () => undefined,
  )
}

// called on the first keystroke: the processes of every prompt boot while the customer is still typing
export async function warmStamps() {
  warmAll(systems())
}

// cuts one customer message into the text of each stamp it asks for. always resolves with at least one piece:
// any failure (model, parse, a word lost or invented) returns the whole message as one stamp
export async function splitStamps(text: string): Promise<string[]> {
  try {
    const sys = systems()
    warmAll(sys)
    return await split(text, (req) => ask(sys.split, req))
  } catch {
    return typeof text === 'string' && text.trim() ? [text] : []
  }
}

// one turn of the conversation. the svg is drawn HERE - nothing the model wrote reaches the screen as markup
export async function stampTurn(msgs: Msg[]): Promise<CardResult> {
  if (!Array.isArray(msgs) || !msgs.length) return { err: true, msg: 'לא התקבלה הודעה' }
  const sys = systems()
  warmAll(sys) // drops the pools of a prompt no longer in use
  const ready = settings() // read while the model works
  const st: Stations = { extract: (req) => ask(sys.extract, req), place: (req) => ask(sys.place, req) }

  // round 2 runs only when a process died mid-turn - never after a timeout, the customer already waited
  for (let i = 0; i < 2; i++) {
    let t: Awaited<ReturnType<typeof runTurn>>
    try {
      t = await runTurn(msgs, st)
    } catch (e) {
      if (e instanceof AskTimeout) return { err: true, msg: 'הבוט לא ענה בזמן, נסו שוב' }
      continue
    }
    if ('err' in t) return { err: true, msg: t.err }
    if (!t.form) return { err: false, text: t.say, stamp: null }
    await ready
    return { err: false, text: t.say, stamp: toStamp(t.form) }
  }
  // the claude cli is missing or logged out on this machine - true on any host that is not the owner's computer
  return { err: true, msg: 'הבוט לא זמין כרגע' }
}

// the same stamp in another ink: no model call. null = the form cannot be read or the ink is not one of the site's
export async function inkStamp(form: string, ink: string): Promise<Stamp | null> {
  await settings() // first, so the bodies carry the live prices
  return reinked(form, ink)
}

const MAX_LINES = 50

// "continue to order": every card the customer orders -> its cart line, built here from the form (the browser's svg
// and prices are never taken). all or nothing: one stamp that cannot be ordered stops the order and says which
export async function orderLines(asks: LineAsk[]): Promise<LinesResult> {
  if (!Array.isArray(asks) || !asks.length) return { err: true, msg: 'לא נבחרו חותמות להזמנה' }
  if (asks.length > MAX_LINES) return { err: true, msg: `אפשר להזמין עד ${MAX_LINES} חותמות בבת אחת` }
  await settings() // first, so the lines carry the live prices and hidden products
  const lines: CartLine[] = []
  for (let i = 0; i < asks.length; i++) {
    const a = asks[i]
    const got = a && typeof a === 'object' && typeof a.form === 'string' && a.form.length <= MAX_FORM ? botLine(a) : 'לא הצלחנו לקרוא את החותמת. נסו ליצור אותה שוב.'
    if (typeof got === 'string') return { err: true, msg: `חותמת ${i + 1}: ${got}` }
    lines.push(got)
  }
  return { err: false, lines }
}
