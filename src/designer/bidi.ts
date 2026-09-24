/**
 * Minimal bidirectional-text reordering for stamp lines.
 *
 * Text is converted to vector outlines glyph by glyph, so we need the *visual*
 * left-to-right glyph order ourselves. This implements the parts of the Unicode
 * Bidi Algorithm that matter for Hebrew stamps: Hebrew runs, embedded Latin
 * words, numbers (phone numbers, license numbers "מ.ר. 12345", dates) and
 * mirrored brackets. Hebrew needs no contextual shaping (final letters are
 * separate code points), so reordering is enough.
 */

type Cls = 'R' | 'L' | 'EN' | 'SEP' | 'N';

const HEBREW = /[֐-׿יִ-ﭏ]/;
const LETTER = /\p{L}/u;
const DIGIT = /[0-9٠-٩]/;
// Separators that stay inside a number: 03-6733770, 12.5, 1/2, 10:30, 1,000
const NUM_SEP = /[-./:,+]/;

const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«' };

function classify(ch: string): Cls {
  if (HEBREW.test(ch)) return 'R';
  if (DIGIT.test(ch)) return 'EN';
  if (LETTER.test(ch)) return 'L';
  if (NUM_SEP.test(ch)) return 'SEP';
  return 'N';
}

export type Direction = 'rtl' | 'ltr';

export function baseDirection(text: string): Direction {
  for (const ch of text) {
    const c = classify(ch);
    if (c === 'R') return 'rtl';
    if (c === 'L') return 'ltr';
  }
  return 'rtl';
}

/** Returns the characters of `text` in visual (left-to-right) order. */
export function visualOrder(text: string, base: Direction = baseDirection(text)): string[] {
  const chars = Array.from(text);
  const cls = chars.map(classify);

  // A separator between two digits belongs to the number.
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] === 'SEP' && cls[i - 1] === 'EN' && cls[i + 1] === 'EN') cls[i] = 'EN';
    else if (cls[i] === 'SEP') cls[i] = 'N';
  }

  // Strong direction of each char: numbers behave as LTR runs.
  const dir: (Direction | null)[] = cls.map((c) => (c === 'R' ? 'rtl' : c === 'L' || c === 'EN' ? 'ltr' : null));

  // Neutrals take the direction of their surroundings when both sides agree,
  // otherwise the base direction.
  for (let i = 0; i < dir.length; i++) {
    if (dir[i]) continue;
    let j = i;
    while (j < dir.length && !dir[j]) j++;
    const before = i > 0 ? dir[i - 1] : base;
    const after = j < dir.length ? dir[j] : base;
    const d = before === after ? before! : base;
    for (let k = i; k < j; k++) dir[k] = d;
    i = j - 1;
  }

  // Split into runs.
  const runs: { dir: Direction; chars: string[] }[] = [];
  chars.forEach((ch, i) => {
    const last = runs[runs.length - 1];
    if (last && last.dir === dir[i]) last.chars.push(ch);
    else runs.push({ dir: dir[i]!, chars: [ch] });
  });

  const ordered = base === 'rtl' ? runs.reverse() : runs;
  const out: string[] = [];
  for (const run of ordered) {
    if (run.dir === 'rtl') for (let i = run.chars.length - 1; i >= 0; i--) out.push(MIRROR[run.chars[i]] ?? run.chars[i]);
    else out.push(...run.chars);
  }
  return out;
}
