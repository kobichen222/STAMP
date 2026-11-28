// the SAMPLE imprint of every body on the home catalog: one fixed form per body id (bodies.ts), drawn by the bot's own
// engine at build time (/api/stamp-sample/[id]). the kind and size come from the body, the ink is black, the look is
// the kind's default. the texts are made up on purpose - generic names, example numbers, nothing that is a real business
import type { Tail } from './form'

export type SampleForm = { tmpl: string; slots: Record<string, string>; tail?: Partial<Tail> }

const ADDRESS = "רח' הדוגמה 1, תל אביב"
const PHONE = '031234567'
const MOBILE = '0501234567'
const EMAIL = 'office@example.co.il'
const LICENSE = '12345'
const COMPANY = 'חברה לדוגמה בע"מ'
const COMPANY_NO = '512345678'

export const SAMPLES: Record<string, SampleForm> = {
  // rect 38x14 - three bodies of one size, each with another profession so the cards do not look cloned
  'print-20': { tmpl: 'licensed', slots: { name: 'ישראל ישראלי', profession: 'רואה חשבון' }, tail: { phones: [PHONE] } },
  mouse: { tmpl: 'doctor', slots: { name: 'אבי כהן', specialty: 'רפואת משפחה', license: LICENSE } },
  slider: { tmpl: 'employee', slots: { name: 'משה לוי', position: 'מנהל רכש', org: COMPANY } },
  // the bigger rect bodies: the name line is long on purpose, so the ink fills the stamp's width as it does on the
  // 38x14 bodies. the engine sets a line by its height, so a short name leaves a big stamp looking narrower than a
  // small one (a test fails when a bigger body's text comes out narrower on the card than a smaller body's)
  // rect 47x18
  'print-30': { tmpl: 'licensed', slots: { name: 'אלכסנדר ישראלי', profession: 'מהנדס בניין', license: LICENSE }, tail: { phones: [PHONE] } },
  // rect 58x22 and up
  'print-40': { tmpl: 'doctor', slots: { name: 'יעל כהן ישראלי', specialty: 'רופאת שיניים', license: LICENSE }, tail: { address: ADDRESS, phones: [PHONE] } },
  'print-50': { tmpl: 'licensed', slots: { name: 'ישראל ישראלי אדריכלים', profession: 'תכנון ועיצוב פנים', license: LICENSE }, tail: { address: ADDRESS, phones: [PHONE, MOBILE], email: EMAIL } },
  'print-60': { tmpl: 'company', slots: { name: 'חברה לדוגמה ישראל בע"מ', signer: 'אבי כהן', position: 'מנכ"ל', number: COMPANY_NO }, tail: { address: ADDRESS, phones: [PHONE, MOBILE], email: EMAIL } },
  // round
  'r-530': { tmpl: 'company', slots: { name: COMPANY, number: COMPANY_NO }, tail: { phones: [PHONE] } },
  'r-540': { tmpl: 'lawyer', slots: { name: 'אבי כהן', license: LICENSE }, tail: { address: ADDRESS } },
  'r-550': { tmpl: 'company', slots: { name: COMPANY, signer: 'ישראל ישראלי', position: 'מנהל כללי', number: COMPANY_NO }, tail: { address: ADDRESS, phones: [PHONE] } },
  // square
  'q-530': { tmpl: 'employee', slots: { name: 'דנה לוי', position: 'ממונת בטיחות', org: COMPANY } },
  'q-540': { tmpl: 'licensed', slots: { name: 'משה לוי', profession: 'יועץ מס', license: LICENSE }, tail: { address: ADDRESS, phones: [PHONE] } },
}

// mm of air around the stamp in the sample SVG, the same on every side: a frame on the stamp's edge is never clipped
export const SAMPLE_PAD = 0.5

// the sample SVG's viewBox in mm (the engine's own units are 0.1 mm; the ratio is the same). the card sizes its <img>
// from this, so the two must not drift apart
export function sampleBox(w: number, h: number) {
  return { w: w + 2 * SAMPLE_PAD, h: h + 2 * SAMPLE_PAD }
}
