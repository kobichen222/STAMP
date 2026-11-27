// NOT a 'use server' file on purpose: a form -> the Stamp a card on the home page shows. shared by api.ts and the evals.
// the bodies are read from the catalog as it is now - the caller applies the admin settings (ensureSettings) first
import type { Stamp } from './card-types'
import { bodiesFor } from './bodies'
import { drawForm } from './draw'
import { cleanForm } from './form'
import { INK_NAMES, type Ink } from './kinds'

const MAX_FORM = 8000 // as turn.ts reads a form from the browser

// any form (untrusted) -> clean, drawn in one look and one size, with the products it can be ordered on
export function toStamp(raw: unknown): Stamp {
  const form = cleanForm(raw)
  const d = drawForm(form)
  return { svg: d.svg, form: JSON.stringify(form), kind: form.kind, size: d.size, ink: form.color, bodies: bodiesFor(form.kind, d.size) }
}

// the same stamp in another ink, no model call. null = a form that cannot be read or an ink the site does not sell.
// a template that locks the colour keeps it: cleanForm decides, and `ink` says what came out
export function reinked(form: unknown, ink: unknown): Stamp | null {
  if (typeof form !== 'string' || form.length > MAX_FORM || !INK_NAMES.includes(ink as Ink)) return null
  let raw: unknown
  try {
    raw = JSON.parse(form)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return toStamp({ ...(raw as Record<string, unknown>), color: ink })
}
