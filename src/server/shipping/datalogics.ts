import 'server-only';
import { SITE } from '@/lib/config';
import type { Order } from '../orders/types';

/**
 * ZigZag shipments through DataLogics ("Shipping API", route-driven REST:
 * POST {base}/create_shipping | cancel_shipping | get_shipping_status).
 *
 * Environment (Vercel → Settings → Environment Variables – never in code):
 *   DATALOGICS_TOKEN     API token of the merchant account (required; SWAGGER_TOKEN is accepted too)
 *   DATALOGICS_API_URL   base URL, default https://connect.datalogics.co.il/rest
 *   DATALOGICS_SUPPLIER  optional shipping_push_supplier (ZigZag platform id at DataLogics)
 *   DATALOGICS_SUPPLIER_CODES optional JSON {"28973":"code",…} – shipping_push_supplier_code per ZigZag card
 * The ZigZag customer card of the order's shipping method is sent as
 * shipping_push_supplier_id, so every service goes out under its own card.
 */
const apiToken = () => {
  const env = process.env;
  const prefixed = Object.keys(env).find((k) => k.endsWith('SWAGGER_TOKEN') || k.endsWith('DATALOGICS_TOKEN'));
  return (env.DATALOGICS_TOKEN || env.SWAGGER_TOKEN || (prefixed && env[prefixed]) || '').trim();
};

export const datalogicsConfigured = () => !!apiToken();

const base = () => (process.env.DATALOGICS_API_URL || 'https://connect.datalogics.co.il/rest').replace(/\/$/, '');

export class ShippingApiError extends Error {}

async function call<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const token = apiToken();
  if (!token) throw new ShippingApiError('חיבור לזיג זג לא הוגדר (DATALOGICS_TOKEN / SWAGGER_TOKEN)');
  const res = await fetch(`${base()}/${action}?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ token, ...body }),
    signal: AbortSignal.timeout(25_000),
  }).catch((e) => {
    throw new ShippingApiError(`אין חיבור לשרת המשלוחים (${e instanceof Error ? e.message : e})`);
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ShippingApiError(`תשובה לא צפויה משרת המשלוחים (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
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

export function createShippingPayload(o: Order) {
  const [first, ...rest] = o.customer.name.trim().split(/\s+/);
  const addr = o.shipping.address;
  const locker = o.shipping.method === 'locker';
  const { street, house } = splitStreet(locker ? '' : (addr?.street ?? ''));
  const card = o.shipping.carrierAccount;
  const supplier = process.env.DATALOGICS_SUPPLIER ? Number(process.env.DATALOGICS_SUPPLIER) : undefined;
  const products = o.items.map((i) => ({ sku: i.productSlug, name: `${i.productName} ${i.size}`, quantity: i.quantity }));
  const comment = [
    locker && addr?.street ? `נקודת מסירה מועדפת: ${addr.street}` : '',
    addr?.notes ?? '',
    o.items.map((i) => `${i.productName} ×${i.quantity}`).join(', '),
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 250);
  return {
    url: SITE.url,
    order: {
      id: o.id,
      number: o.id,
      packs: 1,
      ref: card,
      comment,
      house,
      shipping: {
        first_name: first ?? o.customer.name,
        last_name: rest.join(' '),
        email: o.customer.email ?? '',
        phone: o.customer.phone.replace(/[^\d+]/g, ''),
        company: o.customer.company ?? '',
        city: addr?.city ?? '',
        address_1: street,
        house,
        postcode: addr?.zip ?? '',
      },
      products,
    },
    ...(card
      ? {
          settings: {
            shipping_method: [
              {
                ...(supplier ? { shipping_push_supplier: supplier } : {}),
                shipping_push_supplier_id: card,
                ...(supplierCode(card) ? { shipping_push_supplier_code: supplierCode(card) } : {}),
              },
            ],
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

export async function createShipment(o: Order): Promise<ShipmentResult> {
  const r = await call<{ success?: number | boolean; tracking_number?: string | number; label_url?: string; platform_name?: string; msg?: string; error?: string }>(
    'create_shipping',
    createShippingPayload(o),
  );
  if (!r.success || !r.tracking_number) throw new ShippingApiError(r.msg || r.error || `המשלוח לא נוצר: ${JSON.stringify(r).slice(0, 200)}`);
  return { trackingNumber: String(r.tracking_number), labelUrl: r.label_url || undefined, platform: r.platform_name || undefined };
}

export async function cancelShipment(o: Order): Promise<void> {
  const r = await call<{ success?: number | boolean; msg?: string }>('cancel_shipping', { order: { id: o.id } });
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
