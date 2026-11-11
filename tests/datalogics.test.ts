/** ZigZag shipments through DataLogics: request shape and response handling (fetch mocked). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/server/orders/types';
import { cancelShipment, createShipment, createShippingPayload, ShippingApiError, siteUrls, splitStreet } from '@/server/shipping/datalogics';

const order = {
  id: 'ORD-261026-AB12',
  createdAt: '2026-10-26T10:00:00.000Z',
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
    expect(p.order.id).toBe(Date.parse('2026-10-26T10:00:00.000Z') / 1000);
    expect(p.order.number).toBe('ORD-261026-AB12');
    expect(p.order.shipping).toMatchObject({ first_name: 'ישראל', last_name: 'ישראלי כהן', phone: '0501234567', city: 'חיפה', address_1: 'הרצל', house: '10' });
    expect(p.order.products[0]).toMatchObject({ sku: 'print-r-540', quantity: 2 });
    expect(p.settings?.shipping_method[0]).toEqual({ shipping_push_supplier: 62, shipping_push_supplier_id: '28973', shipping_push_supplier_code: 'ABC' });
  });

  it('defaults to the ZigZag platform', () => {
    const p = createShippingPayload(order);
    expect(p.settings).toMatchObject({ shipping_push_supplier: 52, shipping_push_supplier_id: '28973' });
  });

  it('creates a shipment and returns the tracking number', async () => {
    vi.stubEnv('DATALOGICS_TOKEN', 'tok');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: 1, tracking_number: 987654, label_url: 'https://x/label.pdf', platform_name: 'ZigZag' })));
    vi.stubGlobal('fetch', fetchMock);
    const r = await createShipment(order);
    expect(r).toEqual({ trackingNumber: '987654', labelUrl: 'https://x/label.pdf', platform: 'ZigZag' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://connect.datalogics.co.il/rest/w_create_shipping?token=tok');
    expect(JSON.parse(String(init.body)).token).toBe('tok');
  });

  it('reports API failures', async () => {
    vi.stubEnv('DATALOGICS_TOKEN', 'tok');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: 0, msg: 'כתובת לא תקינה' }))));
    await expect(createShipment(order)).rejects.toThrow('כתובת לא תקינה');
    await expect(cancelShipment(order)).rejects.toBeInstanceOf(ShippingApiError);
  });

  it('retries the generic error with fewer of our settings', async () => {
    vi.stubEnv('DATALOGICS_TOKEN', 'tok');
    const replies = [{ success: 0, msg: 'התרחשה שגיאה' }, { success: 0, msg: 'התרחשה שגיאה' }, { success: 0, msg: 'התרחשה שגיאה' }, { success: 1, tracking_number: 42 }];
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(replies.shift())));
    vi.stubGlobal('fetch', fetchMock);
    const r = await createShipment(order);
    expect(r.trackingNumber).toBe('42');
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, RequestInit])[1].body)));
    expect(bodies[0].settings).toEqual({});
    expect(bodies[0].order.shipping_method).toBe('שליח עד הבית');
    expect(bodies[1].settings.locations).toBeDefined();
    expect(bodies[2].settings.locations).toBeUndefined();
    expect(bodies[3].settings).toEqual({ shipping_push_supplier: 52, shipping_push_supplier_id: '28973', shipping_method: [{ shipping_push_supplier: 52, shipping_push_supplier_id: '28973' }] });
  });

  it('falls back to the account settings only for the home-courier card', async () => {
    vi.stubEnv('DATALOGICS_TOKEN', 'tok');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: 0, msg: 'התרחשה שגיאה' })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(createShipment(order)).rejects.toThrow('התרחשה שגיאה');
    const perUrl = fetchMock.mock.calls.length / siteUrls().length;
    expect(perUrl).toBe(5);
    expect(JSON.parse(String((fetchMock.mock.calls[4] as unknown as [string, RequestInit])[1].body)).settings).toBeUndefined();
    fetchMock.mockClear();
    const express = { ...order, shipping: { ...order.shipping, method: 'express', carrierAccount: '28974' } } as Order;
    await expect(createShipment(express)).rejects.toThrow();
    expect(fetchMock.mock.calls.length / siteUrls().length).toBe(4);
  });

  it('tries the other forms of the site address when the account is not found', async () => {
    vi.stubEnv('DATALOGICS_TOKEN', 'tok');
    const urls: string[] = [];
    const fetchMock = vi.fn(async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      urls.push(b.url);
      if (b.url === 'https://stamp2go.co.il' && b.settings && !Object.keys(b.settings).length) return new Response(JSON.stringify({ success: 1, tracking_number: 7 }));
      return new Response(JSON.stringify(b.settings && Object.keys(b.settings).length ? { success: 0, msg: 'התרחשה שגיאה' } : { success: 0, msg: 'אין חשבון על אתר זה (5)' }));
    });
    vi.stubGlobal('fetch', fetchMock);
    expect((await createShipment(order)).trackingNumber).toBe('7');
    expect(urls).toContain('https://www.stamp2go.co.il');
  });

  it('accepts the token as TOKEN_SWAGGER', async () => {
    vi.stubEnv('TOKEN_SWAGGER', 'sw');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: 1, tracking_number: 1 })));
    vi.stubGlobal('fetch', fetchMock);
    await createShipment(order);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain('token=sw');
  });

  it('refuses without a token', async () => {
    await expect(createShipment(order)).rejects.toThrow('TOKEN_SWAGGER');
  });
});
