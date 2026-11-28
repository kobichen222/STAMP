import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Nothing leaves the test: e-mails are captured, WhatsApp does nothing.
const { mails } = vi.hoisted(() => ({ mails: [] as { to?: string[]; subject: string; html: string }[] }));
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

import { DEFAULT_RULES } from '@/lib/pricing';
import { SITE } from '@/lib/config';
import { orderSteps, stepTime, type AuditEntry, type Order, type OrderStatus } from '@/server/orders/types';
import { checkoutSchema, confirmPayment, createOrder, failPayment, loadOrder } from '@/server/orders/service';
import { declineReason } from '@/server/payment-log';
import { staffShippingHead } from '@/server/notifications';
import { cleanForm } from '@/stamp-bot/form';
import { botLine } from '@/stamp-bot/order';
import { getProduct } from '@/lib/content';
import { designerModelForProduct } from '@/designer/models';
import { GET as preview } from '@/app/api/orders/[id]/preview/route';

// ------------------------------------------------------------------ progress line

const NOW = new Date('2026-11-28T12:00:00Z'); // 14:00 in Israel
const at = (status: OrderStatus, from: OrderStatus, iso: string): AuditEntry => ({ at: iso, actor: 'admin', action: 'status', from, to: status });
const HISTORY: AuditEntry[] = [
  { at: '2026-11-27T08:00:00Z', actor: 'customer', action: 'created', to: 'PAYMENT_PENDING' },
  at('PAID', 'PAYMENT_PENDING', '2026-11-27T08:01:00Z'),
  at('PREFLIGHT', 'PAID', '2026-11-27T08:01:10Z'),
  at('READY_FOR_PRODUCTION', 'PREFLIGHT', '2026-11-27T08:01:20Z'),
  at('IN_PRODUCTION', 'READY_FOR_PRODUCTION', '2026-11-28T07:05:00Z'),
  at('READY_FOR_SHIPPING', 'IN_PRODUCTION', '2026-11-28T07:30:00Z'),
  at('SHIPPED', 'READY_FOR_SHIPPING', '2026-11-28T09:15:00Z'),
  at('DELIVERED', 'SHIPPED', '2026-11-28T11:45:00Z'),
];
const steps = (method: string, status: OrderStatus, audit: AuditEntry[] = HISTORY, createdAt: string | undefined = '2026-11-27T08:00:00Z') =>
  orderSteps({ status, shipping: { method }, audit, createdAt }, NOW);
const reached = (method: string, status: OrderStatus) => steps(method, status).map((s) => s.reached);

describe('orderSteps', () => {
  it('labels fit the delivery method', () => {
    expect(steps('pickup', 'PAID').map((s) => s.label)).toEqual(['התקבלה', 'בייצור', 'מוכנה לאיסוף', 'נאספה']);
    expect(steps('locker', 'PAID').map((s) => s.label)).toEqual(['התקבלה', 'בייצור', 'נשלחה לנקודת המסירה', 'נאספה']);
    for (const m of ['courier', 'express', 'rush', 'gushdan', 'some-new-method', ''])
      expect(steps(m, 'PAID').map((s) => s.label)).toEqual(['התקבלה', 'בייצור', 'יצאה אליכם', 'נמסרה']);
  });

  it('reached steps follow the status', () => {
    const table: [OrderStatus, boolean[], boolean[]][] = [
      // status, pickup, courier / locker
      ['PAYMENT_PENDING', [true, false, false, false], [true, false, false, false]],
      ['PAID', [true, false, false, false], [true, false, false, false]],
      ['PREFLIGHT', [true, false, false, false], [true, false, false, false]],
      ['AWAITING_APPROVAL', [true, false, false, false], [true, false, false, false]],
      ['CHANGE_REQUESTED', [true, false, false, false], [true, false, false, false]],
      ['READY_FOR_PRODUCTION', [true, false, false, false], [true, false, false, false]],
      ['IN_PRODUCTION', [true, true, false, false], [true, true, false, false]],
      ['QUALITY_CHECK', [true, true, false, false], [true, true, false, false]],
      ['READY_FOR_SHIPPING', [true, true, true, false], [true, true, false, false]],
      ['SHIPPED', [true, true, true, false], [true, true, true, false]],
      ['DELIVERED', [true, true, true, true], [true, true, true, true]],
      ['REFUNDED', [true, false, false, false], [true, false, false, false]],
      ['PARTIALLY_REFUNDED', [true, false, false, false], [true, false, false, false]],
      ['PAYMENT_FAILED', [false, false, false, false], [false, false, false, false]],
      ['PRODUCTION_FILE_ERROR', [false, false, false, false], [false, false, false, false]],
      ['CANCELLED', [false, false, false, false], [false, false, false, false]],
    ];
    for (const [status, pickup, other] of table) {
      expect(reached('pickup', status), `pickup ${status}`).toEqual(pickup);
      expect(reached('courier', status), `courier ${status}`).toEqual(other);
      expect(reached('locker', status), `locker ${status}`).toEqual(other);
    }
  });

  it('times: HH:MM today (Israel time), D.M HH:MM before; none for steps not reached', () => {
    expect(steps('courier', 'DELIVERED').map((s) => s.time)).toEqual(['27.11 10:00', '09:05', '11:15', '13:45']);
    expect(steps('pickup', 'DELIVERED').map((s) => s.time)).toEqual(['27.11 10:00', '09:05', '09:30', '13:45']);
    expect(steps('pickup', 'IN_PRODUCTION').map((s) => s.time)).toEqual(['27.11 10:00', '09:05', undefined, undefined]);
  });

  it('a step entered twice shows the last entry', () => {
    const again = [...HISTORY.slice(0, 5), at('CHANGE_REQUESTED', 'IN_PRODUCTION', '2026-11-28T07:10:00Z'), at('PREFLIGHT', 'CHANGE_REQUESTED', '2026-11-28T07:11:00Z'), at('READY_FOR_PRODUCTION', 'PREFLIGHT', '2026-11-28T07:12:00Z'), at('IN_PRODUCTION', 'READY_FOR_PRODUCTION', '2026-11-28T08:00:00Z')];
    expect(steps('courier', 'IN_PRODUCTION', again)[1].time).toBe('10:00');
  });

  it('an order without timestamps shows the steps without times', () => {
    const s = orderSteps({ status: 'SHIPPED', shipping: { method: 'courier' } }, NOW);
    expect(s.map((x) => x.reached)).toEqual([true, true, true, false]);
    expect(s.every((x) => x.time === undefined)).toBe(true);
  });

  it('stepTime: Israel date boundary and a bad date', () => {
    expect(stepTime('2026-11-27T22:30:00Z', NOW)).toBe('00:30'); // already the 28th in Israel
    expect(stepTime('2026-01-05T07:03:00Z', NOW)).toBe('5.1 09:03');
    expect(stepTime('not a date', NOW)).toBeUndefined();
  });
});

// ------------------------------------------------------------------ declined card reasons

describe('declineReason', () => {
  it('one reason per kind of decline, none for other codes', () => {
    expect(declineReason('004')).toBe(`הכרטיס סורב על ידי חברת האשראי. נסו כרטיס אחר, או התקשרו אלינו: ${SITE.phone}`);
    expect(declineReason('036')).toBe('פג תוקף הכרטיס. בדקו את התאריך, או נסו כרטיס אחר.');
    expect(declineReason('039')).toBe('פרטי הכרטיס לא נקלטו כראוי. בדקו מספר כרטיס, תוקף וקוד אבטחה.');
    expect(declineReason('900')).toBeNull();
    expect(declineReason('999')).toBeNull();
    expect(declineReason(undefined)).toBeNull();
    expect(declineReason('constructor')).toBeNull();
  });
});

// ------------------------------------------------------------------ orders on disk

const saved: Record<string, string | undefined> = {};
let dir = '';
const CLEAR = ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'SMTP_HOST', 'GREEN_API_INSTANCE', 'MANUAL_PAYMENT_AUTO_PRODUCTION', 'VERCEL'];

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'after-order-'));
  const keys = [...CLEAR, 'DATA_DIR', 'PAYMENT_PROVIDER', ...Object.keys(process.env).filter((k) => /_(DATABASE_URL|POSTGRES_URL)/.test(k))];
  for (const k of keys) saved[k] = process.env[k];
  for (const k of keys) delete process.env[k];
  process.env.DATA_DIR = dir;
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

const SLUG = 'חותמת-פרינט-20';

function input(shipping: object) {
  const product = getProduct(SLUG);
  const model = product && designerModelForProduct(product);
  if (!model) throw new Error(`no product ${SLUG}`);
  const form = JSON.stringify(cleanForm({ tmpl: 'written', kind: 'rect', size: `${model.width}x${model.height}`, written: [{ text: 'יוסי כהן', level: 1 }, { text: 'רואה חשבון', level: 3 }] }));
  const l = botLine({ form, slug: SLUG, ink: 'blue', quantity: 1 });
  if (typeof l === 'string') throw new Error(l);
  return checkoutSchema.parse({
    idempotencyKey: `test-${crypto.randomBytes(6).toString('hex')}`,
    customer: { name: 'בדיקה בדיקה', phone: '0501234567', email: 'customer@example.com' },
    shipping,
    items: [{ productSlug: l.productSlug, design: l.design, ink: l.ink, quantity: 1 }],
  });
}

const etaOf = (id: string) => DEFAULT_RULES.shipping.find((m) => m.id === id)!.eta;

describe('a card order that did not go through', () => {
  it('keeps the decline code, and a report without a code keeps it for the same failure', async () => {
    const o = await createOrder(input({ method: 'courier', address: { street: 'הרצל 1', city: 'תל אביב' } }));
    expect(o.lastPaymentCode).toBeUndefined();
    await failPayment(o, 'tranzila', 'Response 004', '004');
    expect(o.status).toBe('PAYMENT_FAILED');
    expect((await loadOrder(o.id))!.lastPaymentCode).toBe('004');
    await failPayment(o, 'customer', 'חזרה מדף התשלום');
    expect((await loadOrder(o.id))!.lastPaymentCode).toBe('004');
    await failPayment(o, 'tranzila', 'Response 036', '036');
    expect((await loadOrder(o.id))!.lastPaymentCode).toBe('036');
  });

  it('a payment approved with another amount clears the stored code (the customer may have been charged)', async () => {
    const o = await createOrder(input({ method: 'courier', address: { street: 'הרצל 1', city: 'תל אביב' } }));
    await failPayment(o, 'tranzila', 'Response 004', '004');
    expect(await confirmPayment(o, { amount: o.total + 10, actor: 'tranzila' })).toBe('amount_mismatch');
    const stored = (await loadOrder(o.id))!;
    expect(stored.lastPaymentCode).toBeUndefined();
    expect(stored.paymentStatus).toBe('failed');
  });
});

describe('the order keeps the shipping time text it was placed with', () => {
  it('copies the method eta at creation', async () => {
    const o = await createOrder(input({ method: 'express', address: { street: 'הרצל 1', city: 'תל אביב' } }));
    expect(o.shipping.eta).toBe(etaOf('express'));
    expect((await loadOrder(o.id))!.shipping.eta).toBe(etaOf('express'));
  });
});

describe('the studio "new order" e-mail', () => {
  it('first line: label · time, then the address', () => {
    const head = staffShippingHead({ shipping: { method: 'courier', label: 'שליח עד הבית', price: 35, eta: 'עד 3 ימי עסקים', address: { street: 'הרצל 1', city: 'תל אביב' } } } as Pick<Order, 'shipping'>);
    expect(head).toContain('>שליח עד הבית · עד 3 ימי עסקים</p>');
    expect(head).toContain('>הרצל 1, תל אביב</p>');
  });

  it('an order without the stored time text shows the label alone; pickup has no address line', () => {
    const head = staffShippingHead({ shipping: { method: 'pickup', label: 'איסוף עצמי', price: 0 } } as Pick<Order, 'shipping'>);
    expect(head).toBe('<p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0b1426">איסוף עצמי</p>');
  });

  it('a new manual order: the staff e-mail leads with shipping, then the customer, and shows the stamp as PNG', async () => {
    process.env.PAYMENT_PROVIDER = 'manual';
    try {
      mails.length = 0;
      const o = await createOrder(input({ method: 'pickup' }));
      expect(o.items[0].files.some((f) => f.kind === 'master-svg')).toBe(true);
      const staff = mails.find((m) => !m.to && m.subject.includes(o.id));
      expect(staff).toBeTruthy();
      const html = staff!.html;
      const head = html.indexOf(`${o.shipping.label} · ${etaOf('pickup')}`);
      expect(head).toBeGreaterThan(-1);
      expect(head).toBeLessThan(html.indexOf('>לקוח<'));
      expect(html).toContain(`src="${SITE.url}/api/orders/${o.id}/preview/?t=${o.token}&amp;i=1&amp;format=png"`);
      expect(html).toMatch(/alt="[^"]+ · [^"]+"/);
      // The customer's e-mail shows the stamps as PNG too since the body was reordered: see stage6-cart-email.test.ts.

      // The preview route gives a 320px PNG with the same access check as the SVG.
      const req = (q: string) => preview(new Request(`http://localhost/api/orders/${o.id}/preview/?${q}`), { params: Promise.resolve({ id: o.id }) });
      const png = await req(`t=${o.token}&i=1&format=png`);
      expect(png.status).toBe(200);
      expect(png.headers.get('Content-Type')).toBe('image/png');
      const bytes = Buffer.from(await png.arrayBuffer());
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(bytes.readUInt32BE(16)).toBe(320);
      expect((await req(`t=wrong&i=1&format=png`)).status).toBe(404);
      const svg = await req(`t=${o.token}&i=1`);
      expect(svg.headers.get('Content-Type')).toBe('image/svg+xml');
    } finally {
      delete process.env.PAYMENT_PROVIDER;
    }
  });
});
