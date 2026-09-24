import type { LayoutContent, LayoutStyle } from './compose';
import { sampleLogo } from './sampleLogos';

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
  { id: 'company-logo', name: 'חברה עם לוגו', category: 'company', style: 'classic', withLogo: true, content: { lines: ['שם החברה בע״מ', 'ח.פ. 512345678', 'טל׳ 03-1234567'], logo: sampleLogo('building') } },
  { id: 'company-round', name: 'חברה – עגולה', category: 'company', style: 'classic', shape: 'round', content: { arcTop: 'שם החברה בע״מ', arcBottom: 'ח.פ. 512345678', lines: ['חותמת החברה'] } },
  { id: 'business-address', name: 'עסק – כתובת וטלפון', category: 'business', style: 'classic', content: { lines: ['שם העסק', 'רחוב הדוגמה 10, רמת גן', 'טל׳ 03-1234567', 'www.example.co.il'] } },
  { id: 'business-modern', name: 'עסק – מודרני', category: 'business', style: 'modern', content: { lines: ['שם העסק', 'עוסק מורשה 012345678', '050-1234567'] } },
  { id: 'business-minimal', name: 'עסק – מינימלי', category: 'business', style: 'minimal', content: { lines: ['שם העסק', '050-1234567'] } },
  { id: 'private-name', name: 'שם וכתובת', category: 'private', style: 'minimal', content: { lines: ['משפחת ישראלי', 'רחוב הדוגמה 10, רמת גן'] } },
  { id: 'private-book', name: 'מספריית…', category: 'private', style: 'classic', shape: 'round', content: { arcTop: 'מספרייתו של', arcBottom: 'ישראל ישראלי', lines: [] } },
  { id: 'signature', name: 'חתימה', category: 'signature', style: 'minimal', content: { lines: ['ישראל ישראלי', 'ת.ז. 012345678'] } },
  { id: 'logo-only', name: 'לוגו בלבד', category: 'logo', style: 'minimal', withLogo: true, content: { lines: [], logo: sampleLogo('star-badge') } },
  { id: 'logo-text', name: 'לוגו + טקסט', category: 'logo', style: 'modern', withLogo: true, content: { lines: ['שם העסק', 'www.example.co.il'], logo: sampleLogo('leaf') } },
  { id: 'round-approved', name: 'שולם / מאושר', category: 'round', style: 'classic', shape: 'round', content: { arcTop: 'שם העסק', arcBottom: 'תאריך', lines: ['שולם'] } },
  // ---- More templates: professions, businesses and logo layouts
  { id: 'dentist-logo', name: 'רופא שיניים + לוגו', category: 'doctor', style: 'modern', withLogo: true, content: { lines: ['ד״ר ישראל ישראלי', 'רופא שיניים', 'מ.ר. 12345'], logo: sampleLogo('tooth') } },
  { id: 'vet-logo', name: 'וטרינר + לוגו', category: 'doctor', style: 'classic', withLogo: true, content: { lines: ['ד״ר ישראל ישראלי', 'רופא וטרינר', 'מ.ר. 1234'], logo: sampleLogo('paw') } },
  { id: 'clinic-round', name: 'מרפאה – עגולה', category: 'doctor', style: 'classic', shape: 'round', withLogo: true, content: { arcTop: 'מרפאת הדוגמה', arcBottom: 'טל׳ 03-1234567', lines: [], logo: sampleLogo('medical') } },
  { id: 'psychologist', name: 'פסיכולוגית', category: 'doctor', style: 'minimal', content: { lines: ['ד״ר ישראלה ישראלי', 'פסיכולוגית קלינית', 'מ.ר. 27-12345'] } },
  { id: 'lawyer-scales', name: 'עורך דין + מאזניים', category: 'lawyer', style: 'classic', withLogo: true, content: { lines: ['עו״ד ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345'], logo: sampleLogo('scales') } },
  { id: 'lawyer-scales-round', name: 'עורך דין – עגולה עם מאזניים', category: 'lawyer', style: 'classic', shape: 'round', withLogo: true, content: { arcTop: 'ישראל ישראלי', arcBottom: 'עורך דין ונוטריון', lines: [], logo: sampleLogo('scales') } },
  { id: 'true-copy', name: 'נאמן למקור', category: 'lawyer', style: 'classic', content: { lines: ['נאמן למקור', 'עו״ד ישראל ישראלי', 'מ.ר. 12345'] } },
  { id: 'accountant', name: 'רואה חשבון', category: 'business', style: 'classic', content: { lines: ['ישראל ישראלי, רו״ח', 'ייעוץ מס והנהלת חשבונות', 'טל׳ 03-1234567'] } },
  { id: 'engineer', name: 'מהנדס', category: 'business', style: 'modern', content: { lines: ['ישראל ישראלי', 'מהנדס בניין', 'מ.ר. 123456'] } },
  { id: 'realty-logo', name: 'תיווך נדל״ן + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['שם המשרד – נדל״ן', 'רישיון תיווך 3123456', '050-1234567'], logo: sampleLogo('house') } },
  { id: 'cafe-logo', name: 'בית קפה + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['שם בית הקפה', 'רחוב הדוגמה 10, תל אביב'], logo: sampleLogo('cup') } },
  { id: 'cafe-round', name: 'בית קפה – עגולה', category: 'business', style: 'classic', shape: 'round', withLogo: true, content: { arcTop: 'שם בית הקפה', arcBottom: 'תל אביב', lines: [], logo: sampleLogo('cup') } },
  { id: 'garage-logo', name: 'מוסך / טכנאי + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['מוסך הדוגמה', 'תיקון ושירות לכל סוגי הרכב', '03-1234567'], logo: sampleLogo('gear') } },
  { id: 'boutique-logo', name: 'בוטיק + לוגו', category: 'business', style: 'classic', withLogo: true, content: { lines: ['בוטיק הדוגמה', 'אופנה ואקססוריז'], logo: sampleLogo('crown') } },
  { id: 'eco-logo', name: 'טבע ובריאות + לוגו', category: 'business', style: 'minimal', withLogo: true, content: { lines: ['שם העסק', 'מוצרים טבעיים', 'www.example.co.il'], logo: sampleLogo('leaf') } },
  { id: 'company-building', name: 'חברה – בניין + כתובת', category: 'company', style: 'modern', withLogo: true, content: { lines: ['שם החברה בע״מ', 'ח.פ. 512345678', 'רח׳ הברזל 3, תל אביב'], logo: sampleLogo('building') } },
  { id: 'school-logo', name: 'בית ספר / גן + לוגו', category: 'company', style: 'classic', withLogo: true, content: { lines: ['בית ספר הדוגמה', 'מזכירות', 'טל׳ 03-1234567'], logo: sampleLogo('book') } },
  { id: 'received-round', name: 'התקבל – עגולה', category: 'round', style: 'classic', shape: 'round', content: { arcTop: 'שם העסק בע״מ', arcBottom: 'ח.פ. 512345678', lines: ['התקבל'] } },
  { id: 'return-address', name: 'כתובת למשלוח', category: 'private', style: 'classic', content: { lines: ['משפחת ישראלי', 'רחוב הדוגמה 10', 'רמת גן 5250000'] } },
  { id: 'teacher-star', name: 'מורה – כל הכבוד!', category: 'private', style: 'modern', withLogo: true, content: { lines: ['כל הכבוד!', 'המורה נועה'], logo: sampleLogo('star-badge') } },
  { id: 'kid-name', name: 'שם לציוד ילדים', category: 'private', style: 'minimal', content: { lines: ['נועה ישראלי', 'כיתה ב׳ 2'] } },
  // ---- Round 3: services, trades and office stamps
  { id: 'salon-logo', name: 'מספרה + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['מספרת הדוגמה', 'עיצוב שיער לנשים ולגברים', '052-1234567'], logo: sampleLogo('scissors') } },
  { id: 'salon-round', name: 'מספרה – עגולה', category: 'business', style: 'classic', shape: 'round', withLogo: true, content: { arcTop: 'מספרת הדוגמה', arcBottom: 'רמת גן', lines: [], logo: sampleLogo('scissors') } },
  { id: 'photo-logo', name: 'צלם + לוגו', category: 'business', style: 'minimal', withLogo: true, content: { lines: ['סטודיו לצילום', 'ישראל ישראלי', 'www.example.co.il'], logo: sampleLogo('camera') } },
  { id: 'locksmith-logo', name: 'מנעולן + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['פורץ מנעולים', 'שירות 24/7', '050-1234567'], logo: sampleLogo('key') } },
  { id: 'nonprofit-logo', name: 'עמותה + לוגו', category: 'company', style: 'classic', withLogo: true, content: { lines: ['עמותת הדוגמה (ע״ר)', 'ע״ר 580123456'], logo: sampleLogo('heart') } },
  { id: 'insurance-logo', name: 'סוכן ביטוח + לוגו', category: 'business', style: 'classic', withLogo: true, content: { lines: ['ישראל ישראלי', 'סוכן ביטוח מורשה', 'רישיון 1234567'], logo: sampleLogo('shield') } },
  { id: 'garden-logo', name: 'גנן + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['גינון הדוגמה', 'עיצוב ואחזקת גינות', '054-1234567'], logo: sampleLogo('tree') } },
  { id: 'plumber-logo', name: 'אינסטלטור + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['שרברב הדוגמה', 'אינסטלציה ותיקונים', '050-1234567'], logo: sampleLogo('wrench') } },
  { id: 'travel-logo', name: 'סוכנות נסיעות + לוגו', category: 'business', style: 'minimal', withLogo: true, content: { lines: ['סוכנות נסיעות הדוגמה', 'טל׳ 03-1234567'], logo: sampleLogo('plane') } },
  { id: 'music-logo', name: 'מורה למוזיקה + לוגו', category: 'private', style: 'modern', withLogo: true, content: { lines: ['בית ספר למוזיקה', 'המורה נועה ישראלי'], logo: sampleLogo('note') } },
  { id: 'bakery-logo', name: 'מאפייה + לוגו', category: 'business', style: 'classic', withLogo: true, content: { lines: ['מאפיית הדוגמה', 'רחוב הדוגמה 5, חולון'], logo: sampleLogo('cake') } },
  { id: 'bakery-round', name: 'מאפייה – עגולה', category: 'business', style: 'classic', shape: 'round', withLogo: true, content: { arcTop: 'מאפיית הדוגמה', arcBottom: 'כשר למהדרין', lines: [], logo: sampleLogo('cake') } },
  { id: 'gym-logo', name: 'מכון כושר + לוגו', category: 'business', style: 'modern', withLogo: true, content: { lines: ['מכון כושר הדוגמה', 'אימונים אישיים', '050-1234567'], logo: sampleLogo('dumbbell') } },
  { id: 'tutor-logo', name: 'מורה פרטי + לוגו', category: 'private', style: 'classic', withLogo: true, content: { lines: ['ישראל ישראלי', 'מורה פרטי למתמטיקה', '052-1234567'], logo: sampleLogo('cap') } },
  { id: 'pharmacy-logo', name: 'בית מרקחת + לוגו', category: 'doctor', style: 'classic', withLogo: true, content: { lines: ['בית מרקחת הדוגמה', 'רוקח אחראי: ישראל ישראלי'], logo: sampleLogo('medical') } },
  { id: 'company-round-logo', name: 'חברה – עגולה עם לוגו', category: 'company', style: 'classic', shape: 'round', withLogo: true, content: { arcTop: 'שם החברה בע״מ', arcBottom: 'ח.פ. 512345678', lines: [], logo: sampleLogo('building') } },
  { id: 'notary-round', name: 'נוטריון – עגולה', category: 'lawyer', style: 'classic', shape: 'round', content: { arcTop: 'ישראל ישראלי, נוטריון', arcBottom: 'רישיון נוטריון 1234', lines: ['נוטריון'] } },
  { id: 'paid-rect', name: 'שולם + תאריך', category: 'business', style: 'minimal', content: { lines: ['שולם', 'תאריך: __________'] } },
  { id: 'copy-rect', name: 'העתק', category: 'business', style: 'classic', content: { lines: ['העתק'] } },
  { id: 'confidential', name: 'סודי', category: 'business', style: 'modern', content: { lines: ['סודי', 'לשימוש פנימי בלבד'] } },
];
