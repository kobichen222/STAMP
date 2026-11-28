import type { PricingRules } from '@/lib/pricing';

/**
 * The pricing rules a page may hand to the browser: the live rules (admin edits included) without the coupon
 * list, which must never leave the server. A client component prices with these instead of the bundle's static
 * defaults, so a card, the cart and the checkout always agree with what the server will charge.
 */
export function publicRules(rules: PricingRules): PricingRules {
  return { ...rules, coupons: [] };
}
