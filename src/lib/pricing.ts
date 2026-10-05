/**
 * Pricing Engine. A price is never a single number: it is built from lines
 * (base, size, body, ink, logo, quantity tier, shipping, coupon, B2B tier) so
 * the customer sees exactly what they pay for, in real time, while designing.
 *
 * The rules below are the defaults; in production they are loaded from the
 * database (admin → Products / Pricing) and passed in as `rules`.
 */

export interface QuantityTier {
  min: number;
  /** Percent discount off the unit price. */
  discountPct: number;
}

export interface ShippingMethod {
  id: string;
  label: string;
  price: number;
  eta: string;
  freeFrom?: number;
}

export interface Coupon {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal?: number;
  expiresAt?: string;
}

export type PriceTier = 'retail' | 'business' | 'partner' | 'vip';

/** Extras offered in the order summary (per design line). */
export type AddonId = 'ink-bottle' | 'pad' | 'extra-body' | 'certified';

export interface Addon {
  id: AddonId;
  label: string;
  description: string;
  /** Fixed price (₪) – or, for extra-body, a percentage of the stamp's unit price. */
  price?: number;
  pctOfUnit?: number;
  /** Offered only for professional stamps (lawyers / accountants / notaries). */
  pro?: boolean;
  /** Turned off by the admin. */
  active?: boolean;
}

export const ADDONS: Addon[] = [
  { id: 'extra-body', label: 'גוף חותמת נוסף זהה', description: 'עותק נוסף של אותה חותמת – ב־10% הנחה', pctOfUnit: 90 },
  { id: 'pad', label: 'כרית דיו חלופית', description: 'כרית רזרבית לאותו דגם', price: 25 },
  { id: 'ink-bottle', label: 'בקבוקון דיו', description: 'דיו למילוי בצבע החותמת', price: 20 },
  { id: 'certified', label: 'חותמת ״נאמן למקור״', description: 'חותמת מוכנה לאימות מסמכים', price: 49, pro: true },
];

export type AddonSelection = Partial<Record<AddonId, number>>;

export interface PricingRules {
  /** Surcharge per ink colour (₪). */
  ink: Record<string, number>;
  /** Surcharge per body colour (₪). */
  body: Record<string, number>;
  /** One-time surcharge per item when a logo/graphic is used. */
  logo: number;
  /** Surcharge per stamp when the design has a frame (border). */
  frame: number;
  /** Discount for designing the stamp on the site (percent). */
  onlineDesignPct: number;
  /** Personal next-order reward issued after payment (percent). */
  rewardPct: number;
  quantityTiers: QuantityTier[];
  tierDiscountPct: Record<PriceTier, number>;
  shipping: ShippingMethod[];
  coupons: Coupon[];
}

export const DEFAULT_RULES: PricingRules = {
  ink: { black: 0, blue: 9, red: 9, green: 9, purple: 9 },
  body: { black: 0, grey: 0, blue: 0, red: 0 },
  logo: 0,
  frame: 9,
  onlineDesignPct: 5,
  rewardPct: 7,
  quantityTiers: [
    { min: 2, discountPct: 5 },
    { min: 5, discountPct: 10 },
    { min: 10, discountPct: 15 },
  ],
  tierDiscountPct: { retail: 0, business: 5, partner: 10, vip: 15 },
  shipping: [
    { id: 'pickup', label: 'איסוף עצמי – הרא״ה 3, רמת גן', price: 0, eta: 'אפשר עוד היום' },
    { id: 'courier', label: 'שליח עד הבית', price: 35, eta: '1–3 ימי עסקים', freeFrom: 300 },
    { id: 'express', label: 'שליח אקספרס (גוש דן)', price: 60, eta: 'עד 24 שעות' },
  ],
  coupons: [],
};

export interface LineInput {
  basePrice: number | null;
  quantity: number;
  ink?: string;
  body?: string;
  hasLogo?: boolean;
  hasFrame?: boolean;
  /** Designed in the online designer (5% discount). */
  designedOnline?: boolean;
  addons?: AddonSelection;
}

export interface PriceLine {
  label: string;
  amount: number;
}

export interface LineQuote {
  unitPrice: number;
  quantity: number;
  lines: PriceLine[];
  total: number;
  /** Price on request (product without a list price). */
  onRequest: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function tierFor(qty: number, rules: PricingRules) {
  return [...rules.quantityTiers].sort((a, b) => b.min - a.min).find((t) => qty >= t.min) ?? null;
}

export function quoteLine(input: LineInput, rules: PricingRules = DEFAULT_RULES, tier: PriceTier = 'retail'): LineQuote {
  if (input.basePrice == null) {
    return { unitPrice: 0, quantity: input.quantity, lines: [{ label: 'מחיר לפי הצעה', amount: 0 }], total: 0, onRequest: true };
  }
  const q = Math.max(1, Math.floor(input.quantity));
  const lines: PriceLine[] = [{ label: 'מחיר בסיס', amount: input.basePrice }];
  const ink = rules.ink[input.ink ?? 'black'] ?? 0;
  if (ink) lines.push({ label: 'צבע דיו', amount: ink });
  const body = rules.body[input.body ?? 'black'] ?? 0;
  if (body) lines.push({ label: 'צבע גוף', amount: body });
  const frame = input.hasFrame ? rules.frame : 0;
  if (frame) lines.push({ label: 'מסגרת', amount: frame });
  let unit = input.basePrice + ink + body + frame;

  const qTier = tierFor(q, rules);
  const pct = (qTier?.discountPct ?? 0) + (rules.tierDiscountPct[tier] ?? 0);
  if (pct) {
    const off = round2((unit * pct) / 100);
    lines.push({ label: qTier ? `הנחת כמות (${q}+ יח׳, ${pct}%)` : `הנחה עסקית (${pct}%)`, amount: -off });
    unit = round2(unit - off);
  }
  if (input.designedOnline && rules.onlineDesignPct) {
    const off = round2((unit * rules.onlineDesignPct) / 100);
    lines.push({ label: `הנחת עיצוב באתר (${rules.onlineDesignPct}%)`, amount: -off });
    unit = round2(unit - off);
  }
  let total = round2(unit * q);
  if (input.hasLogo && rules.logo) {
    lines.push({ label: 'עיבוד לוגו', amount: rules.logo });
    total = round2(total + rules.logo);
  }
  for (const a of ADDONS) {
    if (a.active === false) continue;
    const n = Math.max(0, Math.min(50, Math.floor(input.addons?.[a.id] ?? 0)));
    if (!n) continue;
    const each = a.pctOfUnit ? round2((unit * a.pctOfUnit) / 100) : (a.price ?? 0);
    lines.push({ label: n > 1 ? `${a.label} × ${n}` : a.label, amount: round2(each * n) });
    total = round2(total + each * n);
  }
  return { unitPrice: unit, quantity: q, lines, total, onRequest: false };
}

export interface CartQuote {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon?: Coupon;
  couponError?: string;
  shippingMethod: ShippingMethod;
  /** VAT included in total (Israeli VAT 18%; prices are VAT-inclusive). */
  vatIncluded: number;
}

export const VAT_RATE = 0.18;

export function quoteCart(
  lineTotals: number[],
  opts: { shippingId?: string; couponCode?: string; now?: Date } = {},
  rules: PricingRules = DEFAULT_RULES,
): CartQuote {
  const subtotal = round2(lineTotals.reduce((a, b) => a + b, 0));
  const shippingMethod = rules.shipping.find((s) => s.id === opts.shippingId) ?? rules.shipping[0];
  let discount = 0;
  let coupon: Coupon | undefined;
  let couponError: string | undefined;
  if (opts.couponCode) {
    const c = rules.coupons.find((x) => x.code.toLowerCase() === opts.couponCode!.trim().toLowerCase());
    const now = opts.now ?? new Date();
    if (!c) couponError = 'קוד קופון לא תקין';
    else if (c.expiresAt && new Date(c.expiresAt) < now) couponError = 'תוקף הקופון פג';
    else if (c.minSubtotal && subtotal < c.minSubtotal) couponError = `הקופון תקף מעל ₪${c.minSubtotal}`;
    else {
      coupon = c;
      discount = round2(c.type === 'percent' ? (subtotal * c.value) / 100 : Math.min(c.value, subtotal));
    }
  }
  const afterDiscount = subtotal - discount;
  const shipping = shippingMethod.freeFrom != null && afterDiscount >= shippingMethod.freeFrom ? 0 : shippingMethod.price;
  const total = round2(afterDiscount + shipping);
  return { subtotal, discount, shipping, total, coupon, couponError, shippingMethod, vatIncluded: round2(total - total / (1 + VAT_RATE)) };
}

/**
 * One source of truth for turning a designed stamp into pricing input – used
 * by the editor, the cart, checkout and the server (which recomputes it).
 * A frame on a rectangular stamp is an extra; the ring of a round stamp is
 * part of the product and never charged.
 */
export function lineInputFor(x: {
  basePrice: number | null;
  quantity: number;
  design: { shape: string; border: { style: string }; elements: { type: string }[] };
  ink?: string;
  body?: string;
  addons?: AddonSelection;
}): LineInput {
  return {
    basePrice: x.basePrice,
    quantity: x.quantity,
    ink: x.ink,
    body: x.body,
    hasLogo: x.design.elements.some((e) => e.type === 'image'),
    hasFrame: x.design.shape === 'rect' && x.design.border.style !== 'none',
    designedOnline: true,
    addons: x.addons,
  };
}
