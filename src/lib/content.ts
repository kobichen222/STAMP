import data from '../../content/site.json';
import type { Block, Category, Page, Product, SiteContent } from './types';

export const site = data as unknown as SiteContent;

/** Route params may arrive percent-encoded (Hebrew slugs); normalise before lookups. */
export function normalizeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).normalize('NFC');
  } catch {
    return slug.normalize('NFC');
  }
}

export const getHomePage = (): Page => site.pages.find((p) => p.path === '/')!;

export const getPage = (slug: string): Page | undefined =>
  site.pages.find((p) => p.slug && p.slug === normalizeSlug(slug));

export const getProduct = (slug: string): Product | undefined =>
  site.products.find((p) => p.slug === normalizeSlug(slug));

export const getProductById = (id: number): Product | undefined => site.products.find((p) => p.id === id);

export const getCategory = (slug: string): Category | undefined =>
  site.categories.find((c) => c.slug === normalizeSlug(slug));

export const getCategoryById = (id: number): Category | undefined => site.categories.find((c) => c.id === id);

export function getProductsInCategories(ids: number[], order: 'asc' | 'desc' = 'desc'): Product[] {
  const list = site.products.filter((p) => p.categoryIds.some((c) => ids.includes(c)));
  // WooCommerce ordered by publish date; our export keeps that order ascending.
  return order === 'asc' ? list : [...list].reverse();
}

export function resolveProducts(block: Extract<Block, { type: 'products' }>): Product[] {
  if (block.productIds?.length) return block.productIds.map(getProductById).filter((p): p is Product => !!p);
  if (block.categoryIds?.length) return getProductsInCategories(block.categoryIds, block.order);
  return [];
}

export const formatPrice = (price: number | null) =>
  price == null ? 'מחיר לפי הצעה' : `₪${price.toLocaleString('he-IL')}`;

/** Plain-text description for meta tags, derived from the first paragraphs of a page. */
export function excerptFromBlocks(blocks: Block[], max = 160): string {
  const parts: string[] = [];
  const walk = (bs: Block[]) => {
    for (const b of bs) {
      if (parts.join(' ').length > max) return;
      if (b.type === 'html') parts.push(b.html.replace(/<[^>]+>/g, ' '));
      else if (b.type === 'section') b.columns.forEach((c) => walk(c.blocks));
    }
  };
  walk(blocks);
  const text = parts.join(' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s\S*$/, '')}…` : text;
}
