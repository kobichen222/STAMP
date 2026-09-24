import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';
import { CATEGORIES, remainingLegacyPages } from '@/lib/catalog';
import { site } from '@/lib/content';

const url = (path: string) => SITE.url + encodeURI(path);
const date = (s: string) => (s && !s.startsWith('0000') ? new Date(s.replace(' ', 'T') + 'Z') : undefined);

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/stamps/', '/designer/', '/templates/', '/examples/', '/how-it-works/', '/faq/', '/about/', '/contact/'];
  return [
    ...pages.map((p) => ({ url: url(p), priority: p === '/' ? 1 : 0.8 })),
    ...CATEGORIES.map((c) => ({ url: url(`/stamps/${c.slug}/`), priority: 0.8 })),
    ...site.products.map((p) => ({ url: url(`/stamp/${p.slug}/`), lastModified: date(p.modified), priority: 0.7 })),
    ...remainingLegacyPages()
      .filter((p) => !p.noindex)
      .map((p) => ({ url: url(p.path), lastModified: date(p.modified), priority: 0.4 })),
  ];
}
