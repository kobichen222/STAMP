// the SAMPLE imprint of one body as an SVG (the home catalog's image), and a fingerprint of that drawing.
// server only: the engine reads its fonts from disk
import { createHash } from 'node:crypto'
import { bodyById } from './bodies'
import { drawForm } from './draw'
import { U } from './draw/kit'
import { cleanForm } from './form'
import { SAMPLES, SAMPLE_PAD } from './samples'

// the sample of this body id, drawn by the bot's own engine in black, in the kind's default look. null = no such body
export function sampleSvg(id: string): string | null {
  const body = bodyById(id)
  const sample = SAMPLES[id]
  if (!body || !sample) return null
  const form = cleanForm({ ...sample, kind: body.kind, size: `${body.w}x${body.h}`, color: 'black', look: '' })
  const d = drawForm(form)
  // the engine's viewBox is the stamp itself (0.1 mm units); a little air around it keeps an edge frame unclipped.
  // the card sizes the <img> from sampleBox(), which uses the same pad
  const p = SAMPLE_PAD * U
  return d.svg.replace(/viewBox="0 0 ([\d.]+) ([\d.]+)"/, (_m, w: string, h: string) => `viewBox="${-p} ${-p} ${Number(w) + 2 * p} ${Number(h) + 2 * p}"`)
}

const versions = new Map<string, string>()

// a short fingerprint of the drawing itself, for the image's address: the browser keeps the image for a day, so the
// address must change whenever the drawing does (a new sample text, a change in the engine). without it a visitor
// who was here before keeps seeing the old imprint, stretched into the new one's box. drawn once per server process
export function sampleVersion(id: string): string {
  let v = versions.get(id)
  if (v === undefined) {
    v = createHash('sha1').update(sampleSvg(id) ?? '').digest('hex').slice(0, 8)
    versions.set(id, v)
  }
  return v
}
