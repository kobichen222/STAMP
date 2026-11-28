// NOT a 'use server' file on purpose: a form -> the Stamp a card on the home page shows. shared by api.ts, order.ts
// and the evals. the bodies are read from the catalog as it is now - the caller applies the admin settings first
import type { Remedy, Stamp } from './card-types'
import { bodiesFor } from './bodies'
import { drawForm, type Drawn } from './draw'
import { rectFramed } from './draw/rect'
import { asks, badIds, cleanForm, getTemplate, LIMITS, lockedLook, slotValue, structure, type Block, type Form } from './form'
import { INK_NAMES, KINDS, sizeName, type Ink } from './kinds'

export const MAX_FORM = 8000 // as turn.ts reads a form from the browser

// a form as JSON from the browser or a stored line (untrusted) -> the raw object, before cleanForm. null = unreadable
export function rawForm(json: unknown): Record<string, unknown> | null {
  if (typeof json !== 'string' || !json || json.length > MAX_FORM) return null
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
}

export function isInk(v: unknown): v is Ink {
  return INK_NAMES.includes(v as Ink)
}

// why this drawing must not be ordered yet: one short sentence for the customer, '' = it may be ordered
export function whyNot(form: Form, d: Drawn): string {
  return blockOf(form, d).why
}

// why this drawing must not be ordered yet, and what the card offers to fix it. why '' = it may be ordered.
// the first that holds wins - a stamp with nothing on it, a detail still missing (a placeholder printed in its place,
// or a choice the bot still asks for), a number to confirm, then a text the drawer could not set readably
export function blockOf(form: Form, d: Drawn): { why: string; remedy?: Remedy } {
  const blocks = structure(form)
  if (!blocks.length && !form.fields.length && !form.icon) return { why: 'כתבו מה יופיע על החותמת.', remedy: { kind: 'other' } }

  // a needed slot left empty prints its label as a placeholder (form.ts fillLine): those labels, and the `ask` ones
  const missing = (blocks.some((b) => b.ph) ? needLabels(form, blocks) : []).concat(asks(form))
  if (missing.length) {
    const items = [...new Set(missing)].join(', ')
    return { why: `השלימו את הפרטים החסרים: ${items}`.replace(/\.?$/, '.'), remedy: { kind: 'missing', items } } // a label may end in a dot (ע.פ.)
  }

  const bad = badIds(form)
  if (bad.length) {
    const why = bad.length > 1 ? `אשרו או תקנו את המספרים ${bad.join(', ')}.` : `אשרו או תקנו את המספר ${bad[0]}.`
    return { why, remedy: { kind: 'confirm', numbers: bad } }
  }

  // ok = false: the text is set under the readable size or in more rows than the size holds, or no look could hold it
  // at all (the drawer's empty fallback)
  if (!d.ok) {
    if (form.size === 'auto') return { why: 'יש יותר מדי טקסט לחותמת הזו: קצרו אותו או הורידו שורה.', remedy: { kind: 'other' } }
    return { why: 'הטקסט צפוף מדי למידה הזו: בחרו מידה גדולה יותר או קצרו אותו.', remedy: { kind: 'dense', bigger: !!biggerSize(form, d) } }
  }
  return { why: '' }
}

// the next size up of the stamp's kind that has a product to order it on now, '' = none (the biggest size, every
// larger one without a visible product, a template that fixes the size, or a form not pinned to a size)
export function biggerSize(form: Form, d: Drawn): string {
  // not drawn in the size it is pinned to = no look of the kind could hold it at all: a larger size draws no better
  if (lockedLook(form).includes('size') || d.size !== form.size) return ''
  const sizes = KINDS[form.kind].sizes.map(sizeName)
  const at = sizes.indexOf(d.size)
  if (at < 0) return ''
  return sizes.slice(at + 1).find((s) => bodiesFor(form.kind, s).length > 0) ?? ''
}

// the labels printed as placeholders: a `need` slot with no value prints its label (form.ts fillLine)
function needLabels(form: Form, blocks: Block[]) {
  const ph = blocks.filter((b) => b.ph).map((b) => b.text)
  const labels = (getTemplate(form.tmpl)?.slots ?? []).filter((s) => s.need && !slotValue(form, s)).map((s) => s.label)
  const shown = labels.filter((l) => ph.some((t) => t.includes(l)))
  return shown.length ? shown : labels
}

// any form (untrusted) -> clean, drawn in one look and one size, with the products it can be ordered on
export function toStamp(raw: unknown): Stamp {
  const form = cleanForm(raw)
  const d = drawForm(form)
  const { why, remedy } = blockOf(form, d)
  const frame = form.kind === 'rect' ? rectFramed(form, d.look) : null
  return { svg: d.svg, form: JSON.stringify(form), kind: form.kind, size: d.size, ink: form.color, frame, bodies: bodiesFor(form.kind, d.size), orderable: !why, why, ...(remedy ? { remedy } : {}) }
}

// the numbers the card asks about, confirmed as they stand ("המספר נכון"), no model call: the same change a turn makes
// when the customer says yes (turn.ts: the digits go into `confirmed`, nothing on the stamp changes). null = unreadable
export function confirmedStamp(form: unknown): Stamp | null {
  const raw = rawForm(form)
  if (!raw) return null
  const f = cleanForm(raw)
  const add = badIds(f).filter((n) => !f.confirmed.includes(n))
  return toStamp({ ...raw, confirmed: [...f.confirmed, ...add].slice(-LIMITS.confirmed) })
}

// the same stamp in the next size up that has a product ("מידה גדולה יותר"), no model call. null = a form that cannot
// be read, or no larger size to go to
export function biggerStamp(form: unknown): Stamp | null {
  const raw = rawForm(form)
  if (!raw) return null
  const f = cleanForm(raw)
  const size = biggerSize(f, drawForm(f))
  return size ? toStamp({ ...raw, size }) : null
}

// the same stamp with or without a single frame, no model call. rect only; null = a form that cannot be read
export function reframed(form: unknown, on: unknown): Stamp | null {
  const raw = rawForm(form)
  if (!raw || typeof on !== 'boolean') return null
  return toStamp({ ...raw, frame: on ? 'single' : 'none' })
}

// a cart line's form (pinned to the size and look it was ordered in, order.ts) opened back as a card, no model call.
// the size and then the look are let loose again ('auto', the default look) when that draws the very same stamp, so a
// correction can grow or reshape it as on a card the bot drew; otherwise it stays pinned. null = unreadable form or ink
export function unpinned(form: unknown, ink: unknown): Stamp | null {
  const raw = rawForm(form)
  if (!raw || !isInk(ink)) return null
  const pinned = cleanForm({ ...raw, color: ink })
  const d = drawForm(pinned)
  for (const loose of [{ size: 'auto', look: '' }, { size: 'auto' }]) {
    const f = cleanForm({ ...pinned, ...loose })
    const l = drawForm(f)
    if (l.size === d.size && l.look === d.look && l.svg === d.svg) return toStamp(f)
  }
  return toStamp(pinned)
}

// the same stamp in another ink, no model call. null = a form that cannot be read or an ink the site does not sell.
// a template that locks the colour keeps it: cleanForm decides, and `ink` says what came out
export function reinked(form: unknown, ink: unknown): Stamp | null {
  const raw = rawForm(form)
  if (!raw || !isInk(ink)) return null
  return toStamp({ ...raw, color: ink })
}
