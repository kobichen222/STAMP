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

it('numbers with a dash are kept whole (27-54321)', () => {
  expect(extractRequired('מ.ר. 27-54321').map((r) => r.value)).toEqual(['27-54321']);
});

it('typed lines: every suggestion keeps exactly those lines', () => {
  const p = 'ד"ר מיכל אברהם\nרופאת ילדים\nמ.ר. 27-54321';
  for (const s of suggestLocally(p)) expect(s.content.lines).toEqual(['ד"ר מיכל אברהם', 'רופאת ילדים', 'מ.ר. 27-54321']);
});

it('no invented titles', () => {
  const [s] = suggestLocally('חותמת בשם ד"ר מיכל אברהם, מ.ר. 12345');
  expect(s.content.lines.join(' ')).not.toMatch(/מומחה|רופא/);
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

describe('explicit lines – "exactly as I wrote it"', () => {
  it('one line per row, verbatim and in order', async () => {
    const { explicitLines, suggestLocally: s } = await import('@/designer/suggest');
    const p = 'ישראל ישראלי\nעורך דין ונוטריון\nמ.ר. 12345';
    expect(explicitLines(p)).toEqual(['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345']);
    const [first] = s(p);
    expect(first.title).toBe('בדיוק כפי שכתבתם');
    expect(first.content.lines).toEqual(['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345']);
  });
  it('strips bullets and an intro line', async () => {
    const { explicitLines } = await import('@/designer/suggest');
    expect(explicitLines('אני צריך חותמת:\n- יעקב כהן\n- 052-1234567')).toEqual(['יעקב כהן', '052-1234567']);
    expect(explicitLines('שורה 1: שם העסק\nשורה 2: טל׳ 03-1234567')).toEqual(['שם העסק', 'טל׳ 03-1234567']);
  });
  it('separators and prose', async () => {
    const { explicitLines } = await import('@/designer/suggest');
    expect(explicitLines('שם העסק | טל׳ 03-1234567')).toEqual(['שם העסק', 'טל׳ 03-1234567']);
    expect(explicitLines('חותמת לעורך דין בשם יעקב כהן, אתר www.a.co.il/x')).toBeNull();
  });
});
