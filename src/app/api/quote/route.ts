import { NextResponse } from 'next/server';
import { quoteCart } from '@/lib/pricing';
import { pricingRules } from '@/server/orders/service';

/** Cart totals with shipping + coupon, computed with the server's pricing rules. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { lineTotals?: number[]; shippingId?: string; couponCode?: string };
  const q = quoteCart((body.lineTotals ?? []).map(Number).filter(Number.isFinite), { shippingId: body.shippingId, couponCode: body.couponCode || undefined }, pricingRules());
  return NextResponse.json(q);
}
