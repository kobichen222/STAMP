import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DEFAULT_RULES } from '@/lib/pricing';
import { publicRules } from '@/lib/public-rules';
import { ensureSettings } from '@/server/settings';
import { CartView } from './CartView';

export const metadata: Metadata = { title: 'סל הקניות', robots: { index: false } };
// The live pricing rules (admin edits) are read per request, as in the checkout.
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  // ensureSettings applies the admin's rules to DEFAULT_RULES in place; publicRules drops the coupon list.
  await ensureSettings();
  return (
    <Suspense>
      <CartView rules={publicRules(DEFAULT_RULES)} />
    </Suspense>
  );
}
