/**
 * A product the admin hides must not reach any visitor-facing list: its page is a 404. Lists take their products
 * from visibleProducts(), and a new direct read of `site.products` outside the allow-list below fails here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES, productsForCategory } from '@/lib/catalog';
import { site, visibleProducts } from '@/lib/content';
import { allModelsGrid } from '@/lib/summaries';

// Files that may read every product, hidden ones included. Anything visitor-facing uses visibleProducts().
const ALLOWED: Record<string, string> = {
  'src/lib/content.ts': 'the accessor',
  'src/server/settings.ts': 'applies settings',
  'src/app/admin/products/page.tsx': 'admin list',
  'src/app/api/admin/product-image/route.ts': 'admin upload',
  'src/app/stamp/[slug]/page.tsx': 'static params', // the page itself 404s a hidden product
};

const ROOT = path.resolve(import.meta.dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|mts|js|mjs)$/.test(e.name) ? [full] : [];
  });
}

describe('visible products', () => {
  it('no file outside the allow-list reads site.products directly', () => {
    // `typeof site.products` is a type, not a read.
    const read = /(?<!typeof\s+)\bsite\.products\b/;
    const offenders = sourceFiles(path.join(ROOT, 'src'))
      .map((f) => path.relative(ROOT, f).split(path.sep).join('/'))
      .filter((f) => !(f in ALLOWED) && read.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(offenders, 'use visibleProducts() from src/lib/content.ts, or add the file to ALLOWED with a reason').toEqual([]);
  });

  it('a hidden product leaves the accessor, the /stamps/ grid and every category', () => {
    const cat = CATEGORIES.find((c) => productsForCategory(c).length > 0)!;
    const product = productsForCategory(cat)[0];
    expect(allModelsGrid().some((s) => s.slug === product.slug)).toBe(true);
    const was = product.hidden;
    product.hidden = true;
    try {
      expect(site.products).toContain(product); // still in the catalogue for the admin
      expect(visibleProducts()).not.toContain(product);
      expect(allModelsGrid().some((s) => s.slug === product.slug)).toBe(false);
      for (const c of CATEGORIES) expect(productsForCategory(c)).not.toContain(product);
    } finally {
      product.hidden = was;
    }
    expect(visibleProducts()).toContain(product);
  });
});
