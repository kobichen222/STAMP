/**
 * Settings the admin edits (prices, add-ons, shipping, coupons, products,
 * contact details). Stored in the database by src/server/settings.ts and
 * applied in place to the shared defaults – on the server for every render /
 * API call, and in the browser by <SettingsBoot>. Isomorphic: no server imports.
 */
import { SITE } from './config';
import { ADDONS, DEFAULT_RULES, type AddonId, type Coupon, type QuantityTier, type ShippingMethod } from './pricing';

export interface PricingSettings {
  ink: Record<string, number>;
  frame: number;
  logo: number;
  onlineDesignPct: number;
  rewardPct: number;
  quantityTiers: QuantityTier[];
  shipping: (ShippingMethod & { active?: boolean })[];
  addons: { id: AddonId; price?: number; pctOfUnit?: number; active: boolean }[];
}

export interface AdminCoupon extends Coupon {
  active: boolean;
  note?: string;
}

export interface ProductOverride {
  price?: number | null;
  hidden?: boolean;
  /** A replacement product photo uploaded from the admin (/api/product-image/…). */
  image?: string;
}

/** A product added from the admin (stored in the settings, merged into the catalogue on the server). */
export interface CustomProduct {
  id: number;
  slug: string;
  title: string;
  price: number | null;
  /** Price before a discount, shown crossed out (optional). */
  regularPrice?: number | null;
  image?: string;
  /** Catalogue categories (site.categories ids) – decide where the product is listed. */
  categoryIds: number[];
  shape: 'rect' | 'round';
  /** Stamp area in mm; width only for a round stamp. Empty = not designable online. */
  width?: number | null;
  height?: number | null;
  rowsCount: string;
  shortDescription: string;
  /** Plain text; blank lines separate paragraphs. */
  description: string;
  hidden?: boolean;
  createdAt: string;
}

/** The stamp area text the catalogue reads ("47*18", "קוטר 40"). */
export function customStampArea(p: Pick<CustomProduct, 'shape' | 'width' | 'height'>): string | null {
  if (!p.width) return null;
  return p.shape === 'round' ? `קוטר ${p.width}` : `${p.width}*${p.height || p.width}`;
}

export interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  whatsappNumber: string;
  ordersEmail: string;
  hours: string;
  announcement: string;
}

export interface AdminSettings {
  pricing: PricingSettings;
  coupons: AdminCoupon[];
  products: Record<string, ProductOverride>;
  customProducts: CustomProduct[];
  site: SiteSettings;
}

export type SettingsKey = keyof AdminSettings;

/** The values shipped in code – what "reset" goes back to. */
export const BASE_PRICING: PricingSettings = {
  ink: { ...DEFAULT_RULES.ink },
  frame: DEFAULT_RULES.frame,
  logo: DEFAULT_RULES.logo,
  onlineDesignPct: DEFAULT_RULES.onlineDesignPct,
  rewardPct: DEFAULT_RULES.rewardPct,
  quantityTiers: DEFAULT_RULES.quantityTiers.map((t) => ({ ...t })),
  shipping: DEFAULT_RULES.shipping.map((s) => ({ ...s, active: true })),
  addons: ADDONS.map((a) => ({ id: a.id, price: a.price, pctOfUnit: a.pctOfUnit, active: true })),
};

export const BASE_SITE: SiteSettings = {
  phone: SITE.phone,
  email: SITE.email,
  address: SITE.address,
  whatsappNumber: '972507707715',
  ordersEmail: SITE.email,
  hours: SITE.hours,
  announcement: '',
};

export function withDefaults(s: Partial<AdminSettings> | null | undefined): AdminSettings {
  const p = s?.pricing;
  return {
    pricing: {
      ...BASE_PRICING,
      ...(p ?? {}),
      ink: { ...BASE_PRICING.ink, ...(p?.ink ?? {}) },
      // New add-ons added in code appear automatically; saved ones keep their values.
      addons: BASE_PRICING.addons.map((a) => ({ ...a, ...(p?.addons?.find((x) => x.id === a.id) ?? {}) })),
      // Shipping methods added in code appear automatically (after the saved ones); saved values win.
      shipping: [
        ...(p?.shipping ?? []).map((m) => ({ ...(BASE_PRICING.shipping.find((b) => b.id === m.id) ?? {}), ...m })),
        ...BASE_PRICING.shipping.filter((b) => !p?.shipping?.some((m) => m.id === b.id)),
      ],
    },
    coupons: s?.coupons ?? [],
    products: s?.products ?? {},
    customProducts: s?.customProducts ?? [],
    site: { ...BASE_SITE, ...(s?.site ?? {}) },
  };
}

/** Public part (safe for the browser): no coupon codes, no product overrides. */
export type PublicSettings = Pick<AdminSettings, 'pricing' | 'site'>;

const ADDON_BASE = new Map(ADDONS.map((a) => [a.id, { price: a.price, pctOfUnit: a.pctOfUnit }]));

/** Applies pricing + contact settings to the shared defaults (idempotent). */
export function applyPublicSettings(s: PublicSettings) {
  const p = s.pricing;
  DEFAULT_RULES.ink = { ...p.ink };
  DEFAULT_RULES.frame = p.frame;
  DEFAULT_RULES.logo = p.logo;
  DEFAULT_RULES.onlineDesignPct = p.onlineDesignPct;
  DEFAULT_RULES.rewardPct = p.rewardPct;
  DEFAULT_RULES.quantityTiers = p.quantityTiers.filter((t) => t.min > 1 && t.discountPct > 0);
  DEFAULT_RULES.shipping = p.shipping.filter((m) => m.active !== false).map(({ active: _a, ...m }) => m);
  if (!DEFAULT_RULES.shipping.length) DEFAULT_RULES.shipping = BASE_PRICING.shipping.slice(0, 1).map(({ active: _a, ...m }) => m);
  for (const a of ADDONS) {
    const v = p.addons.find((x) => x.id === a.id);
    const base = ADDON_BASE.get(a.id)!;
    a.active = v ? v.active : true;
    if (base.pctOfUnit != null) a.pctOfUnit = v?.pctOfUnit ?? base.pctOfUnit;
    else a.price = v?.price ?? base.price;
  }

  const site = s.site;
  SITE.phone = site.phone;
  SITE.phoneHref = `tel:${site.phone.replace(/[^\d+]/g, '')}`;
  SITE.email = site.email;
  SITE.address = site.address;
  SITE.whatsapp = `https://api.whatsapp.com/send?phone=${site.whatsappNumber.replace(/\D/g, '')}&text=${encodeURIComponent('היי, הגעתי מאתר stamp2go, אשמח שתכינו לי חותמת עכשיו :) תודה')}`;
  SITE.waze = `https://waze.com/ul?q=${encodeURIComponent(site.address)}`;
  SITE.hours = site.hours;
  SITE.ordersEmail = site.ordersEmail;
  SITE.announcement = site.announcement;
}
