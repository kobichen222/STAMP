import { parse, type Font, type Glyph } from 'opentype.js';

/**
 * Fonts available in the designer. Every family ships as Hebrew + Latin WOFF
 * subsets (from Fontsource, SIL Open Font License) in /public/fonts/stamp.
 * Glyphs are converted to outlines, so the production file never depends on
 * fonts being installed on the CorelDRAW workstation.
 */
export interface FontFamily {
  id: string;
  label: string;
  file: string; // file prefix in /public/fonts/stamp
  bold: boolean; // has a 700 weight
  css: string; // CSS family used for the UI font picker
}

export const FONT_FAMILIES: FontFamily[] = [
  { id: 'heebo', label: 'Heebo (היבו)', file: 'heebo', bold: true, css: 'Heebo, Arial, sans-serif' },
  { id: 'assistant', label: 'Assistant (אסיסטנט)', file: 'assistant', bold: true, css: 'Assistant, Arial, sans-serif' },
  { id: 'rubik', label: 'Rubik (רוביק)', file: 'rubik', bold: true, css: 'Rubik, Arial, sans-serif' },
  { id: 'alef', label: 'Alef (אלף)', file: 'alef', bold: true, css: 'Alef, Arial, sans-serif' },
  { id: 'frank-ruhl-libre', label: 'Frank Ruhl (פרנק רוהל)', file: 'frank-ruhl-libre', bold: true, css: '"Frank Ruhl Libre", serif' },
  { id: 'david-libre', label: 'David (דוד)', file: 'david-libre', bold: true, css: '"David Libre", serif' },
  { id: 'secular-one', label: 'Secular One (סקולר)', file: 'secular-one', bold: false, css: '"Secular One", sans-serif' },
  { id: 'suez-one', label: 'Suez One (סואץ)', file: 'suez-one', bold: false, css: '"Suez One", serif' },
];

export const DEFAULT_FONT = 'heebo';

/** One font face = Hebrew subset + Latin subset of the same family/weight. */
export interface FontFace {
  key: string;
  subsets: Font[];
  unitsPerEm: number;
  capHeight: number; // in em units
  ascender: number;
  descender: number;
}

export type FontLoader = (url: string) => Promise<ArrayBuffer>;

const browserLoader: FontLoader = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font load failed: ${url}`);
  return res.arrayBuffer();
};

const cache = new Map<string, Promise<FontFace>>();

export function faceKey(family: string, bold: boolean) {
  const fam = FONT_FAMILIES.find((f) => f.id === family) ?? FONT_FAMILIES[0];
  return `${fam.id}-${bold && fam.bold ? 700 : 400}`;
}

export function loadFace(family: string, bold: boolean, loader: FontLoader = browserLoader, base = '/fonts/stamp'): Promise<FontFace> {
  const key = faceKey(family, bold);
  let p = cache.get(key);
  if (!p) {
    const fam = FONT_FAMILIES.find((f) => f.id === family) ?? FONT_FAMILIES[0];
    const weight = bold && fam.bold ? 700 : 400;
    p = Promise.all(['hebrew', 'latin'].map((s) => loader(`${base}/${fam.file}-${s}-${weight}-normal.woff`).then((b) => parse(b)))).then(
      (subsets) => {
        const f = subsets[0];
        const os2 = f.tables.os2 as { sCapHeight?: number } | undefined;
        return {
          key,
          subsets,
          unitsPerEm: f.unitsPerEm,
          capHeight: (os2?.sCapHeight || f.ascender * 0.7) / f.unitsPerEm,
          ascender: f.ascender / f.unitsPerEm,
          descender: f.descender / f.unitsPerEm,
        };
      },
    );
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

/** Glyph for a character, looked up across the Hebrew and Latin subsets. */
export function glyphFor(face: FontFace, ch: string, fallback?: FontFace): { glyph: Glyph; font: Font } | null {
  for (const f of face.subsets) {
    const idx = f.charToGlyphIndex(ch);
    if (idx > 0) return { glyph: f.glyphs.get(idx), font: f };
  }
  if (fallback && fallback !== face) return glyphFor(fallback, ch);
  return null;
}
