// CHECKS between the model and the customer's stamp. the models COPY the customer's words; code compares letters.
// these pure functions are the only code guard that what came back is the customer's own words, in the right template,
// and they tell which of the customer's words did not get onto the stamp. no model, no I/O
import { getTemplate, phoneText, prefixText, slotValue, structure, type Form, type Template } from './form'

const PREFIX_LETTERS = 'ובלמהכש'

// ---- spelling that is not a difference ----

// whitespace, nikud and other marks, invisible characters and the many quote and geresh characters. nothing else:
// a letter added, a typo fixed or digit groups joined are differences
function plain(s: string) {
  return s
    .replace(/\p{Cc}/gu, ' ') // control characters separate words, like form.ts does
    .replace(/[\p{M}\p{Cf}]/gu, '') // nikud, other marks, direction marks and zero-width characters
    .replace(/[״“”„]/g, '"')
    .replace(/[׳‘’`´]/g, "'")
    .replace(/''/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// a word without the punctuation around it (comma, colon, brackets, quotes, a final dot), as the customer wrote it
function written(raw: string) {
  let w = raw.replace(/^[,;:!?()[\]{}<>|"]+|[,;:!?()[\]{}<>|"]+$/g, '')
  if (/\.$/.test(w) && !/\..*\./.test(w)) w = w.slice(0, -1) // "אביב." -> "אביב", but "ח.פ." stays
  return w
}

// ---- tokens: the letters and digits of a word, for comparing what code prints with what the customer wrote ----

type Chunk = { raw: string; toks: string[] }

// letters are any script's letters (so an Arabic or Russian line is checked too, not skipped), digits only 0-9
function chunkTokens(raw: string) {
  const bare = raw.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}0-9]/gu, '')
  return bare.match(/\p{L}+|[0-9]+/gu) ?? []
}

function chunks(s: string): Chunk[] {
  return plain(s)
    .split(' ')
    .map((raw) => ({ raw, toks: chunkTokens(raw) }))
    .filter((c) => c.toks.length)
}

// per whitespace chunk: every char that is not a letter or a digit dropped (עו"ד -> עוד, 050-1234567 -> 0501234567),
// split at every letter/digit boundary (ח.פ.514174358 -> חפ + 514174358), Latin lower-cased
export function tokens(s: string): string[] {
  return chunks(s).flatMap((c) => c.toks)
}

const isDigits = (t: string) => /^[0-9]+$/.test(t)

function uniq(a: string[]) {
  return [...new Set(a)]
}

// `word` is `base` behind 1..max Hebrew prefix letters (ו ב ל מ ה כ ש), and `base` has 2+ letters
function behindPrefix(word: string, base: string, max = 2) {
  const n = word.length - base.length
  if (n < 1 || n > max || base.length < 2 || isDigits(base) || !word.endsWith(base)) return false
  return [...word.slice(0, n)].every((c) => PREFIX_LETTERS.includes(c))
}

// ---- the customer's words ----

// the words of `text` that are not a substring of any source, as written. cutting a prefix letter off is taking a
// substring (עו"ד from לעו"ד); adding a letter, fixing a typo or joining digit groups is not
function notIn(text: string, sources: string[]) {
  return plain(text)
    .split(' ')
    .map(written)
    .filter((w) => chunkTokens(w).length && !sources.some((s) => s.includes(w)))
}

export function sourceLines(form: Form | null): string[] {
  if (!form) return []
  return structure(form)
    .filter((b) => !b.ph)
    .map((b) => b.text)
}

export type Check = { ok: true } | { ok: false; words: string[] }

// CHECK A - every word of `text` is a substring of one of `sources`
export function fromCustomer(text: string[], sources: string[]): Check {
  const src = sources.map(plain)
  const words = uniq(text.flatMap((l) => notIn(l, src)))
  return words.length ? { ok: false, words } : { ok: true }
}

// ---- signs ----

// the phrase's tokens appear in a row in the line's tokens; the first may carry prefix letters when it has 3+ letters
// (a short sign like דר would otherwise match the name הדר)
function hasPhrase(line: string[], phrase: string[]) {
  if (!phrase.length) return false
  for (let i = 0; i + phrase.length <= line.length; i++) {
    const first = line[i] === phrase[0] || (phrase[0].length >= 3 && behindPrefix(line[i], phrase[0]))
    if (first && phrase.every((w, k) => k === 0 || line[i + k] === w)) return true
  }
  return false
}

// a slot is filled when it prints something, formatted the way structure() prints it
function filled(tpl: Template, form: Form, key: string) {
  const def = tpl.slots.find((s) => s.key === key)
  return !!def && tokens(slotValue(form, def)).length > 0
}

// one of the template's signs holds (true when the template has no signs)
export function hasSign(tpl: Template, text: string[], form: Form): boolean {
  const words = tpl.signs?.words ?? []
  const slots = tpl.signs?.slots ?? []
  if (!words.length && !slots.length) return true
  const lines = text.map(tokens)
  if (words.some((w) => lines.some((l) => hasPhrase(l, tokens(w))))) return true
  return slots.some((k) => filled(tpl, form, k))
}

// ---- CHECK B ----

// a word as an excuse compares it: as written, without a final dot, Latin lower-cased (מ.ר. = מ.ר, Tel. = tel)
function key(w: string) {
  return written(plain(w)).replace(/\.+$/, '').toLowerCase()
}

// the words that only label a part (a phone, an email, a website, an address, a number, a license, a name, a position).
// the customer writes them and the stamp prints the part without them. never a word that can be content of its own:
// פקס (a fax prints with its label), מס without its geresh (tax), דואר, אינטרנט, פלאפון (names of businesses)
const DROP = new Set(
  [
    'טל', "טל'", 'טלפון', 'טלפונים', 'נייד', 'סלולרי', 'סלולארי', 'נ',
    'מייל', 'אימייל', 'אמייל', 'אי-מייל', 'דוא"ל', 'אתר',
    'כתובת', 'רחוב', "רח'",
    'מספר', "מס'", 'רישיון', 'רשיון', 'מ.ר', 'מ.ר.מ',
    'שם', 'תפקיד', 'חותם',
    'tel', 'telephone', 'phone', 'mobile', 'mob', 'cell', 'email', 'e-mail', 'mail', 'web', 'website', 'site',
    'address', 'no', 'number', 'lic', 'license', 'licence', 'name',
  ].map(key),
)

// the words the stamp prints in its own way. the template's sign words only when it prints its sign itself
// (עו"ד for עורכת דין); a company's בע"מ or a status word is content and must be printed
function excusesOf(tpl: Template | null) {
  const ex = new Set(DROP)
  if (tpl?.signs?.own) for (const w of tpl.signs.words ?? []) for (const p of plain(w).split(' ')) ex.add(key(p))
  return ex
}

function excused(raw: string, ex: Set<string>) {
  const k = key(raw)
  if (!k) return false
  if (ex.has(k)) return true
  for (const e of ex) if (behindPrefix(k, e)) return true
  return false
}

// the tokens of runs of 1-3 letter words that spell an official prefix another way: [start, length, standard tokens]
function prefixRuns(toks: string[]) {
  const out: [number, number, string][] = []
  for (let i = 0; i < toks.length; i++) {
    for (let n = Math.min(3, toks.length - i); n >= 1; n--) {
      const run = toks.slice(i, i + n)
      if (run.some(isDigits)) continue
      const std = prefixText(run.join(' '))
      if (std && std !== run.join(' ')) {
        out.push([i, n, tokens(std).join(' ')])
        break
      }
    }
  }
  return out
}

// an option word is backed by the text: the same token, the customer's spelling of that official prefix
// (עוסק מורשה backs ע.מ.), or one prefix letter either way (נוטריון backs ונוטריון)
function backed(word: string, text: string[]) {
  const w = tokens(word).join(' ')
  if (!w) return true
  return text.some((l) => {
    const toks = tokens(l)
    if (toks.some((t) => t === w || behindPrefix(t, w, 1) || behindPrefix(w, t, 1))) return true
    return prefixRuns(toks).some(([, , std]) => std === w)
  })
}

const sameDigitsAndLetters = (a: string, b: string) => tokens(a).join('') === tokens(b).join('')

// the stored values that print in full: their words are on the stamp even when code formats them (5141 743 58 prints
// as 514174358, 050 123 4567 as 050-1234567). a value that prints partly (a number slot with letters in it) or not at
// all (a part the template does not take) does not count
function printedValues(form: Form, tpl: Template | null, lines: string[]) {
  const out: string[] = []
  for (const s of tpl?.slots ?? []) {
    const v = form.slots[s.key] ?? ''
    const shown = slotValue(form, s)
    if (s.options || !v || !shown || !sameDigitsAndLetters(v, shown)) continue
    if (lines.some((l) => l.includes(shown))) out.push(v)
  }
  const t = form.tail
  const take = (p: 'address' | 'phones' | 'email' | 'web') => !!tpl?.tail.includes(p)
  if (take('address')) out.push(t.address)
  if (take('phones')) out.push(...t.phones.filter((p) => sameDigitsAndLetters(p, phoneText(p))))
  if (take('email')) out.push(t.email)
  if (take('web')) out.push(t.web)
  return out.filter(Boolean)
}

// CHECK B, on a clean form. invented: the stored words that are not the customer's. unused: the customer's words that
// are not on the stamp (the words to tell the customer were left out)
export function placed(text: string[], form: Form): { invented: string[]; unused: string[] } {
  const tpl = getTemplate(form.tmpl)
  const src = text.map(plain)

  const invented: string[] = []
  for (const s of tpl?.slots ?? []) {
    const v = form.slots[s.key] ?? ''
    if (!v) continue
    if (s.options) {
      // the first option is the template's own default ("" or עו"ד): only what another option adds needs backing
      if (v === s.options[0]) continue
      const base = new Set(plain(s.options[0]).split(' '))
      for (const w of plain(v).split(' ')) if (!base.has(w) && !backed(w, text)) invented.push(written(w))
      continue
    }
    invented.push(...notIn(v, src))
  }
  const t = form.tail
  for (const v of [t.address, ...t.phones, t.email, t.web, ...form.fields, ...form.written.map((w) => w.text)]) invented.push(...notIn(v, src))

  // unused: decided on the words AS WRITTEN - the quote mark inside ד"ר or בע"מ is part of the word, so הדר is not
  // ה + ד"ר. what code formats is matched through the stored copy it was printed from (5141 743 58 -> 514174358)
  const lines = sourceLines(form)
  const onStamp = new Set([...lines, ...form.fields, ...printedValues(form, tpl, lines)].flatMap(wordsOf))
  const ex = excusesOf(tpl)

  // the word is printed, or is a printed word behind 1-2 prefix letters (לפיצוחים, לד"ר), or a printed word is it
  // behind one prefix letter (ונוטריון for נוטריון), or it is the customer's spelling of a printed prefix (ח'פ for ח.פ.)
  const printed = (w: string) => {
    if (onStamp.has(w) || onStamp.has(prefixText(w))) return true
    for (const p of onStamp) if (behindPrefix(w, p) || behindPrefix(p, w, 1)) return true
    return false
  }
  // a word glued to a number (ח.פ.514174358) is printed when both of its pieces are
  const used = (w: string) => {
    if (printed(w)) return true
    const ps = pieces(w)
    return ps.length > 1 && ps.every(printed)
  }

  const unused: string[] = []
  for (const line of text) {
    const ws = wordsOf(line).filter((w) => !excused(w, ex))
    const ok = ws.map(used)
    // the customer's spelling of a printed prefix in more than one word (חברה פרטית for ח.פ.)
    for (let i = 0; i < ws.length; i++) {
      for (let n = Math.min(3, ws.length - i); n >= 2; n--) {
        const run = ws.slice(i, i + n)
        if (run.some((w) => /\d/.test(w))) continue
        const std = prefixText(run.join(' '))
        if (std === run.join(' ') || !onStamp.has(std)) continue
        for (let k = i; k < i + n; k++) ok[k] = true
        break
      }
    }
    ws.forEach((w, i) => ok[i] || unused.push(w))
  }
  return { invented: uniq(invented), unused: uniq(unused) }
}

// the words of a text as written: the same normalization as the customer's-word check, edge punctuation trimmed
function wordsOf(s: string) {
  return plain(s)
    .split(' ')
    .map(written)
    .filter((w) => chunkTokens(w).length)
}

// a word cut where digits meet other characters (ח.פ.514174358 -> ח.פ. + 514174358; a dash inside a number stays)
function pieces(w: string) {
  return (w.match(/[0-9][0-9-]*[0-9]|[0-9]|[^0-9]+/g) ?? []).map(written).filter((p) => chunkTokens(p).length)
}

// ---- exact lines ----

// a line's tokens to compare: without the excused words, an official prefix in its standard spelling, digit groups joined
function lineKey(line: string, ex: Set<string>) {
  const toks = chunks(line)
    .filter((c) => !excused(c.raw, ex))
    .flatMap((c) => c.toks)
  const runs = new Map(prefixRuns(toks).map(([i, n, std]) => [i, [n, std] as const]))
  const out: string[] = []
  for (let i = 0; i < toks.length; i++) {
    const r = runs.get(i)
    const t = r ? r[1] : toks[i]
    if (r) i += r[0] - 1
    if (isDigits(t) && out.length && isDigits(out[out.length - 1])) out[out.length - 1] += t
    else out.push(t)
  }
  return out.join(' ')
}

// the printed lines are the customer's lines, one for one and in order
export function sameLines(text: string[], form: Form): boolean {
  const blocks = structure(form)
  if (blocks.length !== text.length || blocks.some((b) => b.ph)) return false // a placeholder is never the customer's line
  const ex = excusesOf(getTemplate(form.tmpl))
  return text.every((l, i) => lineKey(l, ex) === lineKey(blocks[i].text, ex))
}
