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

/**
 * Line items for Tranzila's documents module (tax invoice / receipt issued with
 * the charge): u71=1 + json_purchase_data. Prices include VAT. Coupon discounts
 * are spread over the lines so the lines always add up to the charged sum.
 */
export function tranzilaPurchaseData(order: Order): { product_name: string; product_quantity: number; product_price: number }[] {
  const lines = order.items.map((i) => ({ name: `${i.productName} ${i.size} ×${i.quantity}`, amount: i.total }));
  if (order.shippingPrice > 0) lines.push({ name: order.shipping.label, amount: order.shippingPrice });
  const gross = lines.reduce((s, l) => s + l.amount, 0);
  const k = gross > 0 ? order.total / gross : 1;
  const out = lines.map((l) => ({ product_name: l.name.slice(0, 100), product_quantity: 1, product_price: Math.round(l.amount * k * 100) / 100 }));
  const diff = Math.round((order.total - out.reduce((s, l) => s + l.product_price, 0)) * 100) / 100;
  if (out.length && diff) out[out.length - 1].product_price = Math.round((out[out.length - 1].product_price + diff) * 100) / 100;
  return out;
}

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
      // Documents module: invoice / receipt with the order lines, sent to the customer's e-mail.
      u71: '1',
      json_purchase_data: JSON.stringify(tranzilaPurchaseData(order)),
      // Shown inside the checkout (iframe): no Tranzila logo, our button colour.
      nologo: '1',
      trButtonColor: '2457ff',
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
