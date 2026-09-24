import { describe, expect, it } from 'vitest';
import { ensureRequired, extractRequired, missingRequired, suggestLocally } from '@/designer/suggest';

const pick = (p: string) => extractRequired(p).map((r) => `${r.kind}:${r.label ? r.label + ' ' : ''}${r.value}`);

describe('extractRequired – every concrete detail the customer wrote', () => {
  it('lawyer with name, licence and phone', () => {
    expect(pick('אני צריך חותמת לעורך דין בשם יעקב כהן, מ.ר. 54321, טלפון 052-1234567')).toEqual(['name:יעקב כהן', 'phone:052-1234567', 'number:מ.ר. 54321']);
  });
  it('company: quoted name, ח.פ., address, e-mail, website', () => {
    const r = pick('חותמת לחברה "אלפא שיווק בע״מ" ח.פ. 514567890, כתובת: הרצל 12, חולון, info@alpha.co.il, www.alpha.co.il');
    expect(r).toContain('quote:אלפא שיווק בע״מ');
    expect(r).toContain('number:ח.פ. 514567890');
    expect(r).toContain('address:הרצל 12, חולון');
    expect(r).toContain('email:info@alpha.co.il');
    expect(r).toContain('url:www.alpha.co.il');
  });
  it('abbreviation quotes (עו"ד) are not treated as quoted text', () => {
    expect(pick('חותמת עו"ד בשם דנה לוי')).toEqual(['name:דנה לוי']);
  });
});

describe('local suggestions keep everything', () => {
  for (const p of [
    'אני צריך חותמת לעורך דין בשם יעקב כהן, מ.ר. 54321, טלפון 052-1234567',
    'חותמת לחברה "אלפא שיווק בע״מ" ח.פ. 514567890, כתובת: הרצל 12, חולון, info@alpha.co.il',
    'חותמת עגולה לרופא בשם ד"ר מיכל אברהם מספר רישיון 12345',
  ]) {
    it(p, () => {
      const req = extractRequired(p);
      for (const s of suggestLocally(p)) expect(missingRequired(s.content, req)).toEqual([]);
    });
  }
});

it('never adds text the customer did not write for a company request', () => {
  const [minimal] = suggestLocally('חותמת לחברה "אלפא שיווק בע״מ" ח.פ. 514567890');
  expect(minimal.content.lines).toEqual(['אלפא שיווק בע״מ', 'ח.פ. 514567890']);
});

describe('ensureRequired', () => {
  it('adds what the AI left out, as lines', () => {
    const req = extractRequired('בשם יעקב כהן, טלפון 052-1234567, ח.פ. 514567890');
    const fixed = ensureRequired({ lines: ['יעקב כהן'] }, req);
    expect(missingRequired(fixed, req)).toEqual([]);
    expect(fixed.lines).toContain('טל׳ 052-1234567');
    expect(fixed.lines).toContain('ח.פ. 514567890');
  });
});
