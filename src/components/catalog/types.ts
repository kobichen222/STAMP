import type { ImageRef } from '@/lib/types';
import type { ProductFacts } from '@/lib/catalog';

/** Serializable product summary passed to client components. */
export interface ProductSummary extends ProductFacts {
  slug: string;
  title: string;
  price: number | null;
  image: ImageRef | null;
  subtitle: string | null;
}
