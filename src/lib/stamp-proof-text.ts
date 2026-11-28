// The text of a cart line's stamp as plain lines, top to bottom, for the proof under the picture.
// Plain data only: the bot part reads the templates' JSON and repeats the few rules of `structure` in
// src/stamp-bot/form.ts (that module pulls the catalog into the bundle). tests/stage5-cart-proof-text.test.ts
// checks it line for line against `structure` for every template, so the two cannot drift apart unnoticed.
import type { Design, DesignElement, TextElement } from '@/designer/types';
import type { LineDef, SlotDef, Template } from '@/stamp-bot/form';
import TEMPLATE_DATA from '@/stamp-bot/templates.json';

const TEMPLATES = TEMPLATE_DATA as unknown as Template[];
const WRITTEN = 'written';
/** How a field (a label with a blank to fill in by hand) reads in the proof. */
const FIELD_BLANK = '__________';

export function stampProofText(design: Design | null | undefined): string[] {
  if (!design || typeof design !== 'object') return [];
  if (design.bot) return botLines(design.bot.form);
  return designerLines(design.elements);
}

// ---- a line from the stamp bot ----

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
const text = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim() : '');
const texts = (v: unknown) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
const digits = (s: string) => s.replace(/\D/g, '');

// the same formatting as numberText / phoneText in form.ts
const numberText = (n: string) => (/-/.test(n) ? n.replace(/\s/g, '') : digits(n));
function phoneText(p: string) {
  const d = digits(p);
  if (/^0(5\d|7\d)\d{7}$/.test(d)) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (/^0[2-9]\d{7}$/.test(d)) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return p;
}

const keysOf = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

function botLines(json: unknown): string[] {
  let form: Record<string, unknown>;
  try {
    form = obj(JSON.parse(String(json)));
  } catch {
    return [];
  }
  const fields = (list: string[]) => list.map((f) => `${f.replace(/:$/, '')}: ${FIELD_BLANK}`);

  if (form.tmpl === WRITTEN) {
    const written = (Array.isArray(form.written) ? form.written : []).map((w) => text(typeof w === 'string' ? w : obj(w).text)).filter(Boolean);
    return [...written, ...fields(texts(form.fields))];
  }

  // an unknown template cannot be read reliably: show nothing rather than a guess
  const tpl = TEMPLATES.find((t) => t.id === form.tmpl);
  if (!tpl) return [];
  const slots = obj(form.slots);
  const value = (s: SlotDef) => {
    const v = text(slots[s.key]);
    return s.type === 'number' ? numberText(v) : v;
  };
  const defs = new Map(tpl.slots.map((s) => [s.key, s]));
  const out: string[] = [];

  for (const line of tpl.lines) {
    const filled = fillLine(line, defs, value);
    if (filled) out.push(filled);
  }

  const tail = obj(form.tail);
  const take = (p: string) => (tpl.tail as string[]).includes(p);
  const address = text(tail.address);
  const phones = texts(tail.phones);
  const email = text(tail.email);
  const web = text(tail.web);
  if (take('address') && address) out.push(address);
  if (take('phones') && phones.length) out.push('טל. ' + phones.map(phoneText).join(' | '));
  if (take('email') && email) out.push(email);
  if (take('web') && web) out.push(web);
  if (take('extra')) out.push(...texts(tail.extra));
  if (take('fields')) out.push(...fields(texts(form.fields)));
  return out;
}

// one template line filled in, or null when it does not print (the rules of fillLine in form.ts)
function fillLine(line: LineDef, defs: Map<string, SlotDef>, value: (s: SlotDef) => string): string | null {
  const req = line.req ? defs.get(line.req) : undefined;
  if (line.req && (!req || !value(req))) return null;
  let keyed = 0;
  const parts: string[] = [];
  for (const part of line.parts) {
    const keys = keysOf(part);
    let t = part;
    let empty = false;
    for (const k of keys) {
      const def = defs.get(k);
      let v = def ? value(def) : '';
      if (!v && def?.need) v = def.label;
      if (!v) empty = true;
      t = t.replace(`{${k}}`, v);
    }
    if (keys.length && empty) continue;
    if (keys.length) keyed++;
    parts.push(t);
  }
  if (line.parts.some((p) => keysOf(p).length) && !keyed) return null;
  return parts.join(' ');
}

// ---- a line from the designer ----

function designerLines(elements: DesignElement[] | undefined): string[] {
  if (!Array.isArray(elements)) return [];
  const shown = elements.filter((e): e is TextElement => e?.type === 'text' && !e.hidden && typeof e.text === 'string' && !!e.text.trim());
  // text on a curve is placed around its centre (x, y): the top arc reads above it, the bottom arc below
  const top = (e: TextElement) => (e.curve ? e.y + (e.curve.position === 'top' ? -1 : 1) * e.curve.radius : e.y);
  return shown
    .map((e, i) => ({ e, i, y: top(e) }))
    .sort((a, b) => a.y - b.y || b.e.x - a.e.x || a.i - b.i)
    .flatMap(({ e }) => e.text.split(/\r?\n/))
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
