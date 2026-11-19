/**
 * WhatsApp notifications (Green API): numbers become chat ids only when they are
 * mobiles, nothing is sent while no instance is configured, and each event has its text.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { whatsappText } from '@/server/notifications';
import type { Order } from '@/server/orders/types';
import { sendWhatsApp, staffChats, toChatId, whatsappCustomer, whatsappStaff } from '@/server/whatsapp';

const order = {
  id: 'ORD-TEST-1',
  token: 'tok',
  total: 150.1,
  customer: { name: 'יעל דגן', phone: '050-123 4567' },
  items: [{ productName: 'חותמת פרינט 30', size: '47×18 מ"מ', quantity: 2, total: 150.1 }],
  shipping: { method: 'pickup', label: 'איסוף עצמי' },
} as unknown as Order;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('chat ids', () => {
  it('reads Israeli mobiles in any spelling', () => {
    for (const p of ['050-123 4567', '0501234567', '+972 50-123-4567', '972501234567', '501234567', '00972501234567', '+9720501234567']) expect(toChatId(p)).toBe('972501234567@c.us');
  });
  it('skips landlines, short and empty numbers', () => {
    for (const p of ['03-6733770', '036733770', '12345', '', null, 'abc', '1234567890']) expect(toChatId(p)).toBeNull();
  });
  it('keeps a full international number written with +', () => {
    expect(toChatId('+1 (415) 555-0100')).toBe('14155550100@c.us');
  });
  it('lists the staff numbers once each', () => {
    vi.stubEnv('WHATSAPP_ADMIN_TO', '0501234567, 050-1234567 ; 03-6733770\n0527654321');
    expect(staffChats()).toEqual(['972501234567@c.us', '972527654321@c.us']);
  });
});

describe('sending', () => {
  it('sends nothing while no instance is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('WHATSAPP_ADMIN_TO', '0501234567');
    expect(await whatsappCustomer('0501234567', 'x')).toBe(false);
    expect(await whatsappStaff('x')).toBe(0);
    await expect(sendWhatsApp('972501234567@c.us', 'x')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the message to the instance, and keeps the token out of errors', async () => {
    vi.stubEnv('GREEN_API_INSTANCE', '1101000001');
    vi.stubEnv('GREEN_API_TOKEN', 'secret-token');
    vi.stubEnv('GREEN_API_URL', 'https://7103.api.greenapi.com/');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ idMessage: 'M1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await whatsappCustomer('050-1234567', 'שלום')).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://7103.api.greenapi.com/waInstance1101000001/sendMessage/secret-token');
    expect(JSON.parse(String(init.body))).toEqual({ chatId: '972501234567@c.us', message: 'שלום' });

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"bad"}', { status: 401 })));
    await expect(sendWhatsApp('972501234567@c.us', 'x')).rejects.toThrow(/401/);
    await sendWhatsApp('972501234567@c.us', 'x').catch((e: Error) => expect(e.message).not.toContain('secret-token'));
  });

  it('does not message customers when turned off, or a landline', async () => {
    vi.stubEnv('GREEN_API_INSTANCE', '1');
    vi.stubEnv('GREEN_API_TOKEN', 't');
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await whatsappCustomer('03-6733770', 'x')).toBe(false);
    vi.stubEnv('WHATSAPP_CUSTOMER', '0');
    expect(await whatsappCustomer('0501234567', 'x')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('texts', () => {
  it('order received: customer gets the order and tracking link, staff gets the customer and admin link', () => {
    const t = whatsappText('order.created', order);
    expect(t.customer).toContain('שלום יעל');
    expect(t.customer).toContain('ORD-TEST-1');
    expect(t.customer).toContain('/order/ORD-TEST-1/?t=tok');
    expect(t.customer).toContain('× 2');
    expect(t.staff).toContain('יעל דגן · 050-123 4567');
    expect(t.staff).toContain('/admin/orders/ORD-TEST-1/');
  });
  it('ready: pickup gets the address, a delivery does not', () => {
    expect(whatsappText('order.ready_for_pickup', order).customer).toContain('רמת גן');
    expect(whatsappText('order.ready_for_pickup', { ...order, shipping: { method: 'courier', label: 'שליח' } } as unknown as Order).customer).not.toContain('ניווט');
  });
  it('has no WhatsApp text for the quiet events', () => {
    expect(whatsappText('production.started', order)).toEqual({});
    expect(whatsappText('order.reward', order)).toEqual({});
  });
});
