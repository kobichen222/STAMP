import type { StampModel } from './types';

/** Minimal product shape needed here (keeps this module usable on client and server). */
export interface ProductLike {
  slug: string;
  title: string;
  price: number | null;
  stampArea: string | null;
  rowsCount: string | null;
  categoryIds: number[];
  image?: { src: string } | null;
}

const ROUND_CATEGORIES = [23]; // "חותמות עגולות"
const DATE_CATEGORIES = [28]; // "חותמת תאריך / תאריכון"
const WEDDING_CATEGORIES = [33];

/** Parses WooCommerce ACF values like "47*18", " 38 * 14", "קוטר 40", "40 מ"מ קוטר". */
export function parseStampArea(area: string | null): { a: number; b: number; diameter: boolean } | null {
  if (!area) return null;
  const nums = (area.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0 && n < 300);
  if (!nums.length) return null;
  const diameter = /קוטר/.test(area);
  return { a: nums[0], b: nums[1] ?? nums[0], diameter };
}

export function parseMaxLines(rows: string | null): number | undefined {
  const nums = (rows || '').match(/\d+/g);
  return nums ? Math.max(...nums.map(Number)) : undefined;
}

export function designerModelForProduct(p: ProductLike): StampModel | null {
  const area = parseStampArea(p.stampArea);
  if (!area) return null;
  const round =
    area.diameter ||
    p.categoryIds.some((c) => ROUND_CATEGORIES.includes(c) || WEDDING_CATEGORIES.includes(c)) ||
    /עגול/.test(p.title);
  const width = round ? Math.max(area.a, area.b) : Math.max(area.a, area.b);
  const height = round ? width : Math.min(area.a, area.b);
  return {
    id: p.slug,
    name: p.title,
    shape: round ? 'round' : 'rect',
    width,
    height,
    maxLines: parseMaxLines(p.rowsCount),
    price: p.price,
    productSlug: p.slug,
    dateBand: p.categoryIds.some((c) => DATE_CATEGORIES.includes(c)),
    image: p.image?.src,
  };
}

/** Generic sizes for a design that is not tied to a product. */
export const CUSTOM_MODELS: StampModel[] = [
  { id: 'custom-rect-47x18', name: 'מלבנית 47×18', shape: 'rect', width: 47, height: 18, maxLines: 5, price: 69 },
  { id: 'custom-rect-58x22', name: 'מלבנית 58×22', shape: 'rect', width: 58, height: 22, maxLines: 6, price: 119 },
  { id: 'custom-round-40', name: 'עגולה ⌀40', shape: 'round', width: 40, height: 40, price: 129 },
];

export function customModel(shape: 'rect' | 'round', width: number, height: number): StampModel {
  return {
    id: `custom-${shape}-${width}x${height}`,
    name: shape === 'round' ? `עגולה ⌀${width}` : `מידה מותאמת ${width}×${height}`,
    shape,
    width,
    height: shape === 'round' ? width : height,
    price: null,
  };
}

export const formatSize = (m: { shape: string; width: number; height: number }) =>
  m.shape === 'round' ? `⌀${m.width} מ"מ` : `${m.width}×${m.height} מ"מ`;
