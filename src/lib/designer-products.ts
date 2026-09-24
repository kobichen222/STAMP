import type { DesignerProduct } from '@/designer/editor/Editor';
import { designerModelForProduct } from '@/designer/models';
import { site } from './content';

export function designerProducts(): DesignerProduct[] {
  return site.products
    .map((p) => {
      const model = designerModelForProduct(p);
      return model ? { slug: p.slug, title: p.title, price: p.price, image: p.image?.src ?? null, model } : null;
    })
    .filter((x): x is DesignerProduct => !!x);
}

export const DEFAULT_RECT = 'חותמת-פרינט-40';
export const DEFAULT_ROUND = 'print-r-540';
