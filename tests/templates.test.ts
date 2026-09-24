/**
 * Every built-in template must come out production-ready on every product it
 * can be applied to – a customer who only swaps the text should never see
 * "needs fixing".
 */
import { beforeAll, describe, expect, it } from 'vitest';
import site from '../content/site.json';
import { composeForProduction } from '@/designer/autofix';
import { designerModelForProduct } from '@/designer/models';
import { profileForModel } from '@/designer/profiles';
import { renderDesign, type FaceResolver } from '@/designer/render';
import { TEMPLATES } from '@/designer/templates';
import { validateDesign } from '@/designer/validate';
import type { StampModel } from '@/designer/types';
import { loadAllFaces } from './helpers';

let faces: FaceResolver;
beforeAll(async () => {
  faces = await loadAllFaces();
});

const models = new Map<string, StampModel>();
for (const p of (site as { products: Parameters<typeof designerModelForProduct>[0][] }).products) {
  const m = designerModelForProduct(p);
  if (m) models.set(`${m.shape}-${m.width}x${m.height}-${m.dateBand ? 'd' : ''}-${m.maxLines ?? ''}`, m);
}

describe('templates are production-ready on every model', () => {
  it('has models', () => expect(models.size).toBeGreaterThan(5));
  it('no errors', () => {
    const failures: string[] = [];
    for (const m of models.values()) {
      const profile = profileForModel(m);
      for (const t of TEMPLATES) {
        if (t.shape && t.shape !== m.shape) continue;
        // 10mm stamps only fit initials or a logo – a full name can't reach the production minimum.
        if (Math.min(m.width, m.height) < 12) continue;
        const { design: d } = composeForProduction(m, t.content, t.style, faces, profile);
        // Logo-only templates are empty until the customer uploads a logo.
        const errs = validateDesign(d, renderDesign(d, faces), profile).filter((i) => i.severity === 'error' && i.code !== 'empty');
        if (errs.length) failures.push(`${t.id} @ ${m.name} ${m.width}x${m.height}${m.maxLines ? ` (${m.maxLines} lines)` : ''}: ${errs.map((e) => e.code).join(',')}`);
      }
    }
    expect(failures).toEqual([]);
  }, 60_000); // every template × every catalog model
});
