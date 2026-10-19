import 'server-only';
import type { Order } from './orders/types';

/**
 * Payment providers:
 *   tranzila – hosted payment page (direct.tranzila.com). The customer is sent
 *              to the terminal's page; Tranzila posts the result to our notify
 *              route (server to server) and returns the customer to the
 *              success / fail routes. Only notify marks an order paid.
 *   manual   – pay by phone / at pickup (PAYMENT_PROVIDER=manual).
 */
export interface PaymentStart {
  type: 'manual' | 'redirect';
  redirectUrl?: string;
  instructions?: string;
}

export interface PaymentProvider {
  id: string;
  label: string;
  /** `origin` is the site's own origin, for the return / notify addresses. */
  start(order: Order, origin: string): Promise<PaymentStart>;
}

const manual: PaymentProvider = {
  id: 'manual',
  label: 'תשלום בטלפון או באיסוף',
  async start() {
    return { type: 'manual', instructions: 'נציג יחזור אליכם לתשלום מאובטח בטלפון, או שתשלמו באיסוף העצמי.' };
  },
};

/** The terminal name is public (it is part of the payment page address). */
export const tranzilaTerminal = () => process.env.TRANZILA_TERMINAL || 'htvmvnavlbam';

/** Return / notify addresses on this site (also what goes in the terminal settings). */
export const tranzilaUrls = (origin: string) => ({
  success: `${origin}/api/payments/tranzila/return/?result=success`,
  fail: `${origin}/api/payments/tranzila/return/?result=fail`,
  notify: `${origin}/api/payments/tranzila/notify/`,
});

const tranzila: PaymentProvider = {
  id: 'tranzila',
  label: 'תשלום מאובטח בכרטיס אשראי',
  async start(order, origin) {
    const urls = tranzilaUrls(origin);
    const params = new URLSearchParams({
      sum: order.total.toFixed(2),
      currency: '1', // ILS
      cred_type: '1', // regular charge
      tranmode: 'A',
      lang: 'il',
      contact: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email ?? '',
      company: order.customer.company ?? '',
      pdesc: `Stamp2Go ${order.id}`,
      // Custom fields – Tranzila sends them back with the result.
      order_id: order.id,
      otk: order.token,
      success_url_address: urls.success,
      fail_url_address: urls.fail,
      notify_url_address: urls.notify,
    });
    return { type: 'redirect', redirectUrl: `https://direct.tranzila.com/${tranzilaTerminal()}/iframenew.php?${params}` };
  },
};

export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === 'manual' ? manual : tranzila;
}

/** When payment is manual, production may start before payment (studio policy). */
export const manualAutoProduction = () => process.env.MANUAL_PAYMENT_AUTO_PRODUCTION !== 'false';
