import type { Metadata } from 'next';
import { DEFAULT_RULES } from '@/lib/pricing';
import { publicRules } from '@/lib/public-rules';
import { getPaymentProvider } from '@/server/payments';
import { CheckoutForm } from './CheckoutForm';
import { ensureSettings } from '@/server/settings';

export const metadata: Metadata = { title: 'קופה', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  await ensureSettings();
  const provider = getPaymentProvider();
  return <CheckoutForm shipping={DEFAULT_RULES.shipping} rules={publicRules(DEFAULT_RULES)} paymentLabel={provider.label} manual={provider.id === 'manual'} />;
}
