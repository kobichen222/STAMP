// the bot's two prompts and the text of their requests. a turn is two model calls with code checks after each (turn.ts):
// station 1 "extract" writes down WHAT is on the stamp, in the customer's words, and the look keys asked for;
// station 2 "place" puts those clean lines into ONE closed template (templates.json), or answers "none".
// the model runs with no thinking tokens, so each prompt is short, concrete and leans on its examples
import { sourceLines } from './check'
import { asks, cleanForm, getTemplate, lockedLook, type Form, type Kind, type SlotDef, type Template } from './form'
import { ICONS, ICON_NAMES } from './icons'
import { INK_COLORS } from '@/designer/types'
import { ICON_POS_LABELS, INK_NAMES, KINDS, KIND_NAMES, sizeName } from './kinds'

export type Looks = Record<Kind, { id: string; label: string }[]>
export type Said = { role: 'user' | 'ai'; text: string }

export const HISTORY = 6 // messages before the new one that go with a request

export type Extracted = {
  text: string[] | null // ALL the lines of the stamp after this message, in the customer's words; null = content unchanged
  fields: string[] | null // ALL the hand-fill labels after this message (תאריך, חתימה); null = unchanged
  look: Partial<Pick<Form, 'kind' | 'color' | 'font' | 'size' | 'look' | 'icon' | 'iconPos' | 'iconSize'>>
  exact: boolean // the customer asked for these exact lines in this exact order
  confirm: boolean // the customer confirmed the number the last message asked about
  say: string // only when nothing on the stamp changes: an answer to a question, or why a look is impossible
}
export type Placed = { tmpl: string; slots: Record<string, string>; tail: { address: string; phones: string[]; email: string; web: string } }

// the keys of the look station 1 may ask to change
export const LOOK_KEYS = ['kind', 'color', 'font', 'size', 'look', 'icon', 'iconPos', 'iconSize'] as const

function indent(rows: string[]) {
  return rows.map((r) => `  ${r}`).join('\n')
}

function bullets(rows: string[], none: string) {
  return rows.length ? rows.map((r) => `- ${r}`).join('\n') : none
}

// ---- station 1: extract ----

// the needed slots still empty (the stamp shows a placeholder for each), and the `ask` slots the customer was asked for
function missing(form: Form) {
  const need = (getTemplate(form.tmpl)?.slots ?? []).filter((s) => s.need && !form.slots[s.key]).map((s) => s.label)
  return [...new Set([...need, ...asks(form)])]
}

function lookText(form: Form) {
  const look = Object.fromEntries(LOOK_KEYS.map((k) => [k, form[k]]))
  const fixed = lockedLook(form).filter((k) => (LOOK_KEYS as readonly string[]).includes(k))
  return JSON.stringify(look) + (fixed.length ? `\nfixed by this kind of stamp, cannot change: ${fixed.join(', ')}` : '')
}

// the lines on the stamp now, its fields and its look, the last messages, the new message.
// every request goes to a fresh process, so it carries all the model needs
export function extractRequest(prev: Form | null, history: Said[], message: string): string {
  const convo = history.slice(-HISTORY).map((m) => `${m.role === 'ai' ? 'you' : 'customer'}: ${m.text}`)
  const lines = prev ? bullets(sourceLines(prev), '(no lines yet)') : 'none - a new stamp'
  return [
    `<stamp>\n${lines}\n</stamp>`,
    ...(prev && missing(prev).length ? [`<missing>\n${bullets(missing(prev), '')}\n</missing>`] : []),
    `<fields>\n${bullets(prev?.fields ?? [], 'none')}\n</fields>`,
    `<look>\n${prev ? lookText(prev) : 'a new stamp: the defaults'}\n</look>`,
    `<conversation>\n${convo.length ? convo.join('\n') : 'none'}\n</conversation>`,
    `<message>\n${message}\n</message>`,
  ].join('\n')
}

// a few-shot example: the request is built through cleanForm and extractRequest, so it never drifts from the code
function extractExample(prev: Record<string, unknown> | null, history: Said[], message: string, reply: (lines: string[]) => Partial<Extracted>) {
  const form = prev && cleanForm(prev)
  const full: Extracted = { text: null, fields: null, look: {}, exact: false, confirm: false, say: '', ...reply(form ? sourceLines(form) : []) }
  return `Request:\n${extractRequest(form, history, message)}\nReply:\n${JSON.stringify(full)}`
}

// invented names and numbers
const SHTERN = { tmpl: 'lawyer', slots: { name: 'אבי שטרן', license: '51207' }, tail: { address: 'ויצמן 8 רחובות' } }
const SPICES = { tmpl: 'company', slots: { name: 'תבלינים הכרמל', signer: 'שמוליק', number: '5153 826 47' } }
const DEALER = { tmpl: 'dealer', slots: { name: 'גיל אמסלם עיצוב גרפי', number: '300987652' } }
const NACHSHON = { tmpl: 'company', slots: { name: 'נחשון ייבוא בע"מ', number: '513377120' } }
const GOLAN = { tmpl: 'licensed', slots: { name: 'רינה גולן', profession: 'אדריכלית' }, tail: { phones: ['054-1112233'] } }

function extractExamples() {
  return [
    extractExample(null, [], "שמוליק, תבלינים הכרמל, ח'פ 5153 826 47", () => ({ text: ['שמוליק', 'תבלינים הכרמל', "ח'פ 5153 826 47"] })),
    extractExample(null, [], 'היי, שלום לך! צריך חותמת לעובדת שלנו בבקשה: אורית נחום, רכזת רכש, שקד מערכות בע"מ. תודה!', () => ({ text: ['אורית נחום', 'רכזת רכש', 'שקד מערכות בע"מ'] })),
    extractExample(null, [], 'תעשה לי חותמת עורך דין מלבנית', () => ({ text: ['עורך דין'], look: { kind: 'rect' } })),
    extractExample(null, [], 'חותמת לד"ר אסנת פרי רופאת עור מ.ר. 3 4 5 6 7 מ.ר.מ 8812', () => ({ text: ['ד"ר אסנת פרי רופאת עור', 'מ.ר. 3 4 5 6 7', 'מ.ר.מ 8812'] })),
    extractExample(null, [], 'אני צריך חותמת לעסק שלי, גיל אמסלם עיצוב גרפי, מספר 300987652', () => ({ text: ['גיל אמסלם עיצוב גרפי', 'מספר 300987652'] })),
    extractExample(null, [], 'חותמת למרכז הקהילתי נווה גן, ע.ר. 580 412 337', () => ({ text: ['מרכז הקהילתי נווה גן', 'ע.ר. 580 412 337'] })),
    extractExample(
      DEALER,
      [{ role: 'user', text: 'אני צריך חותמת לעסק שלי, גיל אמסלם עיצוב גרפי, מספר 300987652' }],
      'עוסק פטור',
      (lines) => ({ text: [...lines, 'עוסק פטור'] }),
    ),
    extractExample(null, [], 'חותמת "נתקבל" עם מקום לתאריך', () => ({ text: ['נתקבל'], fields: ['תאריך'] })),
    extractExample(null, [], 'תכתוב בדיוק ככה, שורה שורה:\nמשרד אדריכלות\nרינה גולן\nאדריכלית\n054-1112233', () => ({ text: ['משרד אדריכלות', 'רינה גולן', 'אדריכלית', '054-1112233'], exact: true })),
    extractExample(
      SHTERN,
      [
        { role: 'user', text: 'חותמת מלבנית לעו"ד אבי שטרן, מ.ר. 51207, ויצמן 8 רחובות' },
        { role: 'ai', text: 'הכנתי חותמת בתבנית "עורך דין".' },
      ],
      'כן תוסיף טלפון 052 765 4321, ובירוק',
      (lines) => ({ text: [...lines, 'טלפון 052 765 4321'], look: { color: 'green' } }),
    ),
    extractExample(SPICES, [], 'תוסיף מתחת לשם את השורה "יבוא ושיווק"', (lines) => ({ text: [lines[0], 'יבוא ושיווק', ...lines.slice(1)] })),
    extractExample(GOLAN, [], 'תוריד את הטלפון', (lines) => ({ text: lines.slice(0, 2) })),
    extractExample({ tmpl: 'lawyer' }, [{ role: 'user', text: 'תעשה לי חותמת עורך דין' }], 'השם הוא נתן ברק', () => ({ text: ['נתן ברק'] })),
    extractExample(GOLAN, [], 'תעשה את זה אדום', () => ({ look: { color: 'red' } })),
    extractExample(null, [], 'חותמת "בוטל" אדומה שתיראה ישנה ושחוקה', () => ({ text: ['בוטל'], look: { color: 'red' }, say: 'אי אפשר לתת לחותמת מראה ישן או שחוק. אפשר לבחור עיצוב אחר, גופן או מידה.' })),
    extractExample(SPICES, [], 'תסובב את השם ב-90 מעלות', () => ({ say: 'אי אפשר לסובב שורה אחת. אפשר לבחור עיצוב אחר לחותמת, גופן אחר או מידה אחרת.' })),
    extractExample({ tmpl: 'status', slots: { word: 'שולם' } }, [], 'תעשה אותה עגולה', () => ({ say: 'לחותמת מצב יש צורה קבועה, ולכן אי אפשר לעשות אותה עגולה. אפשר לשנות את הצבע, הגופן או המידה.' })),
    extractExample(
      NACHSHON,
      [{ role: 'ai', text: 'הכנתי חותמת בתבנית "חברה". המספר 513377120 לא עובר את בדיקת ספרת הביקורת — הוא נכון?' }],
      'כן זה המספר',
      () => ({ confirm: true }),
    ),
    extractExample(GOLAN, [], 'מעולה, תודה רבה!', () => ({ say: 'בשמחה! אפשר להמשיך לשנות את החותמת כאן או בשדות העריכה.' })),
  ]
}

export function extractSystem(looks: Looks): string {
  const sizes = indent(KIND_NAMES.map((k) => `${k}: ${KINDS[k].sizes.map(sizeName).join(', ')}`))
  const iconPos = indent(KIND_NAMES.map((k) => `${k}: ${KINDS[k].iconPos.map((p) => `${p} (${ICON_POS_LABELS[p]})`).join(', ')} - the first is the default`))
  const lookRows = KIND_NAMES.filter((k) => looks[k]?.length).map((k) => `${k}: ${looks[k].map((l) => `${l.id} (${l.label})`).join(', ')}`)
  const lookList = lookRows.length ? `one of the looks of the kind, by id:\n${indent(lookRows)}\n  "" = the default look of the kind` : 'no list of looks today - never set it'
  const icons = ICON_NAMES.map((n) => `${n} (${ICONS[n].label})`).join(', ')

  return `You read one message of a customer of a rubber stamp shop (חותמות). The customer writes in Hebrew.
You do NOT design the stamp and you do NOT decide what kind of stamp it is. You write down what is written ON the stamp, in the customer's own words, and which parts of its look the customer asked to change. The shop's software does everything else.

# The request
- <stamp>: the lines on the stamp now, top to bottom. "none" = a new stamp.
- <missing>: details the stamp still lacks, that the customer was asked for.
- <fields>: the blank lines to fill in by hand that the stamp has now.
- <look>: the look now, and what of it this kind of stamp fixes.
- <conversation>: the last messages, for context only.
- <message>: the customer's new message. This is what you read.

# Reply format
One JSON object and nothing else - no text before or after it, no markdown fences:
{"text": [...], "fields": [...], "look": {...}, "exact": false, "confirm": false, "say": ""}
- "text": ALL the lines of the stamp after this message, or null when the message does not change what is written.
  On a change: the lines of <stamp> with the change applied. Every line that did not change is copied exactly as it is in <stamp>. A new line goes where the customer says ("מתחת לשם", "מעל הכל"), else at the end. A line the customer removes is left out. A detail from <missing> that the customer gives is a new line.
- "fields": ALL the labels of the hand-fill lines after this message, or null when they do not change.
- "look": only the keys the customer asked to change, {} when none.
- "exact": true only when the customer gives the lines themselves and wants them so ("בדיוק ככה", "שורה שורה", "כמו שכתבתי", the pasted lines of an old stamp). Then every one of those lines is text, as written.
- "confirm": true when your last message (the last "you:") asked whether a number is correct and the customer says it is.
- "say": short Hebrew, in two cases only:
  - nothing on the stamp changes: one or two sentences - the answer to the customer's question, or why what they asked is not possible;
  - the stamp changes but PART of the request cannot be done (an effect from "What you cannot do", an icon that is not in the list): one short sentence - what is not possible and what is possible instead.
  In every other case where the stamp changes (text, fields or look), "say" is "". When you offer looks, name only the looks listed below, by their Hebrew labels.

# What is written on the stamp
- Content is what goes ON the stamp: names, a profession or a position, the words that say what the stamp is (עורך דין, רואה חשבון, ועד בית, בע"מ, שולם), numbers with their labels, an address, phones, an email, a website.
- Chat is never on the stamp: greetings, thanks, explanations, why or when they need it ("היי", "תודה רבה", "פתחתי משרד חדש", "אם אפשר עד מחר"), words about the order itself ("חותמת", "חותמת ל", "אני צריך", "תעשה לי", "השם שלי", "שם החברה:", "החותם:"), and words that only say who the stamp is for ("לעסק שלי", "לחברה", "לעובדת").
- COPY every word exactly as the customer typed it, letter for letter: no letter added or changed, no typo fixed, no word translated or reworded, no word added - not even one such a stamp usually has. Marks stay as typed: ח'פ, ע"מ, עו"ד, מ.ר.
- The only cut allowed: the first word of a detail may lose a letter that ties it to the chat and is not part of it ("חותמת לד"ר אסנת פרי" gives 'ד"ר אסנת פרי'). Never add one: "למרכז הקהילתי" gives "מרכז הקהילתי", never "המרכז הקהילתי".
- A number is copied with its digit groups exactly as typed, with its label: "ח'פ 5153 826 47" stays "ח'פ 5153 826 47". Never join, split or fix digits - the software does that.
- A title or a label the customer wrote stays with its detail, as written: 'עו"ד אבי שטרן', "מ.ר. 51207", "טל 03-6234567", "ח.פ. 515382647", "מספר 300987652".
- The lines are the customer's OWN separation - never add one. A new line starts only where the customer separated: a line break, a comma, a semicolon, a bar or a slash used as a separator, or a label that opens a new detail (טל, מ.ר., מ.ר.מ., ח.פ., ע.מ., כתובת, "שם:"). Words the customer wrote together with no separator stay together on one line, even when they look like a name followed by a profession or a number: "עורך דין משה יבגי זקן 335485" is one line. Which detail is which is not your job.
- Lines to fill in by hand are fields, not text: "עם מקום לתאריך" gives fields ["תאריך"], "עם תאריך וחתימה" gives ["תאריך", "חתימה"]. Up to 3.
- You never choose a template and never sort the lines into a layout. Never write a word that is not in the message, in the customer's messages in <conversation>, or in <stamp>.

# The look
Only the keys the customer asks to change - never your idea. Never a key that <look> says is fixed: then "say" that it is not possible for this kind of stamp, and change nothing.
  "kind": ${KIND_NAMES.map((k) => `"${k}" (${KINDS[k].label})`).join(' | ')}
     rect = the everyday stamp; round = a seal; square = a square stamp; status = the stamp of one word. These are the only shapes made - any other shape is in "What you cannot do"
  "color": ${INK_NAMES.map((k) => `${k} (${INK_COLORS[k].label})`).join(' | ')} - the ink
  "font": "sans" (modern, clean) | "serif" (classic, traditional)
  "size": "auto" (the software picks the smallest the text fits in) or one of the sizes of the kind, in mm:
${sizes}
  "look": ${lookList}
  "icon": "" (none) or one of: ${icons}
     Only from the list. When the customer names a symbol that is not there: no icon, and "say" which listed ones come close (by their Hebrew names).
  "iconPos": where the icon stands, by kind:
${iconPos}
     right/left = beside the text, top/bottom = on a row of its own above/below the text; on a seal: center = in the middle above its text, bottom = under the center text, sides = on the ring left and right
  "iconSize": "s" | "m" | "l"

# What you cannot do
The stamp has only the lines and the look above. There is no shape other than the kinds above, no bold or bigger single line, no rotating one line, no line on a specific arc or place of a seal, no worn, used or tilted effect, no free positioning, no logo or picture upload, no second color.
When the customer asks for one of those: text null, look {}, and "say" says briefly in Hebrew that it is not possible ("אי אפשר ...") and what IS possible instead (another look, a size, a font, an icon from the list). When the same message also asks for something possible (a new stamp, a change): do that part as usual - text, fields, look - leave the impossible part out, and "say" the same one short sentence.

# Examples
${extractExamples().join('\n\n')}`
}

// ---- station 2: place ----

// what station 2 may fill in the tail. extra lines and fields are never its business
const PLACE_TAIL = ['address', 'phones', 'email', 'web']

function slotRow(s: SlotDef) {
  const bits: string[] = [s.label]
  if (s.need) bits.push('needed')
  if (s.type === 'number') bits.push('a number, its digits as written')
  if (s.options) {
    const opts = s.options.map((o) => JSON.stringify(o)).join(' | ')
    bits.push(s.options[0] === '' ? `one of ${opts} - "" when the lines do not say` : `one of ${opts} - the first is the default`)
  }
  return `${s.key} (${bits.join(', ')})`
}

function templateRow(t: Template) {
  const tail = t.tail.filter((p) => PLACE_TAIL.includes(p))
  return [
    `- "${t.id}" (${t.label}): ${t.hint}`,
    `    prints: ${t.lines.map((l) => l.parts.join(' ')).join('  /  ')}`,
    `    slots: ${t.slots.map(slotRow).join('; ')}`,
    `    tail: ${tail.length ? tail.join(', ') : 'none'}`,
  ].join('\n')
}

// only the clean lines; and on a stamp that already is in a template, where its details sit now
export function placeRequest(text: string[], prev: Form | null): string {
  const cur = prev && getTemplate(prev.tmpl) ? { tmpl: prev.tmpl, slots: prev.slots, tail: { address: prev.tail.address, phones: prev.tail.phones, email: prev.tail.email, web: prev.tail.web } } : null
  return [`<lines>\n${bullets(text, 'none')}\n</lines>`, ...(cur ? [`<current>\nthe current placement: keep it for every line that did not change\n${JSON.stringify(cur)}\n</current>`] : [])].join('\n')
}

const NOTHING: Placed['tail'] = { address: '', phones: [], email: '', web: '' }

function placeExample(lines: string[], prev: Record<string, unknown> | null, reply: { tmpl: string; slots?: Record<string, string>; tail?: Partial<Placed['tail']> }) {
  const full: Placed = { tmpl: reply.tmpl, slots: reply.slots ?? {}, tail: { ...NOTHING, ...reply.tail } }
  return `Request:\n${placeRequest(lines, prev && cleanForm(prev))}\nReply:\n${JSON.stringify(full)}`
}

function placeExamples() {
  const shtern = cleanForm(SHTERN)
  const spices = cleanForm(SPICES)
  const dealer = cleanForm(DEALER)
  return [
    placeExample(['שמוליק', 'תבלינים הכרמל', "ח'פ 5153 826 47"], null, { tmpl: 'company', slots: { name: 'תבלינים הכרמל', signer: 'שמוליק', number: '5153 826 47' } }),
    placeExample(['אורית נחום', 'רכזת רכש', 'שקד מערכות בע"מ'], null, { tmpl: 'employee', slots: { name: 'אורית נחום', position: 'רכזת רכש', org: 'שקד מערכות בע"מ' } }),
    placeExample(['עורך דין'], null, { tmpl: 'lawyer', slots: { name: '' } }),
    placeExample(['רחל אבוטבול עורכת דין 412790'], null, { tmpl: 'lawyer', slots: { name: 'רחל אבוטבול', license: '412790' } }),
    placeExample(['ד"ר אסנת פרי רופאת עור', 'מ.ר. 3 4 5 6 7', 'מ.ר.מ 8812'], null, { tmpl: 'doctor', slots: { name: 'אסנת פרי', specialty: 'רופאת עור', license: '3 4 5 6 7', specialist: '8812' } }),
    placeExample(['אלי ששון', 'יועץ ביטוח', 'עוסק מורשה 0 3 2 7 7 1 4 5 6'], null, { tmpl: 'dealer', slots: { name: 'אלי ששון', position: 'יועץ ביטוח', kind: 'ע.מ.', number: '0 3 2 7 7 1 4 5 6' } }),
    placeExample(['גיל אמסלם עיצוב גרפי', 'מספר 300987652'], null, { tmpl: 'dealer', slots: { name: 'גיל אמסלם עיצוב גרפי', kind: '', number: '300987652' } }),
    placeExample(['טל-אור הנדסה בע"מ', 'TAL-OR ENGINEERING LTD', 'ח"פ 51-433210-8', 'info@talor.co.il'], null, { tmpl: 'company', slots: { name: 'טל-אור הנדסה בע"מ', english: 'TAL-OR ENGINEERING LTD', number: '51-433210-8' }, tail: { email: 'info@talor.co.il' } }),
    placeExample(['מרכז הקהילתי נווה גן', 'ע.ר. 580 412 337'], null, { tmpl: 'nonprofit', slots: { name: 'מרכז הקהילתי נווה גן', number: '580 412 337' } }),
    placeExample(['ועד בית נווה שקד', 'הדקל 4 נתניה'], null, { tmpl: 'vaad', slots: { building: 'נווה שקד' }, tail: { address: 'הדקל 4 נתניה' } }),
    placeExample(['נתקבל'], null, { tmpl: 'status', slots: { word: 'נתקבל' } }),
    placeExample(['משרד אדריכלות', 'רינה גולן', 'אדריכלית', '054-1112233'], null, { tmpl: 'licensed', slots: { name: 'רינה גולן', profession: 'אדריכלית' }, tail: { phones: ['054-1112233'] } }),
    placeExample(['פרחי העמק', 'עפולה'], null, { tmpl: 'none' }),
    placeExample([...sourceLines(shtern), 'טלפון 052 765 4321'], SHTERN, { tmpl: 'lawyer', slots: shtern.slots, tail: { address: shtern.tail.address, phones: ['052 765 4321'] } }),
    placeExample([sourceLines(spices)[0], 'יבוא ושיווק', ...sourceLines(spices).slice(1)], SPICES, { tmpl: 'company', slots: spices.slots }),
    placeExample([...sourceLines(dealer), 'עוסק פטור'], DEALER, { tmpl: 'dealer', slots: { ...dealer.slots, kind: 'ע.פ.' } }),
  ]
}

export function placeSystem(templates: Template[]): string {
  return `You place the lines of a rubber stamp into ONE of a stamp shop's templates. The lines are clean: they are what the customer wants on the stamp.
A template is a kind of stamp with its own fixed text and SLOTS. You pick the template and COPY every line - or every part of a line - into its slot. The shop's software prints the template's lines and formats numbers and phones; you never decide the layout.

# Reply format
One JSON object and nothing else - no text before or after it, no markdown fences:
{"tmpl": "...", "slots": {...}, "tail": {"address": "", "phones": [], "email": "", "web": ""}}
- "tmpl": the id of a template from the list, or "none".
- "slots": {slot key: value} - the slots of the chosen template, and only them. "" for a slot the lines do not give.
- "tail": the common details printed under the template's lines - only the parts the template takes:
   "address": the address in one string, as written; a city alone is an address too
   "phones": phone numbers, each as written ("052 123 45 67" stays "052 123 45 67"). Up to 2. A fax (פקס) is not a phone
   "email", "web": as written

# The templates
Each one: what it is for, the lines it prints ({slot} is where a slot's value goes), its slots, and which parts of the tail it takes.
${templates.map(templateRow).join('\n')}

# "none"
Answer "none" ONLY when the stamp is not one of the templates (a shop or a café with no number, a library label, a stamp made only of free lines).

# A line with no place is left out
When the template is clear but a line, or a part of a line, has no slot or tail part that is truly its place (a slogan, a branch, a fax, a line above everything): leave it out. Never force it into a slot - not a slogan into a position, not a second name into a name, not a fax into phones. The software tells the customer what was left out.

# Picking the template
- By what the stamp is: a lawyer's own stamp is "lawyer", a physician's or dentist's is "doctor", an engineer's, accountant's or psychologist's (any other professional's own stamp: name and profession) is "licensed", a person who signs with their position in an organization is "employee", a building committee is "vaad", one word for a document (שולם, נאמן למקור) is "status".
- A business is one of three, by its WORDS - never by the digits of its number:
  - "company": the lines have בע"מ, Ltd, or ח.פ. in any spelling (ח"פ, ח'פ, חברה פרטית). A person who signs for it, with their position, goes to signer and position, even when the person comes first.
  - "nonprofit": the lines have עמותה, עמותת, or ע.ר. in any spelling (ע"ר).
  - "dealer": ע.מ., ע.פ., עוסק מורשה or עוסק פטור (any spelling), or a bare number (alone, or behind a label such as "מספר") with none of the words above. A person or a business: a professional who gives such a number, not a license, is a dealer - their own name or the business name is name, their profession is position.
  - A business with no number and none of these words is "none".

# Filling the slots
- COPY every value from the lines exactly as written, letter for letter and digit group for digit group: "5153 826 47" stays "5153 826 47", "51-433210-8" stays "51-433210-8". Never join, fix, translate or add.
- The words that need no slot: the template's own fixed text (it prints עו"ד, ד"ר, מ.ר., מ.ר.מ., ח.פ., ע.ר., ועד הבית itself), the words that say what the stamp is when the template is that kind (עורך דין on "lawyer"), and labels that only name a detail (טל, טלפון, נייד, מייל, כתובת, מספר, מס').
- Names exactly as written, in the script they were written in. A business with a Hebrew and an English name: the Hebrew one is name, the English one is english.
- A person's name WITHOUT the title the template prints: 'עו"ד אבי שטרן' and "עורכת דין רחל אבוטבול" give name "אבי שטרן" / "רחל אבוטבול", 'ד"ר אסנת פרי' gives name "אסנת פרי". A lawyer who is also a notary ('עו"ד ונוטריון') takes title 'עו"ד ונוטריון'.
- A profession or a position goes to its slot as written ("רואת חשבון", "מנהלת משאבי אנוש").
- A number slot holds the number only, without its label - the template prints its label itself (ח.פ. on "company", ע.ר. on "nonprofit", מ.ר. / מ.ר.מ. on a license).
- "kind" of a dealer is one of its options, by the label the customer wrote: "ע.מ." for ע.מ. / ע"מ / עוסק מורשה, "ע.פ." for ע.פ. / ע'פ / עוסק פטור, "" when the customer did not say. Never guess it.
- A bare number on a lawyer or a professional is the license. Two numbers of one doctor ("מ.ר. 123456 מ.ר.מ. 54321") are license and specialist.

# The current placement
<current> is where the stamp's details sit now. Keep its template and the slot of every line that did not change; place only what is new or changed. When the lines are not that kind of stamp anymore, pick another template, or "none" when they are none of them.

# Examples
${placeExamples().join('\n\n')}`
}
