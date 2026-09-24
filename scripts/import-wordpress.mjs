#!/usr/bin/env node
/**
 * Converts a WordPress (WXR) export into content/site.json, the single content
 * source for the Next.js site. Elementor layouts are flattened into a small set
 * of block types (see src/lib/types.ts) and WooCommerce products keep their
 * price, images, categories and stamp-specific ACF fields.
 *
 * Usage: node scripts/import-wordpress.mjs [path/to/export.xml]
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const input = process.argv[2] || path.join(ROOT, 'wordpress-export/export.xml');
const output = path.join(ROOT, 'content/site.json');

const OLD_HOSTS = [
  'https://www.stamp2go.co.il',
  'http://www.stamp2go.co.il',
  'https://stamp2go.co.il',
  'http://stamp2go.co.il',
  'https://mccisrae.21.unixvision.com',
  'http://mccisrae.21.unixvision.com',
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  cdataPropName: false,
  parseTagValue: false,
  trimValues: false,
  isArray: (name) => ['item', 'wp:postmeta', 'category', 'wp:term', 'wp:category'].includes(name),
});
const xml = parser.parse(fs.readFileSync(input, 'utf8'));
const channel = xml.rss.channel;
const items = channel.item;

const text = (v) => (v == null ? '' : typeof v === 'object' ? String(v['#text'] ?? '') : String(v));
const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
const metaOf = (it) => {
  const m = {};
  for (const pm of it['wp:postmeta'] || []) m[text(pm['wp:meta_key'])] = text(pm['wp:meta_value']);
  return m;
};

/** Make URLs of the old site relative so links keep working on the new domain. */
function localizeUrl(url) {
  if (!url) return url;
  let u = String(url).trim();
  for (const h of OLD_HOSTS) if (u.startsWith(h)) u = u.slice(h.length) || '/';
  if (u.startsWith('/') && !u.startsWith('/wp-content/')) u = decode(u);
  return u;
}

function cleanHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s(style|class|id|data-[\w-]+)="[^"]*"/gi, '')
    .replace(/<\/?(span|font)\b[^>]*>/gi, '')
    .replace(/(href|src)="([^"]*)"/gi, (_, a, u) => `${a}="${localizeUrl(u.replace(/&amp;/g, '&'))}"`)
    .replace(/<p>\s*(&nbsp;)?\s*<\/p>/gi, '')
    .trim();
}

const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- media
const media = {};
for (const it of items) {
  if (text(it['wp:post_type']) !== 'attachment') continue;
  const m = metaOf(it);
  const meta = m._wp_attachment_metadata || '';
  const w = /s:5:"width";i:(\d+)/.exec(meta);
  const h = /s:6:"height";i:(\d+)/.exec(meta);
  media[text(it['wp:post_id'])] = {
    src: localizeUrl(text(it['wp:attachment_url'])),
    alt: m._wp_attachment_image_alt || text(it.title),
    width: w ? Number(w[1]) : undefined,
    height: h ? Number(h[1]) : undefined,
  };
}
const img = (id, fallbackUrl, alt) => {
  const m = media[String(id)];
  if (m) return { ...m, alt: alt || m.alt };
  if (!fallbackUrl) return null;
  return { src: localizeUrl(fallbackUrl), alt: alt || '' };
};

// ---------------------------------------------------------------- terms
const terms = {};
for (const t of [...(channel['wp:term'] || []), ...(channel['wp:category'] || [])]) {
  const tax = text(t['wp:term_taxonomy']);
  if (!['product_cat', 'product_tag'].includes(tax)) continue;
  terms[text(t['wp:term_id'])] = {
    id: Number(text(t['wp:term_id'])),
    taxonomy: tax,
    slug: decode(text(t['wp:term_slug'])),
    name: text(t['wp:term_name']),
  };
}

// ---------------------------------------------------------------- posts
const byId = {};
for (const it of items) byId[text(it['wp:post_id'])] = it;

// Elementor templates that pages embed through the "template" widget.
const libraryData = {};
for (const it of items) {
  if (text(it['wp:post_type']) !== 'elementor_library') continue;
  const d = metaOf(it)._elementor_data;
  if (d) libraryData[text(it['wp:post_id'])] = JSON.parse(d);
}

function widgetToBlocks(el) {
  const s = el.settings && !Array.isArray(el.settings) ? el.settings : {};
  switch (el.widgetType) {
    case 'heading': {
      const t = stripTags(s.title);
      if (!t || t === 'כתוב את הכותרת כאן' || t === 'Add Your Heading Text Here') return [];
      const tag = /^h[1-6]$/.test(s.header_size || '') ? s.header_size : 'h2';
      return [{ type: 'heading', level: Number(tag[1]), text: t, href: localizeUrl(s.link?.url) || undefined }];
    }
    case 'text-editor': {
      const html = cleanHtml(s.editor);
      return html ? [{ type: 'html', html }] : [];
    }
    case 'image': {
      const i = img(s.image?.id, s.image?.url, s.image?.alt);
      if (!i) return [];
      return [{ type: 'image', image: i, href: localizeUrl(s.link?.url) || undefined, caption: s.caption || undefined }];
    }
    case 'button':
      if (!s.text || s.text.trim() === '.') return [];
      return [{ type: 'button', text: s.text, href: localizeUrl(s.link?.url) || '#order' }];
    case 'image-carousel':
    case 'image-gallery': {
      const list = (s.carousel || s.wp_gallery || []).map((g) => img(g.id, g.url)).filter(Boolean);
      return list.length ? [{ type: 'gallery', images: list, variant: el.widgetType === 'image-carousel' ? 'carousel' : 'grid' }] : [];
    }
    case 'loop-grid': {
      if (s.post_query_post_type === 'current_query' && s.post_query_posts_ids?.length) {
        return [{ type: 'products', productIds: s.post_query_posts_ids.map(Number) }];
      }
      if (s.post_query_include_term_ids?.length) {
        return [{ type: 'products', categoryIds: s.post_query_include_term_ids.map(Number), order: s.post_query_order || 'desc' }];
      }
      if (s.post_query_posts_ids?.length) return [{ type: 'products', productIds: s.post_query_posts_ids.map(Number) }];
      return [];
    }
    case 'accordion':
    case 'toggle':
      return [{ type: 'accordion', items: (s.tabs || []).map((t) => ({ title: stripTags(t.tab_title), html: cleanHtml(t.tab_content) })) }];
    case 'divider':
      return [{ type: 'divider' }];
    case 'form': {
      const fields = (s.form_fields || []).map((f) => f.field_type || 'text');
      return [{ type: 'form', kind: fields.includes('upload') ? 'order' : 'contact' }];
    }
    case 'google_maps':
      return [{ type: 'map', address: s.address || '' }];
    case 'icon-list': {
      const list = (s.icon_list || []).map((i) => ({ text: stripTags(i.text), href: localizeUrl(i.link?.url) || undefined }));
      return list.length ? [{ type: 'list', items: list }] : [];
    }
    case 'template': {
      const tpl = libraryData[String(s.template_id)];
      return tpl ? elementsToBlocks(tpl) : [];
    }
    case 'posts':
      if (s.posts_post_type === 'page') return [{ type: 'sitemap' }];
      return [];
    case 'wc-categories':
      return [{ type: 'categories' }];
    default:
      return []; // breadcrumbs, menus, icons, woocommerce placeholders: rendered by the layout
  }
}

/** Sections become {type:'section', columns}, nested sections are flattened into their column. */
function elementsToBlocks(elements) {
  const out = [];
  for (const el of elements || []) {
    if (el.elType === 'widget') out.push(...widgetToBlocks(el));
    else if (el.elType === 'section' || el.elType === 'container') {
      const cols = (el.elements || []).filter((c) => c.elType === 'column');
      if (cols.length) {
        const columns = cols
          .map((c) => ({ width: c.settings?._column_size || Math.round(100 / cols.length), blocks: elementsToBlocks(c.elements) }))
          .filter((c) => c.blocks.length);
        if (!columns.length) continue;
        out.push({ type: 'section', columns });
      } else out.push(...elementsToBlocks(el.elements));
    } else if (el.elType === 'column') out.push(...elementsToBlocks(el.elements));
  }
  return out;
}

function contentBlocks(it) {
  const m = metaOf(it);
  if (m._elementor_data && m._elementor_edit_mode === 'builder') {
    const blocks = elementsToBlocks(JSON.parse(m._elementor_data));
    if (blocks.length) return blocks;
  }
  const html = cleanHtml(text(it['content:encoded']).replace(/\n\n/g, '</p><p>'));
  return html ? [{ type: 'html', html: `<p>${html}</p>` }] : [];
}

function seoOf(it, fallbackTitle) {
  const m = metaOf(it);
  const replace = (s) =>
    s
      ?.replace(/%%title%%/g, fallbackTitle)
      .replace(/%%sitename%%/g, 'Stamp2Go')
      .replace(/%%sep%%/g, '|')
      .replace(/%%page%%/g, '')
      .replace(/%%[a-z_]+%%/g, '')
      .trim();
  return {
    title: replace(m._yoast_wpseo_title) || undefined,
    description: replace(m._yoast_wpseo_metadesc) || undefined,
  };
}

const HIDDEN_PAGE_SLUGS = new Set(['cart', 'checkout', 'my-account', 'shop']);

const pages = [];
const products = [];
const redirects = [];

for (const it of items) {
  const type = text(it['wp:post_type']);
  const status = text(it['wp:status']);
  const id = Number(text(it['wp:post_id']));
  const slug = decode(text(it['wp:post_name']));
  const title = text(it.title);
  const m = metaOf(it);
  if (status !== 'publish' || !['page', 'product'].includes(type)) continue;

  if (type === 'page') {
    const isHome = id === 13;
    if (HIDDEN_PAGE_SLUGS.has(slug)) continue;
    const pathName = isHome ? '/' : `/${slug}/`;
    pages.push({
      id,
      slug: isHome ? '' : slug,
      path: pathName,
      title,
      seo: seoOf(it, title),
      image: m._thumbnail_id ? img(m._thumbnail_id) : undefined,
      blocks: contentBlocks(it),
      modified: text(it['wp:post_modified_gmt']),
      noindex: ['thank-you', 'thank-you-lead'].includes(slug),
    });
    redirects.push({ query: { page_id: String(id) }, destination: pathName });
    redirects.push({ query: { p: String(id) }, destination: pathName });
  } else {
    const cats = (it.category || [])
      .filter((c) => c['@domain'] === 'product_cat')
      .map((c) => Object.values(terms).find((t) => t.taxonomy === 'product_cat' && t.slug === decode(c['@nicename'])))
      .filter(Boolean)
      .map((t) => t.id);
    const tags = (it.category || [])
      .filter((c) => c['@domain'] === 'product_tag')
      .map((c) => decode(c['@nicename']));
    const pathName = `/product/${slug}/`;
    const shortDescription = cleanHtml(text(it['excerpt:encoded']).replace(/\n/g, '<br>'));
    let blocks = [];
    if (m._elementor_edit_mode === 'builder' && m._elementor_data) blocks = elementsToBlocks(JSON.parse(m._elementor_data));
    else if (text(it['content:encoded']).trim().length > 20) blocks = contentBlocks(it);
    products.push({
      id,
      slug,
      path: pathName,
      title,
      price: m._price ? Number(m._price) : null,
      regularPrice: m._regular_price ? Number(m._regular_price) : null,
      image: m._thumbnail_id ? img(m._thumbnail_id) : null,
      gallery: (m._product_image_gallery || '')
        .split(',')
        .filter(Boolean)
        .map((g) => img(g))
        .filter(Boolean),
      categoryIds: cats,
      primaryCategoryId: m._yoast_wpseo_primary_product_cat ? Number(m._yoast_wpseo_primary_product_cat) : cats[0] ?? null,
      tags,
      stampArea: (m.stamp_area || '').trim() || null,
      rowsCount: (m.rows_count || '').trim() || null,
      headings: [m.h2_heading, m.first_heading, m.second_heading].map((h) => (h || '').trim()).filter(Boolean),
      shortDescription,
      blocks,
      seo: seoOf(it, title),
      menuOrder: Number(text(it['wp:menu_order']) || 0),
      modified: text(it['wp:post_modified_gmt']),
    });
    redirects.push({ query: { p: String(id) }, destination: pathName });
    redirects.push({ query: { post_type: 'product', p: String(id) }, destination: pathName });
    if (m._wp_old_slug) redirects.push({ source: `/product/${decode(m._wp_old_slug)}/`, destination: pathName });
  }
}

// ---------------------------------------------------------------- categories
const categories = Object.values(terms)
  .filter((t) => t.taxonomy === 'product_cat' && t.slug !== 'uncategorized')
  .map((t) => ({ ...t, count: products.filter((p) => p.categoryIds.includes(t.id)).length }))
  .filter((t) => t.count > 0);
const productTags = Object.values(terms).filter((t) => t.taxonomy === 'product_tag');

// ---------------------------------------------------------------- menus
const pageById = Object.fromEntries(pages.map((p) => [p.id, p]));
const menus = {};
const MENU_KEYS = { 'תפריט ראשי': 'main', 'חותמות': 'stamps', 'תפריט מובייל': 'mobile' };
for (const it of items) {
  if (text(it['wp:post_type']) !== 'nav_menu_item' || text(it['wp:status']) !== 'publish') continue;
  const m = metaOf(it);
  const menuName = (it.category || []).find((c) => c['@domain'] === 'nav_menu');
  const key = MENU_KEYS[text(menuName)] || text(menuName);
  let href = m._menu_item_url ? localizeUrl(m._menu_item_url) : null;
  let label = text(it.title);
  if (m._menu_item_type === 'post_type' && m._menu_item_object === 'page') {
    const p = pageById[Number(m._menu_item_object_id)];
    if (!p) continue;
    href = p.path;
    label = label || p.title;
  } else if (m._menu_item_type === 'taxonomy') {
    const t = terms[m._menu_item_object_id];
    if (!t) continue;
    href = `/product-category/${t.slug}/`;
    label = label || t.name;
  }
  (menus[key] ||= []).push({ label, href, order: Number(text(it['wp:menu_order'])) });
}
for (const k of Object.keys(menus)) {
  menus[k].sort((a, b) => a.order - b.order);
  menus[k] = menus[k].filter((x, i, arr) => arr.findIndex((y) => y.href === x.href && y.label === x.label) === i).map(({ label, href }) => ({ label, href }));
}

// ---------------------------------------------------------------- write
const site = {
  generatedAt: new Date().toISOString(),
  source: text(channel.link),
  title: text(channel.title),
  pages,
  products,
  categories,
  productTags,
  menus,
  // Global footer built in Elementor (template "אלמנטור פוטר"), without the credits row.
  footer: libraryData['396'] ? elementsToBlocks(libraryData['396']).slice(0, 1) : [],
  redirects,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(site, null, 1));

// Compact URL index for the edge redirect middleware (keeps it small).
fs.writeFileSync(
  path.join(ROOT, 'content/legacy.json'),
  JSON.stringify({
    pages: pages.map((p) => p.path),
    products: products.map((p) => p.slug),
    categories: categories.map((c) => ({ id: c.id, slug: c.slug })),
    tags: productTags.map((t) => t.slug),
    redirects,
  }),
);

// All media referenced anywhere in the content, for scripts/download-media.mjs.
const used = new Set();
JSON.stringify(site, (k, v) => {
  if (typeof v === 'string' && v.startsWith('/wp-content/uploads/')) used.add(v);
  return v;
});
fs.writeFileSync(path.join(ROOT, 'content/media-manifest.json'), JSON.stringify([...used].sort(), null, 1));

console.log(
  `Imported ${pages.length} pages, ${products.length} products, ${categories.length} categories, ` +
    `${Object.keys(menus).length} menus, ${used.size} media files → ${path.relative(ROOT, output)}`,
);
