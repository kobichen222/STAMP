export const STORAGE_KEY = 's2g-a11y';

export const TEXT_SCALES = [1, 1.15, 1.3, 1.5, 1.75] as const;

export interface A11ySettings {
  text: number; // index into TEXT_SCALES
  lineHeight: number; // 0–3
  letter: number; // 0–3
  word: number; // 0–2
  font: '' | 'readable' | 'dyslexia';
  align: '' | 'right' | 'center' | 'left';
  contrast: '' | 'dark' | 'light' | 'high';
  filter: '' | 'mono' | 'lowsat' | 'highsat' | 'invert';
  links: boolean;
  headings: boolean;
  focus: boolean;
  cursor: '' | 'dark' | 'light';
  guide: boolean;
  mask: boolean;
  motion: boolean; // true = animations stopped
  images: boolean; // true = images hidden
  tts: boolean;
  magnifier: boolean;
  keyboard: boolean;
  profile: '' | ProfileId;
  // Menu preferences (not page adjustments)
  side: 'left' | 'right';
  bigUi: boolean;
}

export const DEFAULTS: A11ySettings = {
  text: 0,
  lineHeight: 0,
  letter: 0,
  word: 0,
  font: '',
  align: '',
  contrast: '',
  filter: '',
  links: false,
  headings: false,
  focus: false,
  cursor: '',
  guide: false,
  mask: false,
  motion: false,
  images: false,
  tts: false,
  magnifier: false,
  keyboard: false,
  profile: '',
  side: 'left',
  bigUi: false,
};

/** Settings mirrored to <html data-a11y-*> (CSS hooks; also set before paint by the boot script). */
export const ATTRS: Partial<Record<keyof A11ySettings, string>> = {
  lineHeight: 'data-a11y-lh',
  letter: 'data-a11y-ls',
  word: 'data-a11y-ws',
  font: 'data-a11y-font',
  align: 'data-a11y-align',
  contrast: 'data-a11y-contrast',
  filter: 'data-a11y-filter',
  links: 'data-a11y-links',
  headings: 'data-a11y-headings',
  focus: 'data-a11y-focus',
  cursor: 'data-a11y-cursor',
  images: 'data-a11y-images',
  tts: 'data-a11y-tts',
};

export type ProfileId = 'vision' | 'seizure' | 'adhd' | 'cognitive' | 'dyslexia' | 'keyboard';

export const PROFILES: Record<ProfileId, { label: string; description: string; settings: Partial<A11ySettings> }> = {
  vision: {
    label: 'לקות ראייה',
    description: 'טקסט גדול, ניגודיות וגופן קריא',
    settings: { text: 2, font: 'readable', contrast: 'high', links: true, headings: true, focus: true, cursor: 'dark' },
  },
  seizure: {
    label: 'בטוח לאפילפסיה',
    description: 'עוצר אנימציות ומפחית צבעים',
    settings: { motion: true, filter: 'lowsat' },
  },
  adhd: {
    label: 'הפרעת קשב (ADHD)',
    description: 'מסכת קריאה ופחות הסחות',
    settings: { motion: true, mask: true, filter: 'lowsat' },
  },
  cognitive: {
    label: 'לקות קוגניטיבית',
    description: 'הדגשות, הקראה וסרגל קריאה',
    settings: { text: 1, font: 'readable', links: true, headings: true, guide: true, tts: true, motion: true },
  },
  dyslexia: {
    label: 'דיסלקציה',
    description: 'גופן, ריווח וגובה שורה',
    settings: { font: 'dyslexia', letter: 1, word: 1, lineHeight: 1, guide: true },
  },
  keyboard: {
    label: 'ניווט במקלדת',
    description: 'קיצורים והדגשת פוקוס',
    settings: { keyboard: true, focus: true },
  },
};

/**
 * Inline script for <head>: restores the CSS-driven adjustments before the
 * first paint, so a returning visitor never sees the page "flash" unadjusted.
 */
export const BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||'null');if(!s)return;var m=${JSON.stringify(
  { ...ATTRS, motion: 'data-a11y-motion' },
)},e=document.documentElement;for(var k in m){var v=s[k];if(k==='motion'){if(v)e.setAttribute(m[k],'off');continue}if(v&&v!==0)e.setAttribute(m[k],v===true?'1':String(v))}}catch(_){}})();`;
