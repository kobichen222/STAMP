import type { LayoutContent, LayoutStyle } from './compose';

export interface Suggestion {
  style: LayoutStyle;
  title: string;
  content: LayoutContent;
}

const PROFESSIONS: { match: RegExp; title: string; extra: string[] }[] = [
  { match: /עורכ?ת?\s*דין|עו"?״?ד|נוטריון/, title: 'עורך דין', extra: ['מ.ר. 00000'] },
  { match: /רופא|ד"?״?ר|רפוא/, title: 'רופא מומחה', extra: ['מ.ר. 00000'] },
  { match: /רו"?״?ח|רואה חשבון/, title: 'רואה חשבון', extra: ['מ.ר. 00000'] },
  { match: /מהנדס/, title: 'מהנדס', extra: ['מ.ר. 00000'] },
  { match: /חבר[הת]|בע"?״?מ/, title: 'חברה בע״מ', extra: ['ח.פ. 500000000'] },
  { match: /עסק|עוסק/, title: 'עוסק מורשה', extra: ['ע.מ. 000000000'] },
];

/**
 * Rule-based fallback for the AI assistant (works offline / without an API key):
 * pulls a name, profession, phone and ID numbers out of a free-text request.
 */
export function suggestLocally(prompt: string): Suggestion[] {
  const text = prompt.replace(/\s+/g, ' ').trim();
  const name = /(?:בשם|של|עבור)\s+([֐-׿'"״׳-]+(?:\s+[֐-׿'"״׳-]+){0,2})/.exec(text)?.[1]?.replace(/[,.]$/, '') ?? 'ישראל ישראלי';
  const prof = PROFESSIONS.find((p) => p.match.test(text));
  const phone = /0\d{1,2}[-\s]?\d{7}|0\d{1,2}-\d{3}-\d{4}/.exec(text)?.[0];
  const license = /(?:רישיון|מ\.?ר\.?|מספר)\s*(\d{3,9})/.exec(text)?.[1];
  const wantsPhone = /טלפון|נייד|phone/.test(text) || !!phone;
  const wantsLicense = /רישיון|מ\.ר|מספר רישיון/.test(text) || !!license;
  const round = /עגול/.test(text);

  const lines = [name];
  if (prof) lines.push(prof.title);
  if (wantsLicense || prof?.extra) lines.push(license ? `מ.ר. ${license}` : (prof?.extra[0] ?? 'מ.ר. 00000'));
  if (wantsPhone) lines.push(phone ? `טל׳ ${phone}` : 'טל׳ 050-0000000');

  const base: LayoutContent = { lines };
  const roundContent: LayoutContent = { arcTop: name, arcBottom: prof?.title ?? lines[lines.length - 1], lines: lines.slice(2, 4) };
  return [
    { style: 'minimal', title: 'Minimal', content: base },
    { style: 'classic', title: 'Classic', content: round ? roundContent : base },
    { style: 'modern', title: 'Modern', content: { lines: prof ? [`${prof.title === 'עורך דין' ? 'עו״ד ' : prof.title === 'רופא מומחה' ? 'ד״ר ' : ''}${name}`, ...lines.slice(2)] : lines } },
  ];
}
