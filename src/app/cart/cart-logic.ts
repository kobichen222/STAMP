// The cart page's pure rules: the green status line after the home page sends stamps, putting a removed line back,
// and what the summary says about delivery.
import { formatPrice } from '@/lib/format';
import { addressNeed, type ShippingMethod } from '@/lib/pricing';

/**
 * The cart's delivery texts, from the live shipping methods: the "משלוח" row (cheapest paid method, and a free
 * self pickup when there is one) and one line per method that turns free above a threshold. The cart does not
 * know the coupon (the threshold is checked after it), so it never says how far the cart is from the threshold.
 */
export function cartDeliveryText(shipping: ShippingMethod[]): { row: string; freeAbove: string[] } {
  const paid = shipping.filter((m) => m.price > 0);
  const free = shipping.find((m) => m.price <= 0);
  const cheapest = paid.length ? Math.min(...paid.map((m) => m.price)) : null;
  const freeText = free ? (addressNeed(free) === 'none' ? 'איסוף עצמי חינם' : `${free.label} חינם`) : null;
  const row = [cheapest != null ? `מ-${formatPrice(cheapest)}` : null, freeText].filter(Boolean).join(' · ') || 'יחושב בקופה';
  const freeAbove = paid.filter((m) => m.freeFrom != null && m.freeFrom > 0).map((m) => `${m.label} חינם בהזמנה מעל ${formatPrice(m.freeFrom)}`);
  return { row, freeAbove };
}

/** The green line at the top of the cart, from the `added` / `updated` query parameters, or null for none. */
export function cartStatusText(added: string | null, updated: string | null): string | null {
  // `added` keeps today's wording, and wins when both are there
  if (added) return Number(added) > 1 ? `${added} חותמות נוספו לסל` : 'החותמת נוספה לסל';
  const u = Number(updated);
  if (!updated || !(u >= 1)) return null;
  return u > 1 ? `${u} חותמות עודכנו בסל` : 'החותמת עודכנה בסל';
}

/** `list` with `item` put back at index `at` (clamped to the list). A line whose id is already there is not doubled. */
export function insertAt<T extends { id: string }>(list: T[], item: T, at: number): T[] {
  if (list.some((x) => x.id === item.id)) return list;
  const i = Math.max(0, Math.min(Number.isFinite(at) ? Math.floor(at) : list.length, list.length));
  return [...list.slice(0, i), item, ...list.slice(i)];
}
