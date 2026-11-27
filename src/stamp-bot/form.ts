// TEMPLATES and the stamp FORM.
// a template is a RECORD, not code: the lines of a kind of stamp with their fixed text ('{name}, עו"ד', 'מ.ר. {license}'),
// the slots the customer's details go into, which parts of the common tail it takes, and optionally a locked design.
// templates.json holds the general ones (account null); an account's own templates will be records of the same shape.
// the model only picks a template and fills its slots. code sets the lines: the same form is always the same stamp.
// whatever the model or the browser sends is untrusted - it becomes a Form only through cleanForm
import { INKS, KINDS, KIND_NAMES, sizeName, type Family, type IconPos, type Ink, type Kind } from './kinds'
import { isIcon } from './icons'
import GENERAL from './templates.json'

export type { Family, IconPos, Ink, Kind } from './kinds'
export type IconSize = 's' | 'm' | 'l'

// ---- templates ----

// the class of a line, which is all a shape needs to set it (sizes, which line rides which arc)
export type Slot = 'head' | 'sub' | 'role' | 'org' | 'id' | 'contact' | 'extra' | 'status'
// text: as typed. number: the digits joined (dashes kept when typed). check: a 9 digit number whose Israeli check digit
// is checked. options: a closed choice, the first is the default ("" first = no choice made yet).
// ask: when the slot is empty while its line prints, the customer is asked for it (asks); nothing prints in its place
export type SlotDef = { key: string; label: string; type?: 'text' | 'number'; need?: boolean; check?: boolean; options?: string[]; ask?: boolean }
// parts are joined with a space. a part is left out when a slot in it is empty; the line is left out when all its
// parts with slots are, or when its `req` slot is empty. an empty `need` slot shows its label as a placeholder
export type LineDef = { parts: string[]; slot: Slot; req?: string }
export type TailPart = 'address' | 'phones' | 'email' | 'web' | 'extra' | 'fields'
// what a template fixes about the look. a fixed field is not the customer's choice anymore
export type Design = { kind?: Kind; look?: string; size?: string; color?: Ink; font?: Family; icon?: string; iconPos?: IconPos; iconSize?: IconSize; logo?: string }
// words: phrases, one of which must be in the customer's text. slots: slot keys, one of which must be filled.
// a template is the right one only when at least one of its signs holds. no `signs` = no code check (the model decides)
export type Signs = {
  words?: string[]
  slots?: string[]
  own?: boolean // the template prints the sign itself (עו"ד, ד"ר, ועד הבית), so the customer's sign words need not be printed
}
export type Template = { id: string; label: string; hint: string; account: string | null; slots: SlotDef[]; lines: LineDef[]; tail: TailPart[]; design: Design; signs?: Signs }

export const TAIL_PARTS: TailPart[] = ['address', 'phones', 'email', 'web', 'extra', 'fields']
export const WRITTEN = 'written' // the template id of "exactly as I wrote it"

export const TEMPLATES: Template[] = (GENERAL as Template[]).map(cleanTemplate)

// the templates a user may use: the general ones and their account's own (accounts come later)
export function templatesFor(account: string | null = null) {
  return TEMPLATES.filter((t) => t.account === null || t.account === account)
}

export function getTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id) ?? null
}

// a template record from anywhere (the json, later a database) checked into shape
export function cleanTemplate(raw: Template): Template {
  const keys = new Set(raw.slots.map((s) => s.key))
  for (const l of raw.lines) for (const k of keysOf(l.parts.join(' '))) if (!keys.has(k)) throw new Error(`template ${raw.id}: line uses an unknown slot {${k}}`)
  return { ...raw, account: raw.account ?? null, tail: raw.tail.filter((p) => TAIL_PARTS.includes(p)), design: raw.design ?? {} }
}

function keysOf(text: string) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1])
}

// ---- the form ----

export type Tail = { address: string; phones: string[]; email: string; web: string; extra: string[] }
export type Level = 1 | 2 | 3 // a written line: the main one, a second one, a detail
export type WrittenLine = { text: string; level: Level }

export type Form = {
  tmpl: string // a template id, or WRITTEN
  slots: Record<string, string>
  tail: Tail
  written: WrittenLine[] // the customer's own lines in their own order, when tmpl is WRITTEN
  fields: string[] // a label with a blank line to fill in by hand: תאריך, חתימה
  confirmed: string[] // numbers (digits) the customer confirmed although their check digit fails
  // the look - the customer's choice, unless the template fixes it
  kind: Kind
  color: Ink
  font: Family
  size: string // 'auto' or one of the kind's sizes: '47x18'
  look: string // a look id of the kind (draw/), '' = the default one
  icon: string // '' = none, 'custom' = the outline in path
  iconPos: IconPos
  iconSize: IconSize
  path: string
}

// a line of the finished stamp
export type Block = { slot: Slot; text: string; ph?: boolean } // ph = a placeholder the customer still has to replace

// what goes between the browser, the server and the model
export type Msg = { role: 'user' | 'ai'; text: string; form?: string; svg?: string; secs?: number } // form = the form as JSON: after the turn (ai), as the customer saw it (user)
export type LookShot = { id: string; label: string; svg: string } // svg '' = this look cannot hold this text
export type Shown = {
  svg: string
  size: string // the size it came out in: '38x14'
  look: string // the look it came out in - the asked one, or the default when the asked one cannot hold the text
  warn: string // '' or a sentence for the customer: too much text for the size
  route: 'catalog' | 'written'
  form: string // the clean form as JSON
  looks: LookShot[]
  bad: string[] // digits of numbers whose check digit fails and the customer did not confirm
}
export type TurnResult = { err: true; msg: string } | { err: false; text: string; shown: Shown | null }

export const LIMITS = { text: 60, phones: 2, fields: 3, extra: 3, written: 8, confirmed: 6 }

function str(v: unknown, max = LIMITS.text) {
  if (typeof v !== 'string' && typeof v !== 'number') return ''
  return String(v)
    .replace(/[\u0000-\u001f\u007f֑-ׇ]/g, ' ') // control characters and nikud
    .replace(/[״“”]/g, '"')
    .replace(/[׳‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function strs(v: unknown, max: number) {
  return (Array.isArray(v) ? v : []).map((x) => str(x)).filter(Boolean).slice(0, max)
}

function pick<T extends string>(v: unknown, opts: readonly T[], def: T): T {
  return opts.includes(v as T) ? (v as T) : def
}

function obj(v: unknown) {
  return (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>
}

function safePath(d: string) {
  return /^[MLHVCSQTAZmlhvcsqtaz\d.,\s-]*$/.test(d) ? d : ''
}

// an empty form, and an unknown template, start from the first template of the list
export function emptyForm(tmpl = TEMPLATES[0].id): Form {
  return cleanForm({ tmpl })
}

export function cleanForm(raw: unknown): Form {
  const r = obj(raw)
  const t = getTemplate(str(r.tmpl, 40))
  const tmpl = t ? t.id : r.tmpl === WRITTEN ? WRITTEN : TEMPLATES[0].id
  const tpl = getTemplate(tmpl)

  // the slots of the template and nothing else. a closed choice falls back to its first option
  const rs = obj(r.slots)
  const slots: Record<string, string> = {}
  for (const s of tpl?.slots ?? []) {
    const v = str(rs[s.key], s.type === 'number' ? 24 : LIMITS.text)
    slots[s.key] = s.options ? pick(v, s.options, s.options[0]) : v
  }

  const rt = obj(r.tail)
  const tail: Tail = { address: str(rt.address), phones: strs(rt.phones, LIMITS.phones), email: str(rt.email), web: str(rt.web), extra: strs(rt.extra, LIMITS.extra) }
  const written = (Array.isArray(r.written) ? r.written : [])
    .map((x) => {
      const o = typeof x === 'string' ? { text: x } : obj(x)
      const lv = Number(o.level)
      return { text: str(o.text), level: (lv === 1 || lv === 2 ? lv : 3) as Level }
    })
    .filter((l) => l.text)
    .slice(0, LIMITS.written)

  // the look: the template's fixed design wins over the customer's choice
  const d = tpl?.design ?? {}
  const kind = pick(d.kind ?? r.kind, KIND_NAMES, 'rect')
  const def = KINDS[kind]
  const icon = d.icon ?? (r.icon === 'custom' || isIcon(r.icon) ? (r.icon as string) : '')

  return {
    tmpl,
    slots,
    tail,
    written: tmpl === WRITTEN ? written : [],
    fields: tmpl === WRITTEN || tpl?.tail.includes('fields') ? strs(r.fields, LIMITS.fields) : [],
    confirmed: strs(r.confirmed, LIMITS.confirmed).map(digits).filter(Boolean),
    kind,
    color: pick(d.color ?? r.color, Object.keys(INKS) as Ink[], def.ink),
    font: pick(d.font ?? r.font, ['sans', 'serif'] as const, 'sans'),
    size: pick(d.size ?? r.size, ['auto', ...def.sizes.map(sizeName)], 'auto'),
    look: str(d.look ?? r.look, 20),
    icon,
    iconPos: pick(d.iconPos ?? r.iconPos, def.iconPos, def.iconPos[0]),
    iconSize: pick(d.iconSize ?? r.iconSize, ['s', 'm', 'l'] as const, 'm'),
    // written raw into <path d="..."> (draw/kit.ts): path commands and numbers only, anything else is dropped
    path: icon === 'custom' ? safePath(str(r.path, 4000)) : '',
  }
}

// the fields of the look a template fixes - the editor does not offer them
export function lockedLook(form: Form): (keyof Design)[] {
  return Object.keys(getTemplate(form.tmpl)?.design ?? {}) as (keyof Design)[]
}

// ---- formatting values (never deciding what is written) ----

function digits(s: string) {
  return s.replace(/\D/g, '')
}

// the spelling table of the official prefixes: any spelling -> the standard one (עוסק מורשה -> ע.מ.).
// one the table does not know stays as typed. check.ts uses it to see the customer's spelling of a printed prefix
const PREFIX: [RegExp, string][] = [
  [/^(חפ|חברהפרטית)$/, 'ח.פ.'],
  [/^(עמ|עוסקמורשה)$/, 'ע.מ.'],
  [/^(עפ|עוסקפטור)$/, 'ע.פ.'],
  [/^(ער|עמותה|מסעמותה|מספרעמותה)$/, 'ע.ר.'],
  [/^(תז|תעודתזהות)$/, 'ת.ז.'],
]

export function prefixText(p: string) {
  const l = p.replace(/[^א-תa-zA-Z]/g, '')
  if (!l) return ''
  return PREFIX.find(([re]) => re.test(l))?.[1] ?? p
}

// spaces are dictation and go; dashes stay when the customer wrote them (51-690001-6 is how some companies write it)
export function numberText(n: string) {
  return /-/.test(n) ? n.replace(/\s/g, '') : digits(n)
}

// 0501234567 -> 050-1234567, 035551234 -> 03-5551234. anything else stays as written
export function phoneText(p: string) {
  const d = digits(p)
  if (/^0(5\d|7\d)\d{7}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (/^0[2-9]\d{7}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2)}`
  return p
}

// the Israeli check digit of a 9 digit number (ח.פ., ע.מ., ע.פ., ע.ר., ת.ז.): a typo in dictation breaks it
export function checkDigit(num: string) {
  const d = digits(num)
  if (d.length !== 9) return false
  let s = 0
  for (let i = 0; i < 9; i++) {
    const v = Number(d[i]) * (i % 2 ? 2 : 1)
    s += v > 9 ? v - 9 : v
  }
  return s % 10 === 0
}

const CHECKED_WRITTEN = /(?:ח\.פ\.|ע\.מ\.|ע\.פ\.|ע\.ר\.|ת\.ז\.)\s*(\d[\d-]{7,10}\d)/g

// the numbers to ask the customer about: 9 digits, the check digit fails, not confirmed yet
export function badIds(form: Form) {
  const nums: string[] = []
  const tpl = getTemplate(form.tmpl)
  for (const s of tpl?.slots ?? []) if (s.check && form.slots[s.key]) nums.push(digits(form.slots[s.key]))
  for (const l of form.written) for (const m of l.text.matchAll(CHECKED_WRITTEN)) nums.push(digits(m[1]))
  return [...new Set(nums)].filter((d) => d.length === 9 && !checkDigit(d) && !form.confirmed.includes(d))
}

// ---- the lines ----

// a slot's value as the stamp prints it
export function slotValue(form: Form, s: SlotDef) {
  const v = form.slots[s.key] ?? ''
  if (s.type === 'number') return numberText(v)
  return v
}

// one line of a template filled in, or null when it does not print
function fillLine(form: Form, defs: Map<string, SlotDef>, line: LineDef): Block | null {
  if (line.req && !slotValue(form, defs.get(line.req)!)) return null
  let ph = false
  let keyed = 0
  const parts: string[] = []
  for (const part of line.parts) {
    const keys = keysOf(part)
    let text = part
    let empty = false
    for (const k of keys) {
      const def = defs.get(k)!
      let v = slotValue(form, def)
      if (!v && def.need) {
        v = def.label
        ph = true
      }
      if (!v) empty = true
      text = text.replace(`{${k}}`, v)
    }
    if (keys.length && empty) continue
    if (keys.length) keyed++
    parts.push(text)
  }
  if (line.parts.some((p) => keysOf(p).length) && !keyed) return null
  return { slot: line.slot, text: parts.join(' '), ...(ph ? { ph } : {}) }
}

// the labels of the `ask` slots that are empty while their line prints: the customer is asked for them
export function asks(form: Form): string[] {
  const tpl = getTemplate(form.tmpl)
  if (!tpl) return []
  const defs = new Map(tpl.slots.map((s) => [s.key, s]))
  const out: string[] = []
  for (const line of tpl.lines) {
    if (!fillLine(form, defs, line)) continue
    for (const k of keysOf(line.parts.join(' '))) {
      const def = defs.get(k)!
      if (def.ask && !slotValue(form, def) && !out.includes(def.label)) out.push(def.label)
    }
  }
  return out
}

const LEVEL: Record<Level, Slot> = { 1: 'head', 2: 'role', 3: 'contact' }

// the lines of the stamp, in order: the template's lines with the slots filled in, then the common tail -
// the address, the phones, the email, the website, the extra lines - in the parts the template takes
export function structure(form: Form): Block[] {
  if (form.tmpl === WRITTEN) {
    return form.written.map((l, i) => ({ slot: l.level === 1 && i > 0 ? 'sub' : LEVEL[l.level], text: l.text }))
  }
  const tpl = getTemplate(form.tmpl)
  if (!tpl) return []
  const defs = new Map(tpl.slots.map((s) => [s.key, s]))
  const out: Block[] = []

  for (const line of tpl.lines) {
    const b = fillLine(form, defs, line)
    if (b) out.push(b)
  }

  const t = form.tail
  const take = (p: TailPart) => tpl.tail.includes(p)
  if (take('address') && t.address) out.push({ slot: 'contact', text: t.address })
  // two phones share a line behind a bar - the bar keeps them two runs, so the first stands on the right
  if (take('phones') && t.phones.length) out.push({ slot: 'contact', text: 'טל. ' + t.phones.map(phoneText).join(' | ') })
  if (take('email') && t.email) out.push({ slot: 'contact', text: t.email })
  if (take('web') && t.web) out.push({ slot: 'contact', text: t.web })
  if (take('extra')) for (const x of t.extra) out.push({ slot: 'extra', text: x })
  return out
}
