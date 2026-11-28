// A stamp card's prices and texts that need no React: priced with the live rules the page hands down (never the
// bundle's static defaults), so the card says what the cart and the server will charge. Tested on their own.
import { formatPrice } from '@/lib/format';
import { quoteLine, type PricingRules } from '@/lib/pricing';
import type { Remedy } from '@/stamp-bot/card-types';
import type { StampCardData } from './StampCard';

/** One stamp on one body with these rules. Bot stamps carry no frame surcharge (decision). */
export const lineQuote = (basePrice: number, quantity: number, ink: string, rules: PricingRules) =>
  quoteLine({ basePrice, quantity, ink, designedOnline: true }, rules);

/** Line total of a stamp on one body. */
export const linePrice = (basePrice: number, quantity: number, ink: string, rules: PricingRules) => lineQuote(basePrice, quantity, ink, rules).total;

/** The card's line total, or null when it has nothing to order (no stamp, no body, or not orderable yet). */
export function cardTotal(c: StampCardData, rules: PricingRules): number | null {
  const b = c.stamp?.bodies.find((x) => x.slug === c.body);
  return c.stamp?.orderable && b ? linePrice(b.price, c.qty, c.stamp.ink, rules) : null;
}

/** The ink's surcharge (₪), 0 for an ink that costs nothing extra. */
export const inkExtra = (ink: string, rules: PricingRules) => rules.ink[ink] ?? 0;

/** The quantity tiers that really give a discount, smallest quantity first (the admin may save them in any order). */
function tiers(rules: PricingRules) {
  return rules.quantityTiers.filter((t) => t.min > 1 && t.discountPct > 0).sort((a, b) => a.min - b.min);
}

/**
 * The small line under the quantity. Below the first tier: the ladder ("2 ומעלה: 5% הנחה · 5 ומעלה: 10% · …").
 * At a tier: that discount with the unit price, and the next tier when there is one. '' = rules with no tiers.
 */
export function discountLine(qty: number, unitPrice: number, rules: PricingRules): string {
  const ts = tiers(rules);
  if (!ts.length) return '';
  const at = ts.filter((t) => qty >= t.min).at(-1);
  if (!at) return ts.map((t, i) => `${t.min} ומעלה: ${t.discountPct}%${i === 0 ? ' הנחה' : ''}`).join(' · ');
  const next = ts.find((t) => t.min > at.min);
  return `הנחת כמות ${at.discountPct}%: ${formatPrice(unitPrice)} ליחידה${next ? ` · ${next.min} ומעלה: ${next.discountPct}%` : ''}`;
}

/** The correction box's placeholder: an answer to the bot's question, or what the remedy of a blocked stamp asks for. */
export function fixPlaceholder(question: boolean, remedy: Remedy | undefined): string | undefined {
  if (question) return 'כתבו כאן את התשובה';
  if (remedy?.kind === 'missing') return `כתבו כאן: ${remedy.items}`;
  if (remedy?.kind === 'confirm') return 'או כתבו את המספר הנכון';
  return undefined;
}

/** The button that confirms the number(s) the card asks about. */
export const confirmLabel = (numbers: string[]) => (numbers.length > 1 ? 'המספרים נכונים' : 'המספר נכון');
