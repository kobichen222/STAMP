import type { PricingRules } from '@/lib/pricing';
import { StampBox } from './StampBox';

/**
 * The home page's call to act, defined once: the question, the input and the quiet line under it.
 * Rendered in the first screen (h1, focus on load) and in the closing band (h2); a change here changes both.
 * The heading id is `${idPrefix}-title`, so each section can label itself with it.
 * `rules` = the page's live pricing rules without the coupons (publicRules), handed to the box.
 */
export function StartBlock({
  as: Heading,
  idPrefix,
  focusOnLoad = false,
  fromPrice,
  rules,
}: {
  as: 'h1' | 'h2';
  idPrefix: string;
  focusOnLoad?: boolean;
  fromPrice: string | null;
  rules: PricingRules;
}) {
  return (
    <div className="w-full max-w-2xl">
      <Heading id={`${idPrefix}-title`} className="text-center text-3xl font-extrabold sm:text-5xl">
        איזו חותמת להכין לכם?
      </Heading>
      <div className="mt-8">
        <StampBox idPrefix={idPrefix} focusOnLoad={focusOnLoad} rules={rules} />
      </div>
      <p className="mt-4 text-center text-sm text-muted">{fromPrice
          ? `אפשר לכתוב כמה חותמות בהודעה אחת · רואים את החותמת לפני שמשלמים · החל מ-${fromPrice} ₪`
          : 'אפשר לכתוב כמה חותמות בהודעה אחת · רואים את החותמת לפני שמשלמים'}</p>
    </div>
  );
}
