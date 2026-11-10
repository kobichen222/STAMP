import { after, NextResponse } from 'next/server';
import { sweepAbandoned } from '@/server/abandoned';
import { quoteCart } from '@/lib/pricing';
import { pricingRulesFor } from '@/server/orders/service';

/** Cart totals with shipping + coupon, computed with the server's pricing rules. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { lineTotals?: number[]; shippingId?: string; couponCode?: string };
  const q = quoteCart((body.lineTotals ?? []).map(Number).filter(Number.isFinite), { shippingId: body.shippingId, couponCode: body.couponCode || undefined }, await pricingRulesFor(body.couponCode));
  // Site traffic also drives the abandoned-checkout reminders (throttled inside).
  after(() => sweepAbandoned().catch((e) => console.error('[abandoned] sweep', e)));
  return NextResponse.json(q);
}
