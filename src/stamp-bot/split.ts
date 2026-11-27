// NOT a 'use server' file on purpose - server-internal. the station BEFORE the turn: one customer message that asks for
// several stamps is cut into the text of each one, and each piece then runs as a conversation of its own (api.ts).
// the model only cuts and copies; code checks with the same tokens as check.ts that no word was invented and none lost.
// any doubt - a bad reply, a word invented or lost - and the whole message is one stamp, as before this station existed
import { tokens } from './check'
import { MAX_TEXT, parseObj } from './turn'

const MAX_PIECES = 30

export function splitRequest(text: string): string {
  return `<message>\n${text}\n</message>`
}

function splitExample(message: string, stamps: string[]) {
  return `Request:\n${splitRequest(message)}\nReply:\n${JSON.stringify({ stamps })}`
}

// invented names and numbers
function splitExamples() {
  const shared = 'אני צריך חותמות לשני עובדים בחברת אורן לוגיסטיקה בע"מ, החרש 5 חולון:'
  return [
    // one stamp with many details: one piece, the message unchanged
    splitExample('חותמת לד"ר משה שרת רופא ילדים מ.ר. 55455, טל 03-5551234 ונייד 052-7778899', ['חותמת לד"ר משה שרת רופא ילדים מ.ר. 55455, טל 03-5551234 ונייד 052-7778899']),
    // one stamp on several lines
    splitExample('שלום, צריך חותמת:\nכרמית אלון\nרואת חשבון\nהנביאים 12 חיפה\n04-8123456, 052-3344556', ['שלום, צריך חותמת:\nכרמית אלון\nרואת חשבון\nהנביאים 12 חיפה\n04-8123456, 052-3344556']),
    // the names of the partners of ONE firm are one stamp
    splitExample('חותמת עגולה למשרד לוי, כהן ושות׳ עורכי דין, טל 03-1234567', ['חותמת עגולה למשרד לוי, כהן ושות׳ עורכי דין, טל 03-1234567']),
    // two people, each with their own details
    splitExample('חותמת לעו"ד יעל בן דוד מ.ר. 61234, ועוד חותמת לרו"ח אמיר טל רישיון 77812', ['חותמת לעו"ד יעל בן דוד מ.ר. 61234', 'ועוד חותמת לרו"ח אמיר טל רישיון 77812']),
    // employees of one company: the shared company name and address go into every piece
    splitExample(`${shared} רונית שגיא מנהלת חשבונות, ויוסי מרקוביץ סמנכ"ל תפעול`, [`${shared} רונית שגיא מנהלת חשבונות`, `${shared} ויוסי מרקוביץ סמנכ"ל תפעול`]),
    // a shape that belongs to one stamp only stays with it
    splitExample('שתי חותמות: אחת עגולה לעמותת אור לנוער ע.ר. 580123456, ואחת מלבנית לעו"ד נועה פלד מ.ר. 70321', ['שתי חותמות: אחת עגולה לעמותת אור לנוער ע.ר. 580123456', 'ואחת מלבנית לעו"ד נועה פלד מ.ר. 70321']),
    // a list, one stamp per line, with a colour for all of them: the colour goes into every piece, the list number stays with its line
    splitExample('כל החותמות בכחול בבקשה\n1. אבי כהן חשמלאי מוסמך רישיון 1023344\n2. דני לוי אינסטלטור 058-1112233', ['כל החותמות בכחול בבקשה\n1. אבי כהן חשמלאי מוסמך רישיון 1023344', 'כל החותמות בכחול בבקשה\n2. דני לוי אינסטלטור 058-1112233']),
  ]
}

export function splitSystem(): string {
  return `You read one message of a customer of a rubber stamp shop (חותמות). The customer writes in Hebrew.
The message may ask for ONE stamp or for SEVERAL stamps. Your only job is to cut the message into the text of each stamp it asks for. The shop's software reads each piece later as a message of its own.

# Reply format
One JSON object and nothing else - no text before or after it, no markdown fences:
{"stamps": ["...", "..."]}
- "stamps": the text of each stamp, in the order the customer wrote them. One stamp = a list of one string.

# One stamp - the common case
Most messages ask for ONE stamp. Then reply with ONE piece: the whole message exactly as it is.
A stamp has many details and that is still ONE stamp: several lines, a name with a title or a profession, an address, two or three phones, an email, a number, a company with its signer, a firm with the names of its partners ("לוי, כהן ושות'"). A greeting, thanks or an explanation around it does not make another stamp.
Cut ONLY when the customer clearly asks for more than one stamp: several people or businesses, each with their own details; "ועוד חותמת", "וגם חותמת", "שתי חותמות", "חותמות ל..."; a numbered list or one line per stamp of different people or businesses. When in doubt, it is ONE stamp.

# Cutting
- COPY, never write: every piece is made of the customer's own words, letter for letter, in the customer's order. Never translate, fix a typo, add a word or a label, or move a word inside a detail. Never cut a letter off a word: "ועוד", "לעו"ד", "בחברת", "ויוסי" stay whole.
- Every word of the message is in at least one piece - nothing is dropped. Words that open or join the stamps ("אני צריך", "שתי חותמות:", "ועוד", "וגם") stay in the piece they stand in.
- Words that apply to several stamps are copied into EVERY piece they apply to: a shared company name, a shared address or phone, a shape or a colour said for all of them ("כל החותמות בכחול"), the sentence that introduces them ("חותמות לשני עובדים במשרד לוי, הרצל 1 תל אביב:").
- A word that belongs to one stamp only (its shape, its colour, its number) stays only in that stamp's piece.
- A list number ("1.", "2.") stays with its line.
- A comma that only joined two stamps may be left out at the cut.

# Examples
${splitExamples().join('\n\n')}`
}

// the pieces of the reply, or null when it fails a check: not a list of 1..30 strings, a piece with no word in it,
// a word in a piece that is not in the message (invented or changed), or a word of the message in no piece (lost).
// words are compared as check.ts tokens, so the punctuation at a cut does not matter
export function readSplit(raw: string, text: string): string[] | null {
  const o = parseObj(raw)
  const list = o?.stamps
  if (!Array.isArray(list) || list.length < 1 || list.length > MAX_PIECES) return null
  if (list.some((p) => typeof p !== 'string')) return null
  const pieces = (list as string[]).map((p) => p.trim())
  const all = new Set(tokens(text))
  const seen = new Set<string>()
  for (const p of pieces) {
    const toks = tokens(p)
    if (!toks.length) return null
    for (const t of toks) {
      if (!all.has(t)) return null
      seen.add(t)
    }
  }
  for (const t of all) if (!seen.has(t)) return null
  return pieces
}

// the text clamped like one message of the turn. one piece (or any failure) = the whole message as one stamp
export async function split(text: string, ask: (req: string) => Promise<string>): Promise<string[]> {
  if (typeof text !== 'string' || !text.trim()) return []
  const clamped = text.slice(0, MAX_TEXT)
  try {
    const pieces = readSplit(await ask(splitRequest(clamped)), clamped)
    return pieces && pieces.length > 1 ? pieces : [text]
  } catch {
    return [text] // timeout, a process that died, no claude cli on this machine
  }
}
