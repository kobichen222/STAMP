import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { designerModelForProduct } from '@/designer/models';
import type { Design, InkColor, TextElement } from '@/designer/types';
import { getProduct } from '@/lib/content';
import { lineInputFor, quoteLine } from '@/lib/pricing';
import { cleanForm } from '@/stamp-bot/form';
import { botLine, checkBotDesign } from '@/stamp-bot/order';
import type { CartLine } from '@/stamp-bot/card-types';
import { CheckoutError, checkoutSchema, createOrder } from '@/server/orders/service';
import { runProductionEngine } from '@/server/production-engine';

// A stamp from the bot, from the cart line the home page builds to the files the studio prints from.

const RECT = 'חותמת-פרינט-20';
const ROUND = 'print-r-540';
const OTHER_SIZE = 'חותמת-פרינט-30';

function modelOf(slug: string) {
  const product = getProduct(slug);
  const model = product && designerModelForProduct(product);
  if (!product || !model) throw new Error(`no product ${slug}`);
  return { product, model };
}

/** A clean bot form with real Hebrew text, drawn at the size of the product it is ordered on. */
function formFor(slug: string, kind: 'rect' | 'round', lines: string[]) {
  const { model } = modelOf(slug);
  const form = cleanForm({
    tmpl: 'written',
    kind,
    size: `${model.width}x${model.height}`,
    written: lines.map((text, i) => ({ text, level: i === 0 ? 1 : 3 })),
  });
  return JSON.stringify(form);
}

const FORMS = {
  rect: () => formFor(RECT, 'rect', ['יוסי כהן', 'רואה חשבון', 'רחוב הרצל 12, תל אביב']),
  round: () => formFor(ROUND, 'round', ['עמותת אור לילדים', 'ירושלים']),
};

function line(slug: string, form: string, ink: InkColor = 'black', quantity = 1): CartLine {
  const l = botLine({ form, slug, ink, quantity });
  if (typeof l === 'string') throw new Error(`botLine refused ${slug}: ${l}`);
  return l;
}

const meta = (l: CartLine, i = 0) => ({
  orderId: 'ORD-TEST-0001',
  customer: 'בדיקה',
  productName: l.productName,
  productId: l.productSlug,
  ink: l.design.inkColor,
  quantity: l.quantity,
  designVersion: `DV-test-${i}`,
});

describe('bot line -> production files', () => {
  for (const [name, slug, form] of [
    ['rect', RECT, FORMS.rect],
    ['round', ROUND, FORMS.round],
  ] as const) {
    it(`${name}: the engine draws the bot form into ready production files`, async () => {
      const l = line(slug, form());
      expect(l.design.bot?.form).toBeTruthy();
      expect(l.design.elements).toEqual([]);
      expect(l.design.border.style).toBe('none');

      const { bundle, preflight } = await runProductionEngine(l.design, meta(l));
      expect(preflight.errors).toEqual([]);
      expect(preflight.ready).toBe(true);

      const svg = bundle.productionSvg;
      expect(svg.length).toBeGreaterThan(200);
      expect(svg).toMatch(/<path\b/);
      const strokes = svg.match(/stroke="[^"]*"/g) ?? [];
      expect(strokes.length).toBeGreaterThan(0);
      expect(strokes.every((s) => s === 'stroke="none"')).toBe(true);
      expect(svg).not.toMatch(/stroke-width/);

      expect(bundle.pdf.byteLength).toBeGreaterThan(500);
      expect(Buffer.from(bundle.pdf.slice(0, 5)).toString('latin1')).toBe('%PDF-');

      const md = JSON.parse(bundle.metadata) as { design: Design };
      expect(md.design.bot?.form).toBe(l.design.bot!.form);
    });
  }
});

describe('bot line price', () => {
  for (const ink of ['black', 'blue'] as const) {
    for (const quantity of [1, 3]) {
      it(`the server's price equals the card's (${ink}, ×${quantity})`, () => {
        const { product } = modelOf(RECT);
        expect(typeof product.price).toBe('number');
        const l = line(RECT, FORMS.rect(), ink, quantity);
        expect(l.design.inkColor).toBe(ink);
        // Exactly as createOrder prices a line.
        const server = quoteLine(lineInputFor({ basePrice: product.price, quantity, design: l.design, ink: l.design.inkColor, body: undefined, addons: undefined }));
        // What the home page card shows.
        const card = quoteLine({ basePrice: product.price, quantity, ink, designedOnline: true });
        expect(server.total).toBe(card.total);
        expect(server.unitPrice).toBe(card.unitPrice);
        expect(server.lines.some((x) => x.label === 'מסגרת')).toBe(false);
      });
    }
  }
});

describe('creating an order with a bot line', () => {
  const saved: Record<string, string | undefined> = {};
  let dir = '';
  const CLEAR = ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'SMTP_HOST', 'GREEN_API_INSTANCE', 'MANUAL_PAYMENT_AUTO_PRODUCTION', 'VERCEL'];

  beforeAll(() => {
    // Local files in a temp dir, manual payment, nothing sent anywhere.
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-order-'));
    const keys = [...CLEAR, 'DATA_DIR', 'PAYMENT_PROVIDER', ...Object.keys(process.env).filter((k) => /_(DATABASE_URL|POSTGRES_URL)/.test(k))];
    for (const k of keys) saved[k] = process.env[k];
    for (const k of keys) delete process.env[k];
    process.env.DATA_DIR = dir;
    process.env.PAYMENT_PROVIDER = 'manual';
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const input = (items: { productSlug: string; design: Design; ink: string; quantity: number }[]) =>
    checkoutSchema.parse({
      idempotencyKey: `test-${crypto.randomBytes(6).toString('hex')}`,
      customer: { name: 'בדיקה בדיקה', phone: '0501234567' },
      shipping: { method: 'pickup' },
      items,
    });

  it('the schema keeps the bot form', () => {
    const l = line(RECT, FORMS.rect());
    const parsed = input([{ productSlug: l.productSlug, design: l.design, ink: l.ink, quantity: 1 }]);
    expect((parsed.items[0].design as unknown as Design).bot?.form).toBe(l.design.bot!.form);
  });

  it('creates the order with its production files ready', async () => {
    const l = line(ROUND, FORMS.round(), 'blue', 2);
    const order = await createOrder(input([{ productSlug: l.productSlug, design: l.design, ink: l.ink, quantity: l.quantity }]));
    const item = order.items[0];
    expect(order.paymentMethod).toBe('manual');
    expect(item.design.bot?.form).toBe(l.design.bot!.form);
    expect(item.preflight.ready).toBe(true);
    expect(item.files.map((f) => f.kind)).toEqual(expect.arrayContaining(['production-svg', 'production-pdf', 'metadata']));
    expect(order.status).toBe('READY_FOR_PRODUCTION');
  });

  it('refuses a bot form sent on a product of another size', async () => {
    const l = line(RECT, FORMS.rect());
    const { model, product } = modelOf(OTHER_SIZE);
    expect(model.width !== l.design.width || model.height !== l.design.height).toBe(true);
    // The envelope claims the other product's size; the form was drawn for the first one.
    const moved: Design = { ...l.design, modelId: product.slug, width: model.width, height: model.height, shape: model.shape };
    expect(typeof checkBotDesign(moved, model)).toBe('string');
    await expect(createOrder(input([{ productSlug: OTHER_SIZE, design: moved, ink: l.ink, quantity: 1 }]))).rejects.toBeInstanceOf(CheckoutError);
    // The untouched envelope on the other product fails the size check too.
    await expect(createOrder(input([{ productSlug: OTHER_SIZE, design: l.design, ink: l.ink, quantity: 1 }]))).rejects.toBeInstanceOf(CheckoutError);
  });

  it('refuses a design that carries both a bot form and an editor element', async () => {
    const l = line(RECT, FORMS.rect());
    const text: TextElement = { id: 't1', type: 'text', x: 10, y: 5, rotation: 0, text: 'שלום', font: 'heebo', bold: false, size: 10, align: 'center', letterSpacing: 0, lineHeight: 1.2, maxWidth: 0 };
    const mixed: Design = { ...l.design, elements: [text] };
    await expect(createOrder(input([{ productSlug: l.productSlug, design: mixed, ink: l.ink, quantity: 1 }]))).rejects.toBeInstanceOf(CheckoutError);
  });
});
