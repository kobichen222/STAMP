'use server'

import { SHAPES, showForm } from './draw'
import { KIND_NAMES } from './kinds'
import { templatesFor, type Msg, type TurnResult } from './form'
import { ask, AskTimeout, warmPool } from './proc'
import { extractSystem, placeSystem, type Looks } from './prompt'
import { runTurn, type Stations } from './turn'

// the two prompts. the looks station 1 may pick are the ones the shapes draw; station 2 places into the general
// templates (accounts come later)
function systems() {
  const looks = Object.fromEntries(KIND_NAMES.map((k) => [k, SHAPES[k].looks.map((l) => ({ id: l.id, label: l.label }))])) as Looks
  return { extract: extractSystem(looks), place: placeSystem(templatesFor(null)) }
}

// called on the first keystroke: the processes of both prompts boot while the customer is still typing
export async function warmStamps() {
  const sys = systems()
  warmPool(sys.extract, sys.place)
}

// one turn of the conversation. the svg is drawn HERE - nothing the model wrote reaches the screen as markup
export async function stampTurn(msgs: Msg[]): Promise<TurnResult> {
  if (!Array.isArray(msgs) || !msgs.length) return { err: true, msg: 'לא התקבלה הודעה' }
  const sys = systems()
  warmPool(sys.extract, sys.place) // drops the pools of a prompt no longer in use
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
    return { err: false, text: t.say, shown: t.form && showForm(t.form) }
  }
  // the claude cli is missing or logged out on this machine - true on any host that is not the owner's computer
  return { err: true, msg: 'הבוט לא זמין כרגע' }
}
