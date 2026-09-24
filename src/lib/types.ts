export interface ImageRef {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export type Block =
  | { type: 'section'; columns: { width: number; blocks: Block[] }[] }
  | { type: 'heading'; level: number; text: string; href?: string }
  | { type: 'html'; html: string }
  | { type: 'image'; image: ImageRef; href?: string; caption?: string }
  | { type: 'button'; text: string; href: string }
  | { type: 'gallery'; images: ImageRef[]; variant: 'carousel' | 'grid' }
  | { type: 'products'; categoryIds?: number[]; productIds?: number[]; order?: 'asc' | 'desc' }
  | { type: 'accordion'; items: { title: string; html: string }[] }
  | { type: 'divider' }
  | { type: 'form'; kind: 'contact' | 'order' }
  | { type: 'map'; address: string }
  | { type: 'list'; items: { text: string; href?: string }[] }
  | { type: 'sitemap' }
  | { type: 'categories' };

export interface Seo {
  title?: string;
  description?: string;
}

export interface Page {
  id: number;
  slug: string;
  path: string;
  title: string;
  seo: Seo;
  image?: ImageRef | null;
  blocks: Block[];
  modified: string;
  noindex: boolean;
}

export interface Product {
  id: number;
  slug: string;
  path: string;
  title: string;
  price: number | null;
  regularPrice: number | null;
  image: ImageRef | null;
  gallery: ImageRef[];
  categoryIds: number[];
  primaryCategoryId: number | null;
  tags: string[];
  stampArea: string | null;
  rowsCount: string | null;
  headings: string[];
  shortDescription: string;
  blocks: Block[];
  seo: Seo;
  menuOrder: number;
  modified: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  count: number;
}

export interface MenuItem {
  label: string;
  href: string;
}

export interface Redirect {
  source?: string;
  query?: Record<string, string>;
  destination: string;
}

export interface SiteContent {
  generatedAt: string;
  source: string;
  title: string;
  pages: Page[];
  products: Product[];
  categories: Category[];
  productTags: { id: number; slug: string; name: string }[];
  menus: Record<string, MenuItem[]>;
  footer: Block[];
  redirects: Redirect[];
}
