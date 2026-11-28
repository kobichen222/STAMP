// NOT a 'use server' file on purpose - server-internal. the two long bot calls (the split and one turn), served by the
// route handlers under app/api/stamp-bot, and the prompts every call site warms. routes and not server actions: Next
// runs one page's server actions one after the other, so three stamps would wait for each other, and a call the
// browser gave up on could not be stopped. `signal` is the request's: when the browser aborts, the CLI call is killed
import { ensureSettings } from '@/server/settings'
import type { CardResult } from './card-types'
import { toStamp } from './card'
import { SHAPES } from './draw'
import { KIND_NAMES } from './kinds'
import { templatesFor, type Msg } from './form'
import { ask, AskTimeout, warmPool } from './proc'
import { extractSystem, placeSystem, type Looks } from './prompt'
import { split, splitSystem } from './split'
import { runTurn, type Stations } from './turn'

// the only two error sentences a card shows
export const TIMED_OUT = 'הבוט לא ענה בזמן'
export const UNAVAILABLE = 'הבוט לא זמין כרגע'

// the three prompts. the looks station 1 may pick are the ones the shapes draw; station 2 places into the general
// templates (accounts come later); split cuts one message into several stamps before the turn
export function systems() {
  const looks = Object.fromEntries(KIND_NAMES.map((k) => [k, SHAPES[k].looks.map((l) => ({ id: l.id, label: l.label }))])) as Looks
  return { extract: extractSystem(looks), place: placeSystem(templatesFor(null)), split: splitSystem() }
}

// warmPool drops every pool whose prompt is not passed, so EVERY call site passes all three - or each would kill the others' warm processes
export function warmAll(sys: ReturnType<typeof systems>) {
  warmPool(sys.extract, sys.place, sys.split)
}

// the admin's live prices and hidden products, applied to the catalog the bodies are read from.
// when the settings cannot be read the catalog stays as it is - a stamp is never lost for its price list
export function settings() {
  return ensureSettings().then(
    () => undefined,
    () => undefined,
  )
}

// cuts one customer message into the text of each stamp it asks for. always resolves with at least one piece:
// any failure (model, parse, a word lost or invented, an abort) returns the whole message as one stamp
export async function splitText(text: unknown, signal?: AbortSignal): Promise<string[]> {
  if (typeof text !== 'string') return []
  try {
    const sys = systems()
    warmAll(sys)
    return await split(text, (req) => ask(sys.split, req, signal))
  } catch {
    return text.trim() ? [text] : []
  }
}

// one turn of the conversation. the svg is drawn HERE - nothing the model wrote reaches the screen as markup.
// an error is one of the two sentences above: the inner reasons (an unreadable reply, no message) stay on the server
export async function stampTurn(msgs: unknown, signal?: AbortSignal): Promise<CardResult> {
  if (!Array.isArray(msgs) || !msgs.length) return { err: true, msg: UNAVAILABLE }
  const sys = systems()
  warmAll(sys) // drops the pools of a prompt no longer in use
  const ready = settings() // read while the model works
  const st: Stations = { extract: (req) => ask(sys.extract, req, signal), place: (req) => ask(sys.place, req, signal) }

  // round 2 runs only when a process died mid-turn - never after a timeout (the customer already waited) or an abort
  for (let i = 0; i < 2; i++) {
    let t: Awaited<ReturnType<typeof runTurn>>
    try {
      t = await runTurn(msgs as Msg[], st)
    } catch (e) {
      if (e instanceof AskTimeout) return { err: true, msg: TIMED_OUT }
      if (signal?.aborted) return { err: true, msg: UNAVAILABLE }
      continue
    }
    if ('err' in t) return { err: true, msg: UNAVAILABLE }
    if (!t.form) return { err: false, text: t.say, stamp: null }
    await ready
    return { err: false, text: t.say, stamp: toStamp(t.form) }
  }
  // the claude cli is missing or logged out on this machine - true on any host that is not the owner's computer
  return { err: true, msg: UNAVAILABLE }
}
