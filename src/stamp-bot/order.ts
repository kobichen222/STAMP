// A stamp of the bot as a line of the site: the Design envelope that carries the bot's form, and the checks the
// server runs on it. NOT a 'use server' file. the line is the form PINNED to the size and look it was drawn in, so
// every later redraw (the order check, the production files) comes out as the customer saw it
import type { Design, StampModel } from '@/designer/types'
import { designerModelForProduct, formatSize } from '@/designer/models'
import { getProduct } from '@/lib/content'
import type { CartLine, LineAsk } from './card-types'
import { bodiesFor } from './bodies'
import { MAX_FORM, isInk, rawForm, whyNot } from './card'
import { drawForm } from './draw'
import { cleanForm, type Form } from './form'

const MAX_QTY = 500

// '38x14' -> [38, 14]
function dims(size: string): [number, number] | null {
  const m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(size)
  return m ? [Number(m[1]), Number(m[2])] : null
}

function shapeOf(form: Form): Design['shape'] {
  return form.kind === 'round' ? 'round' : 'rect'
}

// the clean form of a bot line, ready to draw: parsed from design.bot.form, colour taken from design.inkColor,
// size and look as pinned when the line was built. throws when the design is not a readable bot line
export function botForm(design: Design): Form {
  const raw = rawForm(design?.bot?.form)
  if (!raw) throw new Error('not a bot line: design.bot.form is missing or unreadable')
  if (!isInk(design.inkColor)) throw new Error(`not a bot line: unknown ink "${String(design.inkColor)}"`)
  return cleanForm({ ...raw, color: design.inkColor })
}

// one card -> the cart line for it, or a short Hebrew sentence saying why it cannot be ordered
export function botLine(ask: LineAsk): CartLine | string {
  const raw = rawForm(ask?.form)
  if (!raw) return 'לא הצלחנו לקרוא את החותמת. נסו ליצור אותה שוב.'
  if (!isInk(ask.ink)) return 'צבע הדיו הזה לא זמין.'
  const form = cleanForm({ ...raw, color: ask.ink })
  if (form.color !== ask.ink) return 'צבע הדיו הזה לא זמין לחותמת הזו.' // a template that locks its colour

  const d = drawForm(form)
  const why = whyNot(form, d)
  if (why) return why

  // pinned: the size and look it came out in. the drawer is deterministic, so the pinned form draws the same stamp
  const pinned = cleanForm({ ...form, size: d.size, look: d.look })
  const p = drawForm(pinned)
  if (p.size !== d.size || p.look !== d.look || p.svg !== d.svg || whyNot(pinned, p)) return 'לא הצלחנו להכין את החותמת להזמנה. נסו שוב.'
  const json = JSON.stringify(pinned)
  if (json.length > MAX_FORM) return 'החותמת ארוכה מדי להזמנה. קצרו את הטקסט.'

  // the body: one of the products of this kind and size, visible and priced now
  const body = bodiesFor(pinned.kind, p.size).find((b) => b.slug === ask.slug)
  const product = body ? getProduct(body.slug) : undefined
  const model = product ? designerModelForProduct(product) : null
  const wh = dims(p.size)
  if (!body || !model || !wh) return 'הדגם הזה לא זמין לחותמת במידה הזו.'
  if (Math.abs(model.width - wh[0]) > 0.01 || Math.abs(model.height - wh[1]) > 0.01 || model.shape !== shapeOf(pinned)) return 'הדגם הזה לא מתאים למידה של החותמת.'

  const q = Math.round(Number(ask.quantity))
  const quantity = Number.isFinite(q) ? Math.min(MAX_QTY, Math.max(1, q)) : 1
  const ink = pinned.color
  const design: Design = {
    version: 1,
    modelId: body.slug,
    shape: shapeOf(pinned),
    width: model.width,
    height: model.height,
    border: { style: 'none', thickness: 0, inset: 0, gap: 0 },
    elements: [],
    inkColor: ink,
    bot: { form: json },
  }
  return {
    productSlug: body.slug,
    productName: body.title,
    modelId: body.slug,
    size: formatSize(model),
    design,
    previewSvg: p.svg,
    ink,
    quantity,
    unitPrice: body.price,
  }
}

// the server's check of a bot line against the product it was ordered on: null = fine, otherwise the Hebrew error
// for the customer (the redraw came out in another size or shape than the product, or the drawing is not orderable)
export function checkBotDesign(design: Design, model: StampModel): string | null {
  let form: Form
  try {
    form = botForm(design)
  } catch {
    return 'לא הצלחנו לקרוא את החותמת שבהזמנה. צרו אותה שוב.'
  }
  const d = drawForm(form)
  const wh = dims(d.size)
  if (!wh || Math.abs(wh[0] - model.width) > 0.01 || Math.abs(wh[1] - model.height) > 0.01) return 'החותמת לא מתאימה למידה של הדגם שנבחר.'
  if (shapeOf(form) !== model.shape) return 'החותמת לא מתאימה לצורה של הדגם שנבחר.'
  return whyNot(form, d) || null
}
