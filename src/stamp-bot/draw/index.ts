// the form to the finished stamp: ONE way in for every shape. it walks the sizes of the kind (the one the customer
// chose, or small to big until the text fits and stays readable) and the looks (the asked one, or the default when
// the asked one cannot hold this structure). the shapes only lay one look into one size
import { KINDS, sizeName, type Kind, type StampSize } from '../kinds'
import { WRITTEN, badIds, cleanForm, structure, type Block, type Form, type Shown } from '../form'
import { MIN_CAP, sheet, type Laid, type Shape } from './kit'
import { RECT } from './rect'
import { ROUND } from './seal'
import { SQUARE, STATUS } from './plain'

export const SHAPES: Record<Kind, Shape> = { rect: RECT, round: ROUND, square: SQUARE, status: STATUS }

export type Drawn = { svg: string; size: string; look: string; warn: string; ok: boolean }

function fits(laid: Laid | null, size: StampSize): laid is Laid {
  return !!laid && laid.rows <= size.lines && laid.cap >= MIN_CAP - 0.01 // a line lifted to exactly MIN_CAP lands a hair under it
}

function title(blocks: Block[], form: Form) {
  return [...blocks.map((b) => b.text), ...form.fields].join(' | ')
}

// one look, the sizes walked. null = the look cannot hold this structure in any size
function inLook(form: Form, blocks: Block[], look: string): Drawn | null {
  const sizes = KINDS[form.kind].sizes
  const chosen = sizes.find((s) => sizeName(s) === form.size)
  let last: { laid: Laid; size: StampSize } | null = null
  for (const size of chosen ? [chosen] : sizes) {
    const laid = SHAPES[form.kind].lay(form, blocks, size, look)
    if (!laid) return null
    last = { laid, size }
    if (fits(laid, size)) return { svg: sheet(form, size, title(blocks, form), laid.body), size: sizeName(size), look, warn: '', ok: true }
  }
  if (!last) return null
  const warn = chosen ? 'הטקסט צפוף מדי למידה הזו. כדאי לבחור מידה גדולה יותר או לקצר' : 'יש יותר מדי טקסט לחותמת מהסוג הזה. כדאי לקצר או להוריד שורה'
  return { svg: sheet(form, last.size, title(blocks, form), last.laid.body), size: sizeName(last.size), look, warn, ok: false }
}

export function drawForm(form: Form): Drawn {
  const shape = SHAPES[form.kind]
  const blocks = structure(form)
  const asked = shape.looks.some((l) => l.id === form.look) ? form.look : shape.looks[0].id
  const order = [asked, ...shape.looks.map((l) => l.id).filter((id) => id !== asked)]
  for (const look of order) {
    const d = inLook(form, blocks, look)
    if (d) return d
  }
  return { svg: sheet(form, KINDS[form.kind].sizes[0], title(blocks, form), ''), size: sizeName(KINDS[form.kind].sizes[0]), look: asked, warn: 'לא הצלחתי לסדר את הטקסט בחותמת מהסוג הזה', ok: false }
}

// what the screen gets: the stamp, every look of its kind drawn with the same text, and the numbers to ask about
export function showForm(raw: unknown): Shown {
  const form = cleanForm(raw)
  const d = drawForm(form)
  const blocks = structure(form)
  const looks = SHAPES[form.kind].looks.map((l) => ({ id: l.id, label: l.label, svg: inLook(form, blocks, l.id)?.svg ?? '' }))
  return { svg: d.svg, size: d.size, look: d.look, warn: d.warn, route: form.tmpl === WRITTEN ? 'written' : 'catalog', form: JSON.stringify(form), looks, bad: badIds(form) }
}
