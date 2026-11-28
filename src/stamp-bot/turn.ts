// NOT a 'use server' file on purpose - server-internal, shared by api.ts and the evals.
// one turn in three stations. 1 extract: the model writes down the lines of the stamp in the customer's words and the
// look keys asked for. 2 place: the model puts those lines into ONE closed template, or says "none". code checks after
// each station that no word was invented and what did not get onto the stamp (check.ts).
// a stamp that is not one of the templates is refused: the form stays exactly as it was, and the miss is logged.
// a stamp whose template is clear is made, and the customer is told exactly which words were left out
import { fromCustomer, hasSign, placed, sameLines, sourceLines, tokens } from './check'
import { asks, badIds, cleanForm, getTemplate, LIMITS, lockedLook, templatesFor, type Form, type IconPos, type Ink, type Kind, type Msg } from './form'
import { isIcon } from './icons'
import { INKS, KINDS, KIND_NAMES, sizeName } from './kinds'
import { extractRequest, HISTORY, LOOK_KEYS, placeRequest, type Extracted, type Placed, type Said } from './prompt'

export type Outcome = 'ok' | 'look' | 'chat' | 'none' | 'unread'
// ok = content placed in a template (maybe with a look change). look = only the look changed. chat = nothing changed, Extracted.say is the answer
export type Turned = { say: string; form: Form | null; prev: Form | null; outcome: Outcome; text: string[]; left: string[]; why: string }
// text = the clean text of station 1 ([] when none). left = the words of the text that did not get onto the stamp.
// why = for the log and the evals: which check failed and on which words
export type Miss = { at: string; outcome: Outcome; message: string; text: string[]; tmpl: string; why: string }
export type Stations = { extract: (req: string) => Promise<string>; place: (req: string) => Promise<string>; log?: (m: Miss) => void }

const MAX_REPLY = 12000
const MAX_FORM = 8000
export const MAX_TEXT = 4000 // one customer message; split.ts cuts its input to the same length
const MAX_LINES = 12
const MAX_LINE = 200
const MAX_SAY = 600

// what the customer is told. composed by code, the same words every time - only a 'chat' answer is the model's
const SAY = {
  none: 'אין לנו עדיין תבנית לסוג החותמת הזה, ולכן לא הכנתי אותה. הבקשה נרשמה אצלנו.',
  unread: 'לא הצלחתי להבין מה צריך להיות כתוב על החותמת. אפשר לכתוב שוב רק את מה שמופיע עליה?',
  change: 'עדכנתי את החותמת.',
  look: 'עדכנתי את המראה.',
}
const made = (label: string) => `הכנתי חותמת בתבנית "${label}".`
const leftOut = (words: string[]) => `לא נכנס לחותמת: ${words.join(', ')}.`
// a number the customer confirmed although its check digit fails: the change is in `confirmed`, not on the stamp
const kept = (d: string) => `המספר ${d} נשאר כמו שהוא.`

// ---- reading the replies: everything in them is untrusted ----

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

// the one json object of a reply - tolerates code fences and text around it. null = no object in it
export function parseObj(raw: string): Record<string, unknown> | null {
  const s = String(raw ?? '')
    .replace(/```\w*/g, '')
    .trim()
    .slice(0, MAX_REPLY)
  const a = s.indexOf('{')
  const z = s.lastIndexOf('}')
  if (a < 0 || z < a) return null
  try {
    return obj(JSON.parse(s.slice(a, z + 1)))
  } catch {
    return null
  }
}

function line(v: unknown) {
  return typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, MAX_LINE) : ''
}

// a list of lines; a single string is taken as lines split at newlines. not a list = null
function lines(v: unknown, max: number): string[] | null {
  const list = typeof v === 'string' ? v.split('\n') : v
  return Array.isArray(list) ? list.map(line).filter(Boolean).slice(0, max) : null
}

function readExtracted(o: Record<string, unknown> | null): Extracted | null {
  if (!o) return null
  const rl = obj(o.look) ?? {}
  // the values are checked against the form when they are laid on it (withLook)
  const look: Record<string, string> = {}
  for (const k of LOOK_KEYS) if (typeof rl[k] === 'string') look[k] = (rl[k] as string).trim()
  return {
    text: lines(o.text, MAX_LINES),
    fields: lines(o.fields, LIMITS.fields),
    look: look as Extracted['look'],
    exact: o.exact === true,
    confirm: o.confirm === true,
    say: typeof o.say === 'string' ? o.say.trim().slice(0, MAX_SAY) : '',
  }
}

function readPlaced(o: Record<string, unknown> | null): Placed | null {
  if (!o) return null
  const slots: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj(o.slots) ?? {})) if (line(v)) slots[k] = line(v)
  const t = obj(o.tail) ?? {}
  // more phones than the form holds are passed on: cleanForm cuts them, and check B sees the one that is gone
  return { tmpl: line(o.tmpl), slots, tail: { address: line(t.address), phones: lines(t.phones, 6) ?? [], email: line(t.email), web: line(t.web) } }
}

// ---- the form ----

// a form from the browser or from the history: untrusted json -> a clean form, or null
export function readForm(json: unknown): Form | null {
  if (typeof json !== 'string' || !json || json.length > MAX_FORM) return null
  try {
    return cleanForm(JSON.parse(json))
  } catch {
    return null
  }
}

// the fixed question about a number whose check digit fails - asked by code, the same words every time
export function badQuestion(form: Form | null) {
  return form ? badIds(form).map((x) => `המספר ${x} לא עובר את בדיקת ספרת הביקורת — הוא נכון?`).join(' ') : ''
}

function sameTokens(a: string[], b: string[]) {
  return tokens(a.join(' ')).join(' ') === tokens(b.join(' ')).join(' ')
}

function lookOf(form: Form | null) {
  return form ? Object.fromEntries(LOOK_KEYS.map((k) => [k, form[k]])) : {}
}

// the look keys station 1 asked for, laid over the form. a value the form does not take is dropped, never defaulted;
// cleanForm then enforces what the template locks
function withLook(prev: Form | null, form: Form, look: Extracted['look']): Form {
  const r = look as Record<string, unknown>
  const raw: Form = { ...form }
  const lock = getTemplate(form.tmpl)?.design.kind
  // a kind the old template forced (a status word) is not the new one's choice - the editor's setTmpl rule
  if (prev && prev.tmpl !== form.tmpl && getTemplate(prev.tmpl)?.design.kind && !lock) raw.kind = 'rect'
  if (KIND_NAMES.includes(r.kind as Kind)) raw.kind = r.kind as Kind
  const kind = lock ?? raw.kind
  const def = KINDS[kind]
  if (typeof r.color === 'string' && r.color in INKS) raw.color = r.color as Ink
  if (r.font === 'sans' || r.font === 'serif') raw.font = r.font
  if (r.size === 'auto' || def.sizes.some((s) => sizeName(s) === r.size)) raw.size = r.size as string
  if (typeof r.look === 'string') {
    raw.look = r.look
    raw.frame = '' // a look the customer asked the bot for brings its own frame back
  } else if (prev && kind !== prev.kind) raw.look = '' // a look id belongs to its kind
  // an icon only from the list
  if (r.icon === '' || isIcon(r.icon)) raw.icon = r.icon as string
  if (def.iconPos.includes(r.iconPos as IconPos)) raw.iconPos = r.iconPos as IconPos
  if (r.iconSize === 's' || r.iconSize === 'm' || r.iconSize === 'l') raw.iconSize = r.iconSize
  const out = cleanForm(raw)
  // a kind change carries a color still at the old kind's default over to the new kind's default (today every kind's default is black, so this changes nothing until one differs)
  if (prev && out.kind !== prev.kind && r.color === undefined && out.color === prev.color && prev.color === KINDS[prev.kind].ink && !lockedLook(out).includes('color')) out.color = KINDS[out.kind].ink
  return out
}

// the needed slots still empty (the stamp shows a placeholder for each), and the `ask` slots the customer is asked for
// (a dealer's ע.מ. or ע.פ.: nothing prints in its place)
function needed(form: Form) {
  const need = (getTemplate(form.tmpl)?.slots ?? []).filter((s) => s.need && !form.slots[s.key]).map((s) => s.label)
  const labels = [...new Set([...need, ...asks(form)])]
  return labels.length ? `חסר: ${labels.join(', ')}.` : ''
}

function numbersIn(text: string) {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/\D/g, ''))
    .filter(Boolean)
}

// ---- the turn ----

// the last msg is the customer's new message; its form is the form as the customer sees it now (maybe hand-edited,
// maybe in the editor's "exactly as I wrote it" mode - the same flow applies, its lines are sourceLines(prev)).
// st = the two stations, each sends one request text to the model and returns its raw answer
export async function runTurn(msgs: Msg[], st: Stations): Promise<Turned | { err: string }> {
  const clean = msgs.slice(-60).map((m): Msg => ({ role: m.role === 'ai' ? 'ai' : 'user', text: String(m.text ?? '').slice(0, MAX_TEXT), form: typeof m.form === 'string' ? m.form : undefined }))
  const last = clean.at(-1)
  if (!last || last.role !== 'user' || !last.text.trim()) return { err: 'לא התקבלה הודעה' }
  // the form on the new message; when the browser sent none, the latest one in the conversation
  const prev = readForm(last.form) ?? readForm(clean.findLast((m) => m.form)?.form)
  const history: Said[] = clean.slice(0, -1).slice(-HISTORY).map((m) => ({ role: m.role, text: m.text }))
  const asked = history.findLast((m) => m.role === 'ai')?.text ?? ''

  // STATION 1
  const ex = readExtracted(parseObj(await st.extract(extractRequest(prev, history, last.text))))
  if (!ex) return { err: 'קלוד החזיר תשובה שלא ניתן לקרוא, נסה שוב' }

  const prevText = sourceLines(prev)
  const prevFields = prev?.fields ?? []
  // a text with no word in it is no text: as if the content did not change
  const text = ex.text && tokens(ex.text.join(' ')).length ? ex.text : null
  const fields = ex.fields ?? prevFields
  const said = text ?? []

  // logged: every refusal, and a stamp made with words left out - both are what the templates still lack
  const done = (outcome: Outcome, form: Form | null, say: string, why = '', tmpl = '', left: string[] = []): Turned => {
    if (outcome === 'none' || outcome === 'unread' || left.length) {
      try {
        st.log?.({ at: new Date().toISOString(), outcome, message: last.text, text: said, tmpl, why })
      } catch {} // the log never fails the turn
    }
    return { say: [say, badQuestion(form)].filter(Boolean).join(' '), form, prev, outcome, text: said, left, why }
  }
  // the stamp stays exactly as it was
  const refuse = (outcome: 'none' | 'unread', why: string, tmpl = '') => done(outcome, prev, SAY[outcome], why, tmpl)

  // CHECK A: every word station 1 wrote is the customer's - in their messages or already on the stamp
  const sources = [...history.filter((m) => m.role === 'user').map((m) => m.text), last.text, ...prevText, ...prevFields]
  const a = fromCustomer([...(text ?? []), ...(ex.fields ?? [])], sources)
  if (!a.ok) return refuse('unread', `extract: not the customer's words: ${a.words.join(' ')}`)

  // a first message with nothing to write on the stamp. only hand-fill lines: understood, but no template holds a stamp
  // of fields alone. a question or a greeting gets its answer. anything else (a look alone, or a message station 1
  // found nothing in) gets the unread sentence - there is no stamp to lay a look on yet
  if (!prev && !text) {
    if (ex.fields?.length) return refuse('none', 'fields only, no template')
    return ex.say ? done('chat', null, ex.say) : refuse('unread', 'extract: no lines for a new stamp')
  }

  const changed = (!!text && !sameTokens(text, prevText)) || !sameTokens(fields, prevFields)
  let form = prev
  let label = ''
  let left: string[] = []
  if (changed) {
    const all = text ?? prevText
    // the extra lines were added by hand in the editor: code carries them, station 2 never places them
    const extras = prev?.tail.extra ?? []
    const isExtra = (l: string) => extras.some((x) => sameTokens([x], [l]))
    const carried = extras.filter((x) => all.some((l) => sameTokens([x], [l])))

    // STATION 2
    const p = readPlaced(parseObj(await st.place(placeRequest(all.filter((l) => !isExtra(l)), prev))))
    if (!p) return refuse('none', 'place: the reply cannot be read')
    // the id is checked BEFORE cleanForm, which would turn an unknown one into the first template
    const tpl = templatesFor(null).find((t) => t.id === p.tmpl)
    if (!tpl) return refuse('none', !p.tmpl || p.tmpl === 'none' ? 'place: none' : `place: not a template "${p.tmpl}"`, p.tmpl)
    const next = cleanForm({ ...lookOf(prev), frame: prev?.frame ?? '', confirmed: prev?.confirmed ?? [], tmpl: tpl.id, slots: p.slots, tail: { ...p.tail, extra: carried }, fields })

    // the sign proves a template on the turn it is chosen. a stamp that stays in its template is not asked again: the
    // customer may have picked it in the editor, or its sign sat only in a placeholder line ('שם, עו"ד')
    if (prev?.tmpl !== tpl.id && !hasSign(tpl, all, next)) return refuse('none', `sign: none of the signs of "${tpl.id}"`, tpl.id)
    // CHECK B: a word on the stamp the customer did not write refuses it; a customer's word with no place does not -
    // the template is clear, so the stamp is made without it and the customer is told
    const b = placed([...all, ...fields], next)
    if (b.invented.length) return refuse('none', `place: invented ${b.invented.join(' ')}`, tpl.id)
    if (ex.exact && !sameLines(all, next)) return refuse('none', 'place: exact lines asked, the template prints them otherwise', tpl.id)
    form = next
    label = tpl.label
    left = b.unused
  }
  if (!form) return refuse('unread', 'extract: no lines') // not reached: with no prev a text is always a change

  // LOOK, then CONFIRM: only a number the last message asked about, and only on the customer's yes
  let next = withLook(prev, form, ex.look)
  const add = ex.confirm && prev ? badIds(prev).filter((d) => numbersIn(asked).includes(d) && !next.confirmed.includes(d)) : []
  if (add.length) next = { ...next, confirmed: [...next.confirmed, ...add].slice(-LIMITS.confirmed) }

  const looked = !!prev && (LOOK_KEYS.some((k) => next[k] !== prev[k]) || next.frame !== prev.frame)
  if (!changed && !looked && !add.length) {
    // nothing on the stamp changed: the model's answer, or - when it has none - the customer said nothing usable
    return ex.say ? done('chat', prev, ex.say) : refuse('unread', 'extract: nothing changed and nothing to say')
  }
  const head = changed ? (prev ? SAY.change : made(label)) : looked ? SAY.look : ''
  // the part of the request that cannot be done (an effect that does not exist, an icon not in the list), in the model's words
  const cannot = ex.say.replace(/\s+/g, ' ').trim().slice(0, 200)
  const say = [head, cannot, ...add.map(kept), left.length ? leftOut(left) : '', needed(next)].filter(Boolean).join(' ')
  return done(changed ? 'ok' : 'look', next, say, left.length ? `left out: ${left.join(', ')}` : '', left.length ? next.tmpl : '', left)
}
