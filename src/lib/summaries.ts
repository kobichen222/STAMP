import type { ProductSummary } from '@/components/catalog/types';
import { productFacts } from './catalog';
import { visibleProducts } from './content';
import type { Product } from './types';

export function summarize(p: Product): ProductSummary {
  return {
    ...productFacts(p),
    slug: p.slug,
    title: p.title,
    price: p.price,
    image: p.image,
    subtitle: p.headings[1] ?? null,
  };
}

/** The "כל הדגמים" grid on /stamps/: every product a visitor may see. */
export const allModelsGrid = (): ProductSummary[] => visibleProducts().map(summarize);
