/** The customer's "order received" e-mail: pre-header, section order, pickup vs delivery, pictures, plain text, reply-to. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mails } = vi.hoisted(() => ({ mails: [] as { to?: string[]; subject: string; html: string; text?: string; replyTo?: string }[] }));
vi.mock('@/lib/mail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mail')>()),
  sendMail: vi.fn(async (m: { to?: string[]; subject: string; html: string }) => {
    mails.push(m);
  }),
}));
vi.mock('@/server/whatsapp', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/whatsapp')>()),
  whatsappCustomer: vi.fn(async () => false),
  whatsappStaff: vi.fn(async () => 0),
}));

import { SITE } from '@/lib/config';
import { notify, orderCreatedCustomer } from '@/server/notifications';
import type { Order, OrderItem } from '@/server/orders/types';

const item = (n: number, extra: Partial<OrderItem> = {}): OrderItem =>
  ({
    id: `i${n}`,
    productName: `חותמת ${n}`,
    size: '38x14',
    width: 38,
    height: 14,
    ink: 'black',
    quantity: 1,
    unitPrice: 89,
    total: 89,
    designVersionId: 'v',
    design: {},
    profileId: 'p',
    mirror: true,
    preflight: { ready: true, score: 100, errors: [], warnings: [] },
    files: [],
    ...extra,
  }) as OrderItem;

const order = (extra: Partial<Order> = {}): Order =>
  ({
    id: 'ORD-261128-AB12',
    token: 'tok123',
    idempotencyKey: 'k',
    createdAt: '2026-11-28T10:00:00Z',
    updatedAt: '2026-11-28T10:00:00Z',
    status: 'PAID',
    paymentStatus: 'paid',
    paymentMethod: 'tranzila',
    customer: { name: 'דנה לוי', phone: '0501234567', email: 'dana@example.com' },
    shipping: { method: 'courier', label: 'שליח עד הבית', price: 35, eta: 'עד 3 ימי עסקים', address: { street: 'הרצל 1', city: 'תל אביב', zip: '6100000' } },
    items: [item(1)],
    subtotal: 89,
    discount: 0,
    shippingPrice: 35,
    total: 124,
    staffNotes: [],
    audit: [],
    notificationsSent: [],
    ...extra,
  }) as Order;

const pickup = { method: 'pickup', label: 'איסוף עצמי – הרא״ה 3, רמת גן', price: 0 };
const master = [{ name: 'm.svg', kind: 'master-svg' as const, size: 1, path: 'm' }];

describe('pre-header', () => {
  it('one stamp', () => {
    expect(orderCreatedCustomer(order()).parts.preheader).toBe('מספר הזמנה ORD-261128-AB12 · חותמת אחת · ₪124');
  });
  it('several stamps (quantities summed)', () => {
    const o = order({ items: [item(1, { quantity: 2, total: 170 }), item(2)], total: 294 });
    expect(orderCreatedCustomer(o).parts.preheader).toBe('מספר הזמנה ORD-261128-AB12 · 3 חותמות · ₪294');
  });
});

describe('body', () => {
  it('sections in order: opening, button, how, stamps, totals, contact; no button after the body', () => {
    const { parts } = orderCreatedCustomer(order());
    const at = (id: string) => parts.body.indexOf(`<!--section:${id}-->`);
    const ids = ['opening', 'button', 'how', 'stamps', 'totals', 'contact'];
    for (const id of ids) expect(at(id), id).toBeGreaterThan(-1);
    expect(ids.map(at)).toEqual([...ids.map(at)].sort((a, b) => a - b));
    expect(parts.cta).toBeUndefined();
    expect(parts.note).toBeUndefined();
    // the opening and the payment sentence stay as they were
    expect(parts.body.indexOf('איזה כיף שבחרת בנו')).toBeLessThan(at('button'));
    expect(parts.body.indexOf('התשלום אושר והעיצוב נשמר')).toBeLessThan(at('button'));
    expect(parts.body.slice(at('button'), at('how'))).toContain(`href="${SITE.url}/order/ORD-261128-AB12/?t=tok123"`);
    expect(parts.body.slice(at('button'), at('how'))).toContain('מעקב אחר ההזמנה');
    expect(parts.body.slice(at('totals'), at('contact'))).toContain('סה״כ לתשלום');
    expect(parts.body.slice(at('contact'))).toContain(SITE.phone);
    expect(parts.body.slice(at('contact'))).toContain(SITE.email);
  });

  it('delivery: the method and the address the customer gave', () => {
    const b = orderCreatedCustomer(order()).parts.body;
    const how = b.slice(b.indexOf('<!--section:how-->'), b.indexOf('<!--section:stamps-->'));
    expect(how).toContain('שליח עד הבית');
    expect(how).toContain('הרצל 1, תל אביב, 6100000');
    expect(how).not.toContain('שעות פתיחה');
  });

  it('self pickup: the studio address and opening hours', () => {
    const b = orderCreatedCustomer(order({ shipping: pickup, shippingPrice: 0, total: 89 })).parts.body;
    const how = b.slice(b.indexOf('<!--section:how-->'), b.indexOf('<!--section:stamps-->'));
    expect(how).toContain('שעות פתיחה');
    expect(how).toContain(SITE.hours);
    expect(how).toContain(SITE.address.replace(/"/g, '&quot;'));
    expect(how).not.toContain('כתובת');
  });

  it('stamps: a PNG of each when it has production files, with name, size, quantity and price; text only without', () => {
    const o = order({ items: [item(1, { files: master, quantity: 2, total: 170 }), item(2, { files: master })], total: 294 });
    const b = orderCreatedCustomer(o).parts.body;
    const stamps = b.slice(b.indexOf('<!--section:stamps-->'), b.indexOf('<!--section:totals-->'));
    expect(stamps).toContain(`src="${SITE.url}/api/orders/${o.id}/preview/?t=${o.token}&amp;i=1&amp;format=png"`);
    expect(stamps).toContain('&amp;i=2&amp;format=png"');
    expect(stamps).toContain('חותמת 1');
    expect(stamps).toContain('38x14 · כמות 2 · ₪170');

    const plain = orderCreatedCustomer(order()).parts.body;
    const noPics = plain.slice(plain.indexOf('<!--section:stamps-->'), plain.indexOf('<!--section:totals-->'));
    expect(noPics).not.toContain('<img');
    expect(noPics).toContain('חותמת 1 · 38x14');
    expect(noPics).toContain('כמות 1 · ₪89');
  });

  it('no promised date, refund sentence or reward coupon', () => {
    const { parts, text } = orderCreatedCustomer(order());
    for (const s of [parts.body, text]) {
      expect(s).not.toMatch(/החזר|ביטול|קופון|S2G/);
      expect(s).not.toContain('עד 3 ימי עסקים');
    }
  });
});

describe('plain-text part', () => {
  it('the same information in the same order', () => {
    const { text } = orderCreatedCustomer(order({ discount: 10, couponCode: 'SAVE10', subtotal: 89, total: 114 }));
    const marks = [
      'תודה דנה, ההזמנה התקבלה!',
      'איזה כיף שבחרת בנו',
      'התשלום אושר והעיצוב נשמר',
      'מעקב אחר ההזמנה:',
      `${SITE.url}/order/ORD-261128-AB12/?t=tok123`,
      'קבלת ההזמנה',
      'אופן המשלוח: שליח עד הבית',
      'כתובת: הרצל 1, תל אביב, 6100000',
      'החותמות בהזמנה',
      '• חותמת 1 · 38x14 · כמות 1 · ₪89',
      'סכום ביניים: ₪89',
      'הנחה: −₪10 (SAVE10)',
      'משלוח: ₪35',
      'סה״כ לתשלום: ₪114',
      'מספר הזמנה: ORD-261128-AB12',
      SITE.phone,
      SITE.email,
    ];
    const pos = marks.map((m) => text.indexOf(m));
    marks.forEach((m, i) => expect(pos[i], m).toBeGreaterThan(-1));
    expect(pos).toEqual([...pos].sort((a, b) => a - b));
    expect(text).not.toMatch(/<[a-z!]/i);
  });

  it('pickup in plain text', () => {
    const { text } = orderCreatedCustomer(order({ shipping: pickup, shippingPrice: 0, total: 89 }));
    expect(text).toContain(`איסוף עצמי: ${SITE.address}`);
    expect(text).toContain(`שעות פתיחה: ${SITE.hours}`);
    expect(text).toContain('משלוח: חינם');
  });
});

describe('notify order.created', () => {
  beforeEach(() => {
    mails.length = 0;
  });

  it('the customer mail carries the text part and replies go to the site mailbox; subject and recipient unchanged', async () => {
    const o = order();
    const sent = await notify(o, 'order.created');
    const customer = mails.find((m) => m.to?.[0] === 'dana@example.com');
    expect(customer).toBeTruthy();
    expect(customer!.subject).toBe(`תודה! ההזמנה ${o.id} התקבלה`);
    expect(customer!.replyTo).toBe(SITE.email);
    expect(customer!.text).toBe(orderCreatedCustomer(o).text);
    expect(customer!.html).toContain('<!--section:contact-->');
    expect(sent).toContain('order.created:customer');
    // the studio mail is as before: reply goes to the customer, no text part
    const staff = mails.find((m) => !m.to);
    expect(staff!.replyTo).toBe('dana@example.com');
    expect(staff!.text).toBeUndefined();
  });

  it('other customer messages get no text part and no reply-to', async () => {
    await notify(order(), 'production.started');
    const m = mails.find((x) => x.to);
    expect(m).toBeTruthy();
    expect(m!.text).toBeUndefined();
    expect(m!.replyTo).toBeUndefined();
  });
});
