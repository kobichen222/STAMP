import 'server-only';
import { SITE } from '@/lib/config';
import { DEFAULT_RULES } from '@/lib/pricing';
import type { Order } from '../orders/types';

/**
 * ZigZag shipments through DataLogics ("Shipping API", route-driven REST:
 * POST {base}/w_create_shipping | w_cancel_shipping | w_get_shipping_status).
 *
 * Environment (Vercel → Settings → Environment Variables – never in code):
 *   DATALOGICS_TOKEN     API token of the merchant account (required; TOKEN_SWAGGER / SWAGGER_TOKEN are accepted too)
 *   DATALOGICS_API_URL   base URL, default https://connect.datalogics.co.il/rest
 *   DATALOGICS_SUPPLIER  optional shipping_push_supplier (ZigZag platform id at DataLogics)
 *   DATALOGICS_SUPPLIER_CODES optional JSON {"28973":"code",…} – shipping_push_supplier_code per ZigZag card
 * The ZigZag customer card of the order's shipping method is sent as
 * shipping_push_supplier_id, so every service goes out under its own card.
 */
const apiToken = () => {
  const env = process.env;
  // Any name with TOKEN and SWAGGER / DATALOGICS (TOKEN_SWAGGER, SWAGGER_TOKEN, a Vercel prefix …).
  const key = ['DATALOGICS_TOKEN', 'TOKEN_SWAGGER', 'SWAGGER_TOKEN'].find((k) => env[k]) ?? Object.keys(env).find((k) => /TOKEN/i.test(k) && /SWAGGER|DATALOGICS/i.test(k) && env[k]);
  return ((key && env[key]) || '').trim();
};

export const datalogicsConfigured = () => !!apiToken();

const base = () => (process.env.DATALOGICS_API_URL || 'https://connect.datalogics.co.il/rest').replace(/\/$/, '');

/** The ZigZag card of the order – stored at checkout, or from its shipping method (older orders). */
export const carrierCardFor = (o: Pick<Order, 'shipping'>): string | undefined =>
  o.shipping.carrierAccount ?? DEFAULT_RULES.shipping.find((m) => m.id === o.shipping.method)?.carrierAccount;

export class ShippingApiError extends Error {}

/** ZigZag's platform number in DataLogics (w_get_shipping_companies → 52 "זיגזג ZigZag"). */
const ZIGZAG_PLATFORM = 52;

/** DataLogics keeps a numeric order id; the order's creation second is unique enough and stable. */
export const numericOrderId = (o: Pick<Order, 'createdAt'>) => Math.floor(new Date(o.createdAt).getTime() / 1000);

async function call<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const token = apiToken();
  if (!token) throw new ShippingApiError('חיבור לזיג זג לא הוגדר (TOKEN_SWAGGER)');
  // The router serves each action under a w_ prefix (/rest/w_create_shipping); the bare name answers empty.
  const res = await fetch(`${base()}/w_${action}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token, ...body }),
    signal: AbortSignal.timeout(25_000),
  }).catch((e) => {
    throw new ShippingApiError(`אין חיבור לשרת המשלוחים (${e instanceof Error ? e.message : e})`);
  });
  const text = await res.text();
  // DataLogics answers 200 with an empty body when the token matches no merchant account.
  if (res.ok && !text.trim()) throw new ShippingApiError('שרת המשלוחים החזיר תשובה ריקה – הטוקן (TOKEN_SWAGGER) לא מזוהה או שהחשבון לא הופעל ב-DataLogics');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ShippingApiError(`תשובה לא צפויה משרת המשלוחים (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  console.log('[datalogics]', action, res.status, text.slice(0, 500));
  if (!res.ok) throw new ShippingApiError(`שרת המשלוחים החזיר שגיאה (HTTP ${res.status}): ${JSON.stringify(data).slice(0, 200)}`);
  return data as T;
}

function supplierCode(card: string): string | undefined {
  try {
    return (JSON.parse(process.env.DATALOGICS_SUPPLIER_CODES || '{}') as Record<string, string>)[card];
  } catch {
    return undefined;
  }
}

/** "Herzl 10" → street + house number (DataLogics takes the house separately). */
export function splitStreet(street: string): { street: string; house: string } {
  const m = /^(.*?)[\s,]+(\d+[\wא-ת]?(?:\/\d+)?)\s*$/.exec(street.trim());
  return m ? { street: m[1].trim(), house: m[2] } : { street: street.trim(), house: '' };
}

const zigzagMethod = (supplier: number, card: string) => ({
  shipping_push_supplier: supplier,
  shipping_push_supplier_id: card,
  ...(supplierCode(card) ? { shipping_push_supplier_code: supplierCode(card) } : {}),
});

/** The studio's pickup location (sender) – sent with every shipment. */
const ORIGIN = {
  enabled: true,
  name: 'ראשי',
  label: 'חתום ונעול – Stamp2Go',
  city: 'רמת גן',
  street: 'הרא"ה',
  house: '3',
  phone: '036733770',
  email: 'mira@stamp2go.co.il',
};

export function createShippingPayload(o: Order) {
  const [first, ...rest] = o.customer.name.trim().split(/\s+/);
  const addr = o.shipping.address;
  const locker = o.shipping.method === 'locker';
  const { street, house } = splitStreet(locker ? '' : (addr?.street ?? ''));
  const card = carrierCardFor(o);
  const supplier = Number(process.env.DATALOGICS_SUPPLIER || ZIGZAG_PLATFORM);
  const weight = Number(process.env.DATALOGICS_WEIGHT) || 0.5;
  const units = Math.max(1, o.items.reduce((n, i) => n + i.quantity, 0));
  const products = o.items.map((i) => ({
    sku: i.productSlug ?? i.productName,
    name: `${i.productName} ${i.size}`,
    quantity: i.quantity,
    price: i.unitPrice ?? 0,
    total: i.total ?? 0,
    weight: Math.round((weight / units) * 1000) / 1000,
  }));
  // For the courier: pickup point, address notes and the customer's note first; the products once (short).
  const comment = [
    locker && addr?.street ? `נקודת מסירה מועדפת: ${addr.street}` : '',
    addr?.notes ?? '',
    o.notes ? `הערת לקוח: ${o.notes}` : '',
    o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', '),
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 250);
  // ZigZag only accepts a complete shipment: weight, date and a full pickup location are required.
  const shippingDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
  // The full WooCommerce-style address (DataLogics reads that shape) – shipping and billing alike.
  const recipient = {
    first_name: first ?? o.customer.name,
    last_name: rest.join(' ') || (first ?? o.customer.name),
    email: o.customer.email ?? '',
    phone: israeliPhone(o.customer.phone),
    company: o.customer.company ?? '',
    country: 'IL',
    state: '',
    city: addr?.city ?? '',
    address_1: street,
    address_2: '',
    street,
    house,
    postcode: addr?.zip ?? '',
  };
  return {
    url: SITE.url,
    order: {
      id: numericOrderId(o),
      number: o.id,
      weight,
      shipping_date: shippingDate,
      packs: 1,
      ref: card,
      comment,
      house,
      weight_unit: 'kg',
      currency: 'ILS',
      total: o.total ?? 0,
      shipping_total: o.shippingPrice ?? o.shipping.price ?? 0,
      payment_method: o.paymentMethod ?? '',
      customer_note: o.notes ?? '',
      shipping: recipient,
      billing: recipient,
      products,
    },
    ...(card
      ? {
          settings: {
            // Both the flat keys and shipping_method[0] – DataLogics reads either, depending on the merchant setup.
            ...zigzagMethod(supplier, card),
            shipping_method: [zigzagMethod(supplier, card)],
            locations: [ORIGIN],
          },
        }
      : {}),
  };
}

export interface ShipmentResult {
  trackingNumber: string;
  labelUrl?: string;
  platform?: string;
}

type CreateReply = { success?: number | boolean; tracking_number?: string | number; label_url?: string; platform_name?: string; msg?: string; error?: string };

/**
 * The payload variants tried in order. DataLogics answers a bare "התרחשה שגיאה" when a setting we send
 * does not match the merchant's saved setup, while the same order broadcasts fine from their panel with
 * the saved settings – so on that answer we retry with fewer of our own settings. Retrying is safe:
 * DataLogics keys the shipment by order.id and returns an existing one instead of a duplicate.
 */
export function shippingAttempts(o: Order): { name: string; payload: ReturnType<typeof createShippingPayload> }[] {
  const full = createShippingPayload(o);
  const out: { name: string; payload: ReturnType<typeof createShippingPayload> }[] = [{ name: 'full', payload: full }];
  if (!full.settings) return out;
  const card = carrierCardFor(o)!;
  const supplier = full.settings.shipping_push_supplier;
  const { locations: _l, ...noLoc } = full.settings;
  void _l;
  out.push({ name: 'no-locations', payload: { ...full, settings: noLoc } as typeof full });
  const bare = { shipping_push_supplier: supplier, shipping_push_supplier_id: card };
  out.push({ name: 'card-only', payload: { ...full, settings: { ...bare, shipping_method: [bare] } } as typeof full });
  // The account's own saved settings – only for the regular home-courier card, so no other service is used by mistake.
  if (card === '28973') {
    const { settings: _s, ...rest } = full;
    void _s;
    out.push({ name: 'account-defaults', payload: rest as typeof full });
  }
  return out;
}

export async function createShipment(o: Order): Promise<ShipmentResult> {
  let last: CreateReply = {};
  for (const a of shippingAttempts(o)) {
    const r = await call<CreateReply>('create_shipping', a.payload);
    if (r.success && r.tracking_number) {
      if (a.name !== 'full') console.log('[datalogics] shipment created with variant', a.name, o.id);
      return { trackingNumber: String(r.tracking_number), labelUrl: r.label_url || undefined, platform: r.platform_name || undefined };
    }
    last = r;
    // Only the generic error is worth another shape; a specific message (bad address, card …) is shown as is.
    if (r.msg && r.msg !== 'התרחשה שגיאה') break;
  }
  throw new ShippingApiError(last.msg || last.error || `המשלוח לא נוצר: ${JSON.stringify(last).slice(0, 200)}`);
}

export async function cancelShipment(o: Order): Promise<void> {
  const r = await call<{ success?: number | boolean; msg?: string }>('cancel_shipping', { order: { id: numericOrderId(o) } });
  if (!r.success) throw new ShippingApiError(r.msg || 'ביטול המשלוח נכשל');
}

export async function shipmentStatus(o: Order): Promise<{ status: string; date: string }[]> {
  const r = await call<{ success?: number | boolean; data?: { status?: string; date?: string }[]; msg?: string }>('get_shipping_status', {
    order_id: o.id,
    ...(o.shipping.trackingNumber ? { tracking_number: o.shipping.trackingNumber } : {}),
  });
  if (!r.success) throw new ShippingApiError(r.msg || 'לא התקבל סטטוס');
  return (r.data ?? []).map((d) => ({ status: String(d.status ?? ''), date: String(d.date ?? '') }));
}

/** ZigZag wants a local Israeli number (05XXXXXXXX / 0X-XXXXXXX), not +972… */
export function israeliPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('972')) return `0${d.slice(3).replace(/^0/, '')}`;
  return d;
}
