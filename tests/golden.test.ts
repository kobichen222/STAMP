/**
 * Golden files (spec §220): approved production files for key SKUs. Any engine
 * change that alters the output fails here until it is reviewed and the golden
 * files are regenerated with `UPDATE_GOLDEN=1 npm test`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { composeLayout } from '@/designer/compose';
import { toProductionSvg } from '@/designer/production';
import { profileForModel } from '@/designer/profiles';
import { renderDesign, type FaceResolver } from '@/designer/render';
import type { StampModel } from '@/designer/types';
import { loadAllFaces } from './helpers';

const CASES: { id: string; model: StampModel; content: Parameters<typeof composeLayout>[1]; style: 'classic' | 'modern' | 'minimal' }[] = [
  { id: 'print-30-lawyer', model: { id: 'p30', name: 'PRINT 30', shape: 'rect', width: 47, height: 18 }, content: { lines: ['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345', 'טל׳ 03-1234567'] }, style: 'classic' },
  { id: 'print-40-business', model: { id: 'p40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 }, content: { lines: ['שם העסק', 'עוסק מורשה 012345678', '050-1234567'] }, style: 'modern' },
  { id: 'pocket-20', model: { id: 'k20', name: 'כיס 20', shape: 'rect', width: 38, height: 14 }, content: { lines: ['ד״ר ישראל ישראלי', 'מ.ר. 12345'] }, style: 'classic' },
  { id: 'pen-7x35', model: { id: 'pen', name: 'עט', shape: 'rect', width: 35, height: 7 }, content: { lines: ['עו״ד ישראל ישראלי', 'מ.ר. 12345'] }, style: 'minimal' },
  { id: 'round-40-company', model: { id: 'r540', name: 'R 540', shape: 'round', width: 40, height: 40 }, content: { arcTop: 'שם החברה בע״מ', arcBottom: 'ח.פ. 512345678', lines: ['חותמת החברה'] }, style: 'classic' },
  { id: 'dater-41x24', model: { id: 'c4124', name: 'C-4124', shape: 'rect', width: 41, height: 24, dateBand: true }, content: { lines: ['שם העסק', 'התקבל'] }, style: 'classic' },
];

let faces: FaceResolver;
beforeAll(async () => {
  faces = await loadAllFaces();
});

describe('golden production files', () => {
  for (const c of CASES) {
    it(c.id, () => {
      const design = composeLayout(c.model, c.content, c.style);
      const profile = profileForModel(c.model);
      const svg = toProductionSvg(renderDesign(design, faces), { mirror: profile.mirror });
      const file = path.join(__dirname, 'golden', `${c.id}.svg`);
      if (process.env.UPDATE_GOLDEN || !fs.existsSync(file)) fs.writeFileSync(file, svg);
      expect(svg).toBe(fs.readFileSync(file, 'utf8'));
      expect(svg).toContain(`width="${c.model.width}mm" height="${c.model.height}mm"`);
    });
  }
});
