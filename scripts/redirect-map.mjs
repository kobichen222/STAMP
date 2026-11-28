#!/usr/bin/env node
/**
 * Writes docs/redirect-map.csv – Old URL → New URL for SEO migration QA
 * (spec §185–186). Every row should return 301 → 200 after launch.
 * Usage: node scripts/redirect-map.mjs [https://your-preview.vercel.app]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname: the latter gives "/C:/..." on Windows
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/legacy.json'), 'utf8'));
const cats = fs.readFileSync(path.join(ROOT, 'src/lib/categories.ts'), 'utf8');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/site.json'), 'utf8'));

const rows = [];
// Top-level category objects start with "  {" at two-space indent in categories.ts.
const blocks = cats.split(/\n  \{/).slice(1);
const catMap = { 25: 'business' };
const rank = {};
for (const block of blocks) {
  const slug = /slug: '([^']+)'/.exec(block)?.[1];
  const page = /wpPageSlug: '([^']+)'/.exec(block)?.[1];
  if (!slug) continue;
  if (page) rows.push([`/${page}/`, `/stamps/${slug}/`, 'category landing']);
  const ids = (/wpCategoryIds: \[([^\]]*)\]/.exec(block)?.[1] ?? '').split(',').map((x) => Number(x.trim())).filter(Boolean);
  ids.forEach((id, idx) => {
    if (id === 25) return;
    if (rank[id] === undefined || idx < rank[id]) {
      rank[id] = idx;
      catMap[id] = slug;
    }
  });
}
for (const wc of legacy.categories) rows.push([`/product-category/${wc.slug}/`, catMap[wc.id] ? `/stamps/${catMap[wc.id]}/` : '/stamps/', 'woocommerce category']);
rows.push(['/thank-you/', '/', 'page'], ['/thank-you-lead/', '/contact/', 'page'], ['/דוגמת-חותמת-עגולה-לעורך-דין/', '/stamps/lawyers/', 'page']);
for (const s of legacy.products) rows.push([`/product/${s}/`, `/stamp/${s}/`, 'product']);
rows.push(['/shop/', '/stamps/', 'shop'], ['/צור-קשר/', '/contact/', 'page'], ['/מי-אנחנו/', '/about/', 'page'], ['/?p=<id>', '(per id)', 'query'], ['/?page_id=<id>', '(per id)', 'query']);
// Retired products and category: read from src/lib/redirects.ts (RETIRED_PRODUCTS, RETIRED_PATHS) so the two never drift.
const red = fs.readFileSync(path.join(ROOT, 'src/lib/redirects.ts'), 'utf8');
const retiredSlugs = [.../RETIRED_PRODUCTS = \[([^\]]*)\]/.exec(red)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const retiredBlock = /const RETIRED_PATHS = \[([\s\S]*?)\n\];/.exec(red)[1];
const retired = [
  ...[...retiredBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]),
  ...[...retiredBlock.matchAll(/`([^`]+)`/g)].flatMap((m) => retiredSlugs.map((s) => m[1].replace('${s}', s))),
];
for (let i = rows.length - 1; i >= 0; i--) if (retired.includes(rows[i][0])) rows.splice(i, 1);
rows.push(...retired.map((u) => [u, '/stamps/', 'retired']));
const moved = new Set(rows.map((r) => r[0]));
for (const p of site.pages) if (p.slug && !moved.has(p.path)) rows.push([p.path, p.path, 'kept (200)']);

const header = 'old_url,new_url,type,title,status_expected';
const titleFor = (u) => site.pages.find((p) => p.path === u)?.title ?? site.products.find((p) => `/product/${p.slug}/` === u)?.title ?? '';
const csv = [header, ...rows.map(([a, b, t]) => [a, b, t, titleFor(a), a === b ? 200 : 301].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
fs.writeFileSync(path.join(ROOT, 'docs/redirect-map.csv'), '﻿' + csv);
console.log(`Wrote ${rows.length} rows to docs/redirect-map.csv`);

const base = process.argv[2];
if (base) {
  let bad = 0;
  for (const [a, b] of rows) {
    if (a.includes('<')) continue;
    const res = await fetch(base + encodeURI(a), { redirect: 'manual' });
    const loc = res.headers.get('location') ?? '';
    const ok = a === b ? res.status === 200 : res.status === 301 && decodeURI(new URL(loc, base).pathname) === b;
    if (!ok) {
      bad++;
      console.log('FAIL', res.status, a, '→', loc);
    }
  }
  console.log(bad ? `${bad} failures` : 'All redirects OK');
  process.exitCode = bad ? 1 : 0;
}
