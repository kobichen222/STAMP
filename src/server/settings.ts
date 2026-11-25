import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { applyPublicSettings, customStampArea, withDefaults, type AdminSettings, type CustomProduct, type SettingsKey } from '@/lib/admin-settings';
import type { Product } from '@/lib/types';
import { site } from '@/lib/content';
import { DEFAULT_RULES } from '@/lib/pricing';
import { databaseUrl, db } from './store/neon';

/**
 * Admin-editable settings. One row per section in `s2g_settings` (Neon), or a
 * JSON file locally without a database. Cached briefly per server instance and
 * applied in place to the shared defaults (pricing, add-ons, contact, products).
 */
const TTL = 30_000;
let cache: { at: number; value: AdminSettings } | null = null;

const fileStore = () => path.join(process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/stamp2go-data' : path.join(process.cwd(), '.data')), 'settings.json');

async function readRaw(): Promise<Partial<AdminSettings>> {
  if (databaseUrl()) {
    const sql = await db();
    const rows = await sql`select key, value from s2g_settings`;
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<AdminSettings>;
  }
  try {
    return JSON.parse(await fs.readFile(fileStore(), 'utf8'));
  } catch {
    return {};
  }
}

export async function getSettings(fresh = false): Promise<AdminSettings> {
  if (!fresh && cache && Date.now() - cache.at < TTL) return cache.value;
  let raw: Partial<AdminSettings> = {};
  try {
    raw = await readRaw();
  } catch (e) {
    // The site keeps working with the built-in defaults if the database is unreachable.
    console.error('[settings]', e);
    if (cache) return cache.value;
  }
  const value = withDefaults(raw);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings<K extends SettingsKey>(key: K, value: AdminSettings[K]): Promise<void> {
  if (databaseUrl()) {
    const sql = await db();
    await sql`insert into s2g_settings (key, value, updated_at) values (${key}, ${JSON.stringify(value)}::jsonb, now())
              on conflict (key) do update set value = excluded.value, updated_at = now()`;
  } else {
    const all = await readRaw();
    await fs.mkdir(path.dirname(fileStore()), { recursive: true });
    await fs.writeFile(fileStore(), JSON.stringify({ ...all, [key]: value }, null, 2));
  }
  cache = null;
  await ensureSettings(true);
}

const BASE_PRICE = new Map(site.products.map((p) => [p.id, p.price]));
/** Slugs of the original catalogue (a product added from the admin may not take one). */
export const BASE_SLUGS = new Set(site.products.map((p) => p.slug));

const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A product added from the admin, in the catalogue's own shape. */
export function customToProduct(c: CustomProduct): Product {
  const paragraphs = c.description
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    id: c.id,
    slug: c.slug,
    path: `/stamp/${c.slug}/`,
    title: c.title,
    price: c.price,
    regularPrice: c.regularPrice ?? null,
    image: c.image ? { src: c.image, alt: c.title } : null,
    gallery: [],
    categoryIds: c.categoryIds,
    primaryCategoryId: c.categoryIds[0] ?? null,
    tags: [],
    stampArea: customStampArea(c),
    rowsCount: c.rowsCount || null,
    headings: [],
    shortDescription: c.shortDescription,
    blocks: paragraphs.length ? [{ type: 'html', html: paragraphs.map((t) => `<p>${escapeHtml(t).replace(/\n/g, '<br>')}</p>`).join('') }] : [],
    seo: {},
    menuOrder: 0,
    modified: c.createdAt,
    hidden: !!c.hidden,
    custom: true,
  };
}
const BASE_IMAGE = new Map(site.products.map((p) => [p.id, p.image]));

/** The catalogue photo before any admin replacement. */
export const baseImage = (id: number) => BASE_IMAGE.get(id)?.src ?? null;

/** The catalogue price before any admin override. */
export const basePrice = (id: number) => BASE_PRICE.get(id) ?? null;

/** Loads (cached) settings and applies them to pricing, contact details and the catalogue. */
export async function ensureSettings(fresh = false): Promise<AdminSettings> {
  const s = await getSettings(fresh);
  applyPublicSettings(s);
  const now = new Date();
  DEFAULT_RULES.coupons = s.coupons.filter((c) => c.active && (!c.expiresAt || new Date(c.expiresAt) >= now)).map(({ active: _a, note: _n, ...c }) => c);
  // Products added from the admin: replace the previous copies (in place – the catalogue is shared).
  for (let i = site.products.length - 1; i >= 0; i--) if (site.products[i].custom) site.products.splice(i, 1);
  for (const c of s.customProducts) if (!BASE_SLUGS.has(c.slug)) site.products.push(customToProduct(c));
  for (const p of site.products) {
    if (p.custom) continue;
    const o = s.products[p.slug];
    const base = BASE_PRICE.get(p.id) ?? null;
    p.price = o && o.price !== undefined ? o.price : base;
    p.hidden = !!o?.hidden;
    const img = BASE_IMAGE.get(p.id) ?? null;
    p.image = o?.image ? { src: o.image, alt: img?.alt || p.title } : img;
  }
  return s;
}
