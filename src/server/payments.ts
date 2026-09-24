import 'server-only';
import type { Order } from './orders/types';

/**
 * Payment provider abstraction. The MVP ships with "manual" (pay by phone /
 * at pickup, as the studio does today). A hosted-payment-page provider
 * (e.g. an Israeli clearing company) implements the same interface:
 *   start() → redirect URL, and a webhook route that calls markPaid() with
 *   the provider's payment id (idempotent – spec §149–150).
 */
export interface PaymentStart {
  type: 'manual' | 'redirect';
  redirectUrl?: string;
  instructions?: string;
}

export interface PaymentProvider {
  id: string;
  label: string;
  start(order: Order, returnUrl: string): Promise<PaymentStart>;
}

const manual: PaymentProvider = {
  id: 'manual',
  label: 'תשלום בטלפון או באיסוף',
  async start() {
    return { type: 'manual', instructions: 'נציג יחזור אליכם לתשלום מאובטח בטלפון, או שתשלמו באיסוף העצמי.' };
  },
};

export function getPaymentProvider(): PaymentProvider {
  // Add real providers here and select with PAYMENT_PROVIDER.
  return manual;
}

/** When payment is manual, production may start before payment (studio policy). */
export const manualAutoProduction = () => process.env.MANUAL_PAYMENT_AUTO_PRODUCTION !== 'false';
