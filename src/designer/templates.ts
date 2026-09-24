import type { LayoutContent, LayoutStyle } from './compose';

export type TemplateCategory = 'business' | 'doctor' | 'lawyer' | 'company' | 'private' | 'signature' | 'logo' | 'round';

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'business', label: 'עסקי' },
  { id: 'doctor', label: 'רופא' },
  { id: 'lawyer', label: 'עורך דין' },
  { id: 'company', label: 'חברה' },
  { id: 'private', label: 'חותמת פרטית' },
  { id: 'signature', label: 'חתימה' },
  { id: 'logo', label: 'לוגו' },
  { id: 'round', label: 'עגולה' },
];

export interface StampTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  style: LayoutStyle;
  content: LayoutContent;
  /** Needs a logo placeholder. */
  withLogo?: boolean;
  /** Preferred shape; the template still adapts to any model. */
  shape?: 'rect' | 'round';
}

export const TEMPLATES: StampTemplate[] = [
  { id: 'lawyer-classic', name: 'עורך דין – קלאסי', category: 'lawyer', style: 'classic', content: { lines: ['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345', 'טל׳ 03-1234567'] } },
  { id: 'lawyer-modern', name: 'עורך דין – מודרני', category: 'lawyer', style: 'modern', content: { lines: ['עו״ד ישראל ישראלי', 'מ.ר. 12345', 'רח׳ הרצל 1, תל אביב'] } },
  { id: 'lawyer-round', name: 'עורך דין – עגולה', category: 'lawyer', style: 'classic', shape: 'round', content: { arcTop: 'ישראל ישראלי', arcBottom: 'עורך דין', lines: ['מ.ר.', '12345'] } },
  { id: 'doctor-classic', name: 'רופא – קלאסי', category: 'doctor', style: 'classic', content: { lines: ['ד״ר ישראל ישראלי', 'מומחה ברפואת משפחה', 'מ.ר. 12345'] } },
  { id: 'doctor-modern', name: 'רופא – מודרני', category: 'doctor', style: 'modern', content: { lines: ['ד״ר ישראל ישראלי', 'רופא מומחה', 'מ.ר. 12345 · מומחה 6789'] } },
  { id: 'company-logo', name: 'חברה עם לוגו', category: 'company', style: 'classic', withLogo: true, content: { lines: ['שם החברה בע״מ', 'ח.פ. 512345678', 'טל׳ 03-1234567'] } },
  { id: 'company-round', name: 'חברה – עגולה', category: 'company', style: 'classic', shape: 'round', content: { arcTop: 'שם החברה בע״מ', arcBottom: 'ח.פ. 512345678', lines: ['חותמת החברה'] } },
  { id: 'business-address', name: 'עסק – כתובת וטלפון', category: 'business', style: 'classic', content: { lines: ['שם העסק', 'רחוב הדוגמה 10, רמת גן', 'טל׳ 03-1234567', 'www.example.co.il'] } },
  { id: 'business-modern', name: 'עסק – מודרני', category: 'business', style: 'modern', content: { lines: ['שם העסק', 'עוסק מורשה 012345678', '050-1234567'] } },
  { id: 'business-minimal', name: 'עסק – מינימלי', category: 'business', style: 'minimal', content: { lines: ['שם העסק', '050-1234567'] } },
  { id: 'private-name', name: 'שם וכתובת', category: 'private', style: 'minimal', content: { lines: ['משפחת ישראלי', 'רחוב הדוגמה 10, רמת גן'] } },
  { id: 'private-book', name: 'מספריית…', category: 'private', style: 'classic', shape: 'round', content: { arcTop: 'מספרייתו של', arcBottom: 'ישראל ישראלי', lines: [] } },
  { id: 'signature', name: 'חתימה', category: 'signature', style: 'minimal', content: { lines: ['ישראל ישראלי', 'ת.ז. 012345678'] } },
  { id: 'logo-only', name: 'לוגו בלבד', category: 'logo', style: 'minimal', withLogo: true, content: { lines: [] } },
  { id: 'logo-text', name: 'לוגו + טקסט', category: 'logo', style: 'modern', withLogo: true, content: { lines: ['שם העסק', 'www.example.co.il'] } },
  { id: 'round-approved', name: 'שולם / מאושר', category: 'round', style: 'classic', shape: 'round', content: { arcTop: 'שם העסק', arcBottom: 'תאריך', lines: ['שולם'] } },
];
