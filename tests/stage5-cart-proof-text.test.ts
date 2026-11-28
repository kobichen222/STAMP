/** The proof's text lines: a bot line read from its form, a designer line from its text elements, and what reads as nothing. */
import { describe, expect, it } from 'vitest';
import type { Design, TextElement } from '@/designer/types';
import { cleanForm, structure, TEMPLATES, WRITTEN, type Form } from '@/stamp-bot/form';
import { stampProofText } from '@/lib/stamp-proof-text';

const botDesign = (form: unknown): Design => ({
  version: 1,
  modelId: 'm',
  shape: 'rect',
  width: 47,
  height: 18,
  border: { style: 'none', thickness: 0, inset: 0, gap: 0 },
  elements: [],
  inkColor: 'black',
  bot: { form: typeof form === 'string' ? form : JSON.stringify(form) },
});

// what the bot really prints, from the drawing code's own `structure`, with the fields after the lines
const printed = (f: Form) => [...structure(f).map((b) => b.text), ...f.fields.map((x) => `${x.replace(/:$/, '')}: __________`)];

const tail = { address: 'הרצל 12, תל אביב', phones: ['0501234567', '035551234'], email: 'a@b.co.il', web: 'www.b.co.il', extra: ['פתוח א-ה'] };
const fullSlots: Record<string, string> = {
  name: 'ישראל ישראלי',
  english: 'Israel Israeli',
  signer: 'משה כהן',
  position: 'מנכ"ל',
  number: '51-690001-6',
  kind: 'ע.מ.',
  title: 'עו"ד ונוטריון',
  license: '12 345',
  specialty: 'רפואת משפחה',
  specialist: '6789',
  profession: 'מהנדס',
  org: 'עיריית חיפה',
  building: 'בית הכרמל',
  word: 'שולם',
};

describe('a bot line', () => {
  it.each(TEMPLATES.map((t) => t.id))('template %s reads line for line as the bot prints it', (tmpl) => {
    const f = cleanForm({ tmpl, slots: fullSlots, tail, fields: ['תאריך', 'חתימה'] });
    const lines = stampProofText(botDesign(f));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines).toEqual(printed(f));
  });

  it.each(TEMPLATES.map((t) => t.id))('template %s with only the needed slots filled', (tmpl) => {
    const f = cleanForm({ tmpl, slots: { name: 'דנה לוי', profession: 'שמאית', position: 'מנהלת', word: 'התקבל' } });
    expect(stampProofText(botDesign(f))).toEqual(printed(f));
  });

  it('every kind of stamp (rect, status, round, square) reads the same way', () => {
    for (const kind of ['rect', 'status', 'round', 'square']) {
      const f = cleanForm({ tmpl: 'lawyer', kind, slots: { name: 'רונית כץ', license: '54321' }, tail: { phones: ['0521112233'] } });
      expect(stampProofText(botDesign(f))).toEqual(['רונית כץ, עו"ד', 'מ.ר. 54321', 'טל. 052-1112233']);
    }
  });

  it('a stamp written exactly as the customer wrote it, with its fields', () => {
    const f = cleanForm({ tmpl: WRITTEN, written: [{ text: 'מאפיית השכונה', level: 1 }, { text: 'ח.פ. 515555555', level: 3 }], fields: ['תאריך:'] });
    expect(stampProofText(botDesign(f))).toEqual(['מאפיית השכונה', 'ח.פ. 515555555', 'תאריך: __________']);
    expect(stampProofText(botDesign(f))).toEqual(printed(f));
  });

  it('keeps digits exactly, so a wrong digit can be seen', () => {
    const f = cleanForm({ tmpl: 'company', slots: { name: 'אבא חותמות בע"מ', number: '515678901' } });
    expect(stampProofText(botDesign(f))).toEqual(['אבא חותמות בע"מ', 'ח.פ. 515678901']);
  });

  it('an empty needed slot shows its label, as on the drawing', () => {
    const f = cleanForm({ tmpl: 'employee', slots: { name: 'יוסי' } });
    expect(stampProofText(botDesign(f))).toEqual(printed(f));
    expect(stampProofText(botDesign(f))).toContain('תפקיד');
  });

  it('a form that cannot be read gives no lines', () => {
    expect(stampProofText(botDesign('not json {'))).toEqual([]);
    expect(stampProofText(botDesign('null'))).toEqual([]);
    expect(stampProofText(botDesign('[1,2]'))).toEqual([]);
    expect(stampProofText(botDesign({ tmpl: 'no-such-template', slots: { name: 'x' } }))).toEqual([]);
  });
});

const text = (t: string, y: number, extra: Partial<TextElement> = {}): TextElement => ({
  id: `t${y}${t}`,
  type: 'text',
  text: t,
  x: 20,
  y,
  rotation: 0,
  font: 'Heebo',
  bold: false,
  size: 10,
  align: 'center',
  letterSpacing: 0,
  lineHeight: 1.2,
  maxWidth: 0,
  ...extra,
});
const designer = (elements: Design['elements'], shape: Design['shape'] = 'rect'): Design => ({
  version: 1,
  modelId: 'm',
  shape,
  width: 40,
  height: 40,
  border: { style: 'rect', thickness: 0.4, inset: 1, gap: 0 },
  elements,
  inkColor: 'blue',
});

describe('a designer line', () => {
  it('reads the text elements top to bottom, one row per line of text, skipping hidden text and other elements', () => {
    const d = designer([
      text('טל. 03-5551234', 30),
      { id: 's', type: 'shape', kind: 'line', x: 20, y: 20, rotation: 0, width: 30, height: 0, stroke: 0.3, filled: false },
      text('ישראל ישראלי\nעו"ד', 8),
      text('מוסתר', 15, { hidden: true }),
      text('   ', 18),
      text('מ.ר. 12345', 22),
    ]);
    expect(stampProofText(d)).toEqual(['ישראל ישראלי', 'עו"ד', 'מ.ר. 12345', 'טל. 03-5551234']);
  });

  it('a round seal: the top arc first, the centre, then the bottom arc', () => {
    const d = designer(
      [
        text('תחתון', 20, { curve: { radius: 16, position: 'bottom' } }),
        text('מרכז', 20),
        text('עליון', 20, { curve: { radius: 16, position: 'top' } }),
      ],
      'round',
    );
    expect(stampProofText(d)).toEqual(['עליון', 'מרכז', 'תחתון']);
  });
});

describe('nothing to read', () => {
  it('an empty design, or none at all', () => {
    expect(stampProofText(designer([]))).toEqual([]);
    expect(stampProofText(null)).toEqual([]);
    expect(stampProofText(undefined)).toEqual([]);
    expect(stampProofText({} as Design)).toEqual([]);
  });
});
