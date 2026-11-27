/** Example texts behind the chips under the home-page text box (demo names only). */
export interface StampExample {
  id: string;
  label: string;
  lines: string[];
}

export const STAMP_EXAMPLES: StampExample[] = [
  { id: 'lawyer', label: 'עורך דין', lines: ['ישראל ישראלי', 'עורך דין', 'מ.ר. 12345', 'טל׳ 050-1234567'] },
  { id: 'doctor', label: 'רופא', lines: ['ד״ר ישראל ישראלי', 'רופא משפחה', 'מ.ר. 12345'] },
  { id: 'business', label: 'עסק', lines: ['ישראל ישראלי בע״מ', 'ח.פ. 512345678', 'הרצל 1, תל אביב', 'טל׳ 03-1234567'] },
  { id: 'personal', label: 'חותמת אישית', lines: ['ישראל ישראלי', 'הרצל 1, תל אביב', '050-1234567'] },
];
