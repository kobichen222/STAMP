import legacy from '../../content/legacy.json';
import { CATEGORIES } from './categories';

interface LegacyIndex {
  pages: string[];
  products: string[];
  categories: { id: number; slug: string }[];
  tags: string[];
  redirects: { source?: string; query?: Record<string, string>; destination: string }[];
}
const index = legacy as LegacyIndex;

/** Legacy WordPress path → new path, for 301 redirects. */
export function legacyRedirects(): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const c of CATEGORIES) if (c.wpPageSlug) out.push({ from: `/${c.wpPageSlug}/`, to: `/stamps/${c.slug}/` });
  // WooCommerce category → the landing page where it is the primary category.
  const catMap: Record<number, string> = { 25: 'business' };
  const rank: Record<number, number> = {};
  for (const c of CATEGORIES) {
    (c.wpCategoryIds ?? []).forEach((id, idx) => {
      if (id in catMap && !(id in rank)) return;
      if (rank[id] === undefined || idx < rank[id]) {
        rank[id] = idx;
        catMap[id] = c.slug;
      }
    });
  }
  for (const wc of index.categories) out.push({ from: `/product-category/${wc.slug}/`, to: catMap[wc.id] ? `/stamps/${catMap[wc.id]}/` : '/stamps/' });
  for (const t of index.tags) out.push({ from: `/product-tag/${t}/`, to: t.includes('עורך') ? '/stamps/lawyers/' : '/stamps/date/' });
  for (const slug of index.products) out.push({ from: `/product/${slug}/`, to: `/stamp/${slug}/` });
  out.push(
    { from: '/shop/', to: '/stamps/' },
    { from: '/cart/', to: '/cart/' },
    { from: '/צור-קשר/', to: '/contact/' },
    { from: '/מי-אנחנו/', to: '/about/' },
    { from: '/דוגמת-חותמת-עגולה-לעורך-דין/', to: '/stamps/lawyers/' },
    { from: '/thank-you/', to: '/' },
    { from: '/thank-you-lead/', to: '/contact/' },
  );
  for (const r of index.redirects) if (r.source) out.push({ from: r.source, to: r.destination.replace(/^\/product\//, '/stamp/') });
  return out.filter((r) => r.from !== r.to);
}

const pathMap = new Map<string, string>();
for (const r of legacyRedirects()) pathMap.set(r.from.normalize('NFC'), r.to);
const resolve = (dest: string) => pathMap.get(dest.normalize('NFC')) ?? dest;

/** Old ?p= / ?page_id= links. */
const queryMap = new Map<string, string>();
for (const r of index.redirects) {
  if (!r.query) continue;
  const key = Object.entries(r.query)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('&');
  queryMap.set(key, resolve(r.destination));
}

export function findRedirect(pathname: string, search: URLSearchParams): string | null {
  let path: string;
  try {
    path = decodeURIComponent(pathname).normalize('NFC');
  } catch {
    path = pathname;
  }
  if (!path.endsWith('/')) path += '/';
  const hit = pathMap.get(path);
  if (hit) return hit;
  if (path === '/' && [...search.keys()].length) {
    for (const keys of [['post_type', 'p'], ['page_id'], ['p']]) {
      if (keys.every((k) => search.has(k))) {
        const key = keys
          .map((k) => `${k}=${search.get(k)}`)
          .sort()
          .join('&');
        const q = queryMap.get(key);
        if (q) return q;
      }
    }
    if (search.get('post_type') === 'product' || search.has('s')) return '/stamps/';
  }
  return null;
}
