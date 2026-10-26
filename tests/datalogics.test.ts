/** ZigZag shipments through DataLogics: request shape and response handling (fetch mocked). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/server/orders/types';
import { cancelShipment, createShipment, createShippingPayload, ShippingApiError, splitStreet } from '@/server/shipping/datalogics';

const order = {
  id: 'ORD-261026-AB12',
  customer: { name: 'ישראל ישראלי כהן', phone: '050-123 4567', email: 'a@b.co' },
  shipping: { method: 'courier', label: 'שליח עד הבית', price: 35, address: { street: 'הרצל 10', city: 'חיפה', zip: '3300000' }, carrierAccount: '28973' },
  items: [{ productSlug: 'print-r-540', productName: 'PRINT R 540', size: '40 מ"מ', quantity: 2 }],
} as unknown as Order;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('DataLogics shipping', () => {
  it('splits street and house number', () => {
    expect(splitStreet('הרצל 10')).toEqual({ street: 'הרצל', house: '10' });
    expect(splitStreet('Herzl 10א')).toEqual({ street: 'Herzl', house: '10א' });
    expect(splitStreet('שדרות ירושלים')).toEqual({ street: 'שדרות ירושלים', house: '' });
  });

  it('builds the payload with the ZigZag card of the service', () => {
    vi.stubEnv('DATALOGICS_SUPPLIER', '62');
    vi.stubEnv('DATALOGICS_SUPPLIER_CODES', '{"28973":"ABC"}');
    const p = createShippingPayload(order);
    expect(p.order.id).toBe('ORD-261026-AB12');
    expect(p.order.shipping).toMatchObject({ first_name: 'ישראל', last_name: 'ישראלי כהן', phone: '0501234567', city: 'חיפה', address_1: 'הרצל', house: '10' });
    expect(p.order.products[0]).toMatchObject({ sku: 'print-r-540', quantity: 2 });
    expect(p.settings?.shipping_method[0]).toEqual({ shipping_push_supplier: 62, shipping_push_supplier_id: '28973', shipping_push_supplier_code: 'ABC' });
  });

  it('creates a shipment and returns the tracking number', async () => {
    vi.stubEnv('DATALOGICS_TOKEN', 'tok');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: 1, tracking_number: 987654, label_url: 'https://x/label.pdf', platform_name: 'ZigZag' })));
    vi.stubGlobal('fetch', fetchMock);
    const r = await createShipment(order);
    expect(r).toEqual({ trackingNumber: '987654', labelUrl: 'https://x/label.pdf', platform: 'ZigZag' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://connect.datalogics.co.il/rest/create_shipping?token=tok');
    expect(JSON.parse(String(init.body)).token).toBe('tok');
  });

  it('reports API failures', async () => {
    vi.stubEnv('DATALOGICS_TOKEN', 'tok');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: 0, msg: 'כתובת לא תקינה' }))));
    await expect(createShipment(order)).rejects.toThrow('כתובת לא תקינה');
    await expect(cancelShipment(order)).rejects.toBeInstanceOf(ShippingApiError);
  });

  it('refuses without a token', async () => {
    await expect(createShipment(order)).rejects.toThrow('DATALOGICS_TOKEN');
  });
});
