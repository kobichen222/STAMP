import { NextResponse } from 'next/server';
import { quoteCart } from '@/lib/pricing';
import { pricingRulesFor } from '@/server/orders/service';

/** Cart totals with shipping + coupon, computed with the server's pricing rules. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { lineTotals?: number[]; couponExempt?: number; shippingId?: string; couponCode?: string };
  const q = quoteCart((body.lineTotals ?? []).map(Number).filter(Number.isFinite), { shippingId: body.shippingId, couponCode: body.couponCode || undefined, couponExempt: Number.isFinite(Number(body.couponExempt)) ? Number(body.couponExempt) : 0 }, await pricingRulesFor(body.couponCode));
  return NextResponse.json(q);
}
