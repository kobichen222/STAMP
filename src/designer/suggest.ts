import type { LayoutContent, LayoutStyle } from './compose';

export interface Suggestion {
  style: LayoutStyle;
  title: string;
  content: LayoutContent;
}

// --------------------------------------------------------------------------
// Required details: everything concrete the customer wrote must appear on the
// stamp exactly (names, numbers, phones, e-mail, website, address, quotes).
// --------------------------------------------------------------------------

export type RequiredKind = 'name' | 'phone' | 'email' | 'url' | 'number' | 'address' | 'quote' | 'text';
export interface RequiredItem {
  kind: RequiredKind;
  /** Exact text as the customer wrote it. */
  value: string;
  /** Prefix the customer asked for ("מ.ר.", "ח.פ.", "טל׳" …) – never invented. */
  label?: string;
}

const HEB_WORD = '[֐-׿"׳״\'-]+';
const NAME_STOP = /^(?:עם|ו?טלפון|ו?נייד|ו?מספר|ו?כתובת|ו?ברחוב|ו?רחוב|ו?מייל|ו?אתר|ו?רישיון|ו?ח\.?פ|ו?ע\.?מ|ו?ת\.?ז|ו?מ\.?ר|שהוא|שהיא|לחותמת|עגולה|מלבנית|ו)$/;
const NUMBER_LABELS: [RegExp, string][] = [
  [/(?:ח\.?\s?פ\.?|מספר\s+חברה)\s*:?\s*$/, 'ח.פ.'],
  [/(?:ע\.?\s?מ\.?|עוסק\s+מורשה)\s*:?\s*$/, 'ע.מ.'],
  [/(?:ע["״]ר)\s*:?\s*$/, 'ע״ר'],
  [/(?:ת\.?\s?ז\.?|תעודת\s+זהות)\s*:?\s*$/, 'ת.ז.'],
  [/(?:מ\.?\s?ר\.?|מספר\s+רישיון|רישיון|רשיון)\s*:?\s*$/, 'מ.ר.'],
];
const PHONE_WORDS: [RegExp, string][] = [
  [/(?:פקס)\s*:?\s*$/, 'פקס'],
  [/(?:טלפון|טל[׳'.]?|נייד|פלאפון|סלולרי|וואטסאפ)\s*:?\s*$/, 'טל׳'],
];
/** Request words – how people ask for a stamp, not text to print. */
const STOP = new Set(
  'אני צריך צריכה רוצה מבקש מבקשת להזמין ליצור לעצב חותמת חותמות עגולה מלבנית קטנה גדולה עבור עבורי של בשם עם גם וגם שיהיה יהיה שכתוב כתוב עליה בה לי את בבקשה תודה טלפון נייד מספר רישיון כתובת מייל אתר פקס חברה לחברה עסק לעסק פרטים הפרטים שלי כמו דוגמה הבאים הבא הזה הזו זה זו כיתוב הכיתוב טקסט הטקסט תוכן התוכן שורה שורות ובה'.split(' '),
);
const isStop = (w: string) => {
  const bare = w.replace(/[:,.]+$/, '');
  return STOP.has(bare) || STOP.has(bare.replace(/^ו/, '')) || /^[-–—:.,;!?'"״׳()]+$/.test(w);
};

/** Normalise for comparison: ignore spaces, dashes, dots, quotes/geresh and case. */
export const normalize = (s: string) => s.replace(/[\s\-–—.,:;"'`״׳()/\\]/g, '').toLowerCase();
const digits = (s: string) => s.replace(/\D/g, '');
const MASK = '\u0001';

/**
 * Every concrete thing the customer wrote, in their order: recognised details
 * (numbers with their label, phones, e-mail, website, address, quotes, name)
 * and – so nothing is ever lost – any remaining words that aren't request
 * words ("אני צריך חותמת…") as free text.
 */
export function extractRequired(prompt: string): RequiredItem[] {
  const src = prompt.replace(/\s+/g, ' ').trim();
  let text = src; // consumed characters are masked, so offsets stay stable
  const items: (RequiredItem & { at: number })[] = [];
  const mask = (start: number, len: number) => (text = text.slice(0, start) + MASK.repeat(len) + text.slice(start + len));
  const push = (item: RequiredItem, at: number) => {
    if (!items.some((o) => normalize(o.value) === normalize(item.value))) items.push({ ...item, at });
  };
  const each = (re: RegExp, fn: (m: RegExpMatchArray) => void) => [...text.matchAll(re)].forEach(fn);
  /** Label right before `at` (e.g. "מ.ר", "טלפון:"): returns it and masks it. */
  const labelBefore = (at: number, table: [RegExp, string][]) => {
    const from = Math.max(0, at - 24);
    const before = text.slice(from, at);
    for (const [re, label] of table) {
      const m = re.exec(before);
      if (m) {
        mask(from + m.index, m[0].length);
        return label;
      }
    }
    return undefined;
  };

  // Quoted text – but not the geresh of abbreviations like עו"ד (quote must follow a space).
  each(/(?<=^|[\s:(])["“]([^"“”]{2,80}?)["”](?=$|[\s,.;:)!?])/g, (m) => {
    push({ kind: 'quote', value: m[1].trim() }, m.index!);
    mask(m.index!, m[0].length);
  });
  each(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, (m) => {
    push({ kind: 'email', value: m[0] }, m.index!);
    mask(m.index!, m[0].length);
  });
  each(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:co\.il|org\.il|gov\.il|ac\.il|com|org|net|il|co|io)(?:\/[^\s,]*)?/gi, (m) => {
    push({ kind: 'url', value: m[0] }, m.index!);
    mask(m.index!, m[0].length);
  });
  each(/(?:ב?כתובת|ב?רחוב|רח[׳'])\s*:?\s*([^,.\n\u0001]{2,40}?\d{1,4}(?:\s*,\s*[֐-׿ ]{2,20}?)?)(?=$|[\s,.;])/g, (m) => {
    push({ kind: 'address', value: m[1].trim() }, m.index!);
    mask(m.index!, m[0].length);
  });
  // Phones – unless the number carries an ID/licence label (then it's a number).
  each(/\+?972[-\s]?\d{1,2}[-\s]?\d{3}[-\s]?\d{4}|0\d{1,2}[-\s]?\d{3}[-\s]?\d{4}|0\d{1,2}-?\d{7}|\*\d{4}/g, (m) => {
    const at = m.index!;
    const ctx = text.slice(Math.max(0, at - 24), at);
    if (NUMBER_LABELS.some(([re]) => re.test(ctx))) return;
    const label = labelBefore(at, PHONE_WORDS);
    // An unlabelled 9-digit number that isn't formatted like a phone stays a plain number.
    if (!label && !/[-\s]/.test(m[0]) && digits(m[0]).length < 10) return;
    push({ kind: 'phone', value: m[0], label }, at);
    mask(at, m[0].length);
  });
  // Numbers (IDs, licences, dates…) with the label the customer wrote.
  each(/\d{2,}(?:[-/]\d+)+|\d{3,}/g, (m) => {
    const at = m.index!;
    const label = labelBefore(at, NUMBER_LABELS) ?? labelBefore(at, PHONE_WORDS);
    push({ kind: label === 'טל׳' || label === 'פקס' ? 'phone' : 'number', value: m[0], label }, at);
    mask(at, m[0].length);
  });
  // A name after "בשם / של / עבור" (up to 3 words, stops at connector words).
  const nameMatch = new RegExp(`(?:בשם|של|עבור|שם:)\\s+((?:${HEB_WORD}\\s*){1,4})`).exec(text);
  if (nameMatch) {
    const words: string[] = [];
    for (const w of nameMatch[1].trim().split(/\s+/)) {
      if (NAME_STOP.test(w) || words.length === 3) break;
      words.push(w.replace(/[,.]$/, ''));
    }
    const name = words.join(' ');
    if (name.length >= 2) {
      push({ kind: 'name', value: name }, nameMatch.index);
      mask(nameMatch.index, nameMatch[0].indexOf(words[0]) + name.length);
    }
  }
  // Everything else the customer wrote: free text, in order (never dropped).
  const segRe = /[^\u0001,;|\n]+/g;
  for (const m of text.matchAll(segRe)) {
    const words = m[0].trim().split(/\s+/).filter(Boolean);
    while (words.length && isStop(words[0])) words.shift();
    while (words.length && isStop(words[words.length - 1])) words.pop();
    // "לעורך דין" → "עורך דין"
    if (words.length && /^ל(?:עור[כך]|רופא|רוא|מהנדס|פסיכולוג|מורה|נוטריון|גנן|מספר[הת]|מאפי|סטודיו|מוסך|משרד)/.test(words[0])) words[0] = words[0].slice(1);
    const value = words.join(' ').replace(/^[-–:.,]+|[-–:,]+$/g, '').trim();
    if (value.length >= 2 && /[א-תa-z]/i.test(value)) push({ kind: 'text', value }, m.index!);
  }
  return items.sort((x, y) => x.at - y.at).map(({ at: _at, ...r }) => r);
}

/** All text on a layout, one entry per line/arc. */
export const contentLines = (c: LayoutContent) => [c.arcTop ?? '', ...c.lines, c.arcBottom ?? ''].filter(Boolean);

/** Is this required item present on the layout (exactly, ignoring spacing/punctuation)? */
export function isPresent(item: RequiredItem, c: LayoutContent) {
  const lines = contentLines(c);
  if (item.kind === 'phone' || item.kind === 'number') {
    const d = digits(item.value);
    return lines.some((l) => digits(l).includes(d));
  }
  const all = normalize(lines.join(' '));
  if (item.kind === 'name') return item.value.split(/\s+/).every((w) => all.includes(normalize(w)));
  return all.includes(normalize(item.value));
}

export const missingRequired = (c: LayoutContent, required: RequiredItem[]) => required.filter((r) => !isPresent(r, c));

/** Line text for a required item that has to be added. */
export function requiredLine(item: RequiredItem) {
  return item.label ? `${item.label} ${item.value}` : item.value;
}

/** Adds any required item that is missing (as its own line) – nothing the customer asked for is lost. */
export function ensureRequired(c: LayoutContent, required: RequiredItem[]): LayoutContent {
  const missing = missingRequired(c, required);
  if (!missing.length) return c;
  const names = missing.filter((m) => m.kind === 'name').map(requiredLine);
  const rest = missing.filter((m) => m.kind !== 'name').map(requiredLine);
  return { ...c, lines: [...names, ...c.lines, ...rest] };
}

/**
 * Lines the customer typed explicitly – one per line, or separated by "/" "|".
 * Bullets and "שורה 1:" prefixes are stripped; the words themselves are kept
 * exactly. Returns null when the request is free prose.
 */
export function explicitLines(prompt: string): string[] | null {
  const raw = prompt.includes('\n') ? prompt.split(/\n+/) : prompt.split(/\s[|/]\s|\s*\|\s*/);
  const lines = raw
    .map((l) =>
      l
        .replace(/^\s*(?:[-–•*·]|\d+[.)]|שורה\s*(?:\d+|ראשונה|שנייה|שניה|שלישית|רביעית|חמישית)\s*:?)\s*/, '')
        .trim(),
    )
    .filter(Boolean);
  if (lines.length < 2) return null;
  // A first line that only describes the request ("אני צריך חותמת:") is not stamp text.
  if (/^(?:אני\s+)?(?:צריך|צריכה|רוצה|מבקש|מבקשת)?\s*חותמת\b.*:$/.test(lines[0]) || /:$/.test(lines[0])) lines.shift();
  return lines.length >= 1 && lines.every((l) => l.length <= 60) ? lines : null;
}

/** The customer's own lines, verbatim – offered first when they typed lines. */
export function exactSuggestion(prompt: string, round = false): Suggestion | null {
  const lines = explicitLines(prompt);
  if (!lines) return null;
  const content: LayoutContent = round && lines.length >= 2 ? { arcTop: lines[0], arcBottom: lines[lines.length - 1], lines: lines.slice(1, -1) } : { lines };
  return { style: 'classic', title: 'בדיוק כפי שכתבתם', content };
}

// --------------------------------------------------------------------------
// Rule-based fallback (works offline / without an API key)
// --------------------------------------------------------------------------


/**
 * Pulls every concrete detail out of a free-text request and lays it out in
 * three styles. Only details the customer actually wrote are used – no
 * invented placeholders.
 */
export function suggestLocally(prompt: string): Suggestion[] {
  const round = /עגול/.test(prompt);
  // The customer typed their lines: every suggestion uses exactly those lines.
  const exact = exactSuggestion(prompt, round);
  if (exact) {
    const lines = explicitLines(prompt)!;
    return [exact, { style: 'minimal', title: 'Minimal', content: { lines } }, { style: 'modern', title: 'Modern', content: { lines } }];
  }

  const text = prompt.replace(/\s+/g, ' ').trim();
  const required = extractRequired(text);
  // Exactly what the customer wrote, in their order – styles differ, text doesn't.
  const lines = required.map(requiredLine);
  if (!lines.length) lines.push(text.slice(0, 40));
  const base: LayoutContent = { lines };
  const roundContent: LayoutContent = lines.length > 1 ? { arcTop: lines[0], arcBottom: lines[1], lines: lines.slice(2) } : base;
  return [
    { style: 'minimal', title: 'Minimal', content: base },
    { style: 'classic', title: 'Classic', content: round ? roundContent : base },
    { style: 'modern', title: 'Modern', content: base },
  ];
}
