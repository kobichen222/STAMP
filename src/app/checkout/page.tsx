import type { Metadata } from 'next';
import { DEFAULT_RULES } from '@/lib/pricing';
import { getPaymentProvider } from '@/server/payments';
import { CheckoutForm } from './CheckoutForm';

export const metadata: Metadata = { title: 'קופה', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  const provider = getPaymentProvider();
  return <CheckoutForm shipping={DEFAULT_RULES.shipping} paymentLabel={provider.label} manual={provider.id === 'manual'} />;
}
