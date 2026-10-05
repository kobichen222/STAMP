import { legacyRedirects } from './redirects';
import { designerModelForProduct, formatSize } from '@/designer/models';
import { getPage, site } from './content';
import type { Block, Page, Product } from './types';

import { CATEGORIES, type StampCategory } from './categories';

export { CATEGORIES, getStampCategory, type StampCategory } from './categories';


function productIdsInBlocks(blocks: Block[]): number[] {
  const ids: number[] = [];
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      if (b.type === 'products') {
        if (b.productIds) ids.push(...b.productIds);
        if (b.categoryIds) ids.push(...site.products.filter((p) => p.categoryIds.some((c) => b.categoryIds!.includes(c))).map((p) => p.id));
      } else if (b.type === 'section') b.columns.forEach((c) => walk(c.blocks));
    }
  };
  walk(blocks);
  return ids;
}

export function categoryPage(cat: StampCategory): Page | undefined {
  return cat.wpPageSlug ? getPage(cat.wpPageSlug) : undefined;
}

export function productsForCategory(cat: StampCategory): Product[] {
  const page = categoryPage(cat);
  const fromPage = new Set(page ? productIdsInBlocks(page.blocks) : []);
  return site.products.filter((p) => {
    if (p.hidden) return false;
    const t = p.title;
    if (cat.titleIncludes) return cat.titleIncludes.some((x) => t.includes(x));
    if (cat.titleExcludes?.some((x) => t.includes(x))) return false;
    if (cat.minWidth) {
      const m = designerModelForProduct(p);
      return !!m && m.width >= cat.minWidth;
    }
    return !!cat.wpCategoryIds?.some((c) => p.categoryIds.includes(c)) || fromPage.has(p.id);
  });
}

/**
 * The old page's editorial (SEO) text only: headings and paragraphs. Product
 * grids, sample images, captions, buttons and repeated headings from the old
 * WooCommerce layout are dropped – the live catalogue above replaces them.
 */
export function editorialBlocks(blocks: Block[]): Block[] {
  const out: Block[] = [];
  const seen = new Set<string>();
  const norm = (t: string) => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const visit = (b: Block, inGrid: boolean) => {
    if (b.type === 'section') {
      // Several columns side by side were product / sample grids on the old site.
      const grid = b.columns.length > 1;
      for (const c of b.columns) for (const x of c.blocks) visit(x, inGrid || grid);
      return;
    }
    if (inGrid) return;
    if (b.type === 'heading') {
      const t = norm(b.text);
      if (!t || seen.has(t) || /כל מחירי החותמות כוללים|לחצו כאן|דוגמ/.test(t)) return;
      seen.add(t);
      out.push({ ...b, href: undefined, level: Math.max(2, b.level) });
    } else if (b.type === 'html') {
      const t = norm(b.html);
      // Real paragraphs only – not captions, prices or link lists.
      if (t.length < 60 || seen.has(t) || /ש"ח|₪/.test(t) && t.length < 120) return;
      seen.add(t);
      out.push(b);
    } else if (b.type === 'list' || b.type === 'accordion') out.push(b);
  };
  for (const b of blocks) visit(b, false);
  // Drop headings that end up with no text under them.
  return out.filter((b, i) => b.type !== 'heading' || (out[i + 1] && out[i + 1].type !== 'heading'));
}

// ---------------------------------------------------------------- product facets

export type Series = 'printer' | 'pocket' | 'pen' | 'dater' | 'numberer' | 'special';

export const SERIES_LABEL: Record<Series, string> = {
  printer: 'חותמת אוטומטית',
  pocket: 'חותמת כיס',
  pen: 'עט חותמת',
  dater: 'תאריכון',
  numberer: 'נומרטור',
  special: 'מיוחדים',
};

export function productSeries(p: Product): Series {
  const t = p.title;
  if (/עט/.test(t)) return 'pen';
  if (/תאריך/.test(t)) return 'dater';
  if (/נומרטור/.test(t)) return 'numberer';
  if (/כיס|סליידר|עכבר/.test(t)) return 'pocket';
  if (/פרינט|PRINT|ספרים|חתונה|QR|ערבות|מו"פ/i.test(t)) return 'printer';
  return 'special';
}

export interface ProductFacts {
  series: Series;
  shape: 'rect' | 'round' | 'square' | null;
  size: string | null;
  width: number | null;
  height: number | null;
  maxLines: number | null;
  designable: boolean;
}

export function productFacts(p: Product): ProductFacts {
  const m = designerModelForProduct(p);
  return {
    series: productSeries(p),
    shape: !m ? null : m.shape === 'round' ? 'round' : m.width === m.height ? 'square' : 'rect',
    size: m ? formatSize(m) : null,
    width: m?.width ?? null,
    height: m?.height ?? null,
    maxLines: m?.maxLines ?? null,
    designable: !!m,
  };
}

/** WordPress pages that stay as content pages at their original URL. */
export function remainingLegacyPages(): Page[] {
  const moved = new Set(legacyRedirects().map((r) => r.from));
  return site.pages.filter((p) => p.slug && !moved.has(p.path));
}

export function categoryCard(cat: StampCategory) {
  const products = productsForCategory(cat);
  const priced = products.filter((p) => p.price != null);
  const models = products.map((p) => designerModelForProduct(p)).filter((m): m is NonNullable<typeof m> => !!m);
  const widths = models.map((m) => m.width);
  const lines = models.map((m) => m.maxLines).filter((n): n is number => !!n);
  const hero = [...products].sort((a, b) => (a.gallery.length ? 0 : 1) - (b.gallery.length ? 0 : 1)).find((p) => p.image) ?? products[0];
  return {
    slug: cat.slug,
    name: cat.name,
    image: hero?.image ?? null,
    size: widths.length ? (Math.min(...widths) === Math.max(...widths) ? `${widths[0]} מ"מ` : `${Math.min(...widths)}–${Math.max(...widths)} מ"מ`) : null,
    lines: lines.length ? `עד ${Math.max(...lines)} שורות` : null,
    fromPrice: priced.length ? Math.min(...priced.map((p) => p.price!)) : null,
    count: products.length,
  };
}
