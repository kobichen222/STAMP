import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { designerModelForProduct, formatSize } from '@/designer/models';
import type { Design } from '@/designer/types';
import { INK_COLORS } from '@/designer/types';
import { getProduct } from '@/lib/content';
import { DEFAULT_RULES, quoteCart, quoteLine, type PricingRules } from '@/lib/pricing';
import { notify } from '../notifications';
import { getPaymentProvider, manualAutoProduction } from '../payments';
import { runProductionEngine } from '../production-engine';
import { getStore } from '../store';
import { canTransition, type Order, type OrderItem, type OrderStatus, type ProductionFileRef } from './types';

// ------------------------------------------------------------------ validation

const designSchema = z
  .object({
    version: z.literal(1),
    modelId: z.string(),
    shape: z.enum(['rect', 'round']),
    width: z.number().positive().max(300),
    height: z.number().positive().max(300),
    border: z.object({ style: z.string(), thickness: z.number(), inset: z.number(), gap: z.number() }),
    elements: z.array(z.record(z.string(), z.unknown())).max(60),
    inkColor: z.enum(Object.keys(INK_COLORS) as [string, ...string[]]),
    dateBand: z.boolean().optional(),
  })
  .passthrough();

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8).max(80),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().regex(/^[\d\s+()-]{9,20}$/),
    email: z.string().trim().email().max(200).optional().or(z.literal('')),
    company: z.string().trim().max(160).optional(),
    companyId: z.string().trim().max(20).optional(),
    poNumber: z.string().trim().max(60).optional(),
  }),
  shipping: z.object({
    method: z.string(),
    address: z.object({ street: z.string().max(200), city: z.string().max(100), zip: z.string().max(12).optional(), notes: z.string().max(300).optional() }).optional(),
  }),
  couponCode: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  items: z
    .array(
      z.object({
        productSlug: z.string(),
        design: designSchema,
        ink: z.string(),
        bodyColor: z.string().max(20).optional(),
        quantity: z.number().int().min(1).max(500),
        designVersionId: z.string().max(80).optional(),
      }),
    )
    .min(1)
    .max(50),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function pricingRules(): PricingRules {
  try {
    const coupons = process.env.PRICING_COUPONS ? JSON.parse(process.env.PRICING_COUPONS) : [];
    return { ...DEFAULT_RULES, coupons };
  } catch {
    return DEFAULT_RULES;
  }
}

// ------------------------------------------------------------------ helpers

const newOrderId = () => {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `ORD-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)}`;
};

const now = () => new Date().toISOString();

function audit(o: Order, actor: string, action: string, extra: Partial<Order['audit'][number]> = {}) {
  o.audit.push({ at: now(), actor, action, ...extra });
}

export function transition(o: Order, to: OrderStatus, actor: string, note?: string): boolean {
  if (o.status === to) return true;
  if (!canTransition(o.status, to)) {
    audit(o, actor, 'transition_rejected', { from: o.status, to, note });
    return false;
  }
  audit(o, actor, 'status', { from: o.status, to, note });
  o.status = to;
  o.updatedAt = now();
  return true;
}

const MIME: Record<ProductionFileRef['kind'], string> = {
  'master-svg': 'image/svg+xml',
  'production-svg': 'image/svg+xml',
  'production-pdf': 'application/pdf',
  'production-eps': 'application/postscript',
  metadata: 'application/json',
  'preview-svg': 'image/svg+xml',
};

/** Runs the production engine for every item and stores the files (idempotent per item). */
export async function generateProductionFiles(o: Order): Promise<{ ok: boolean }> {
  const store = getStore();
  let ok = true;
  for (const [i, item] of o.items.entries()) {
    try {
      const { bundle, preflight, profile } = await runProductionEngine(item.design, {
        orderId: o.id,
        customer: o.customer.name,
        productName: item.productName,
        productId: item.productSlug,
        ink: item.ink,
        quantity: item.quantity,
        designVersion: item.designVersionId,
      });
      const base = `${bundle.baseName}_${i + 1}`;
      const files: [ProductionFileRef['kind'], string, Uint8Array | string][] = [
        ['master-svg', `${base}_master.svg`, bundle.masterSvg],
        ['production-svg', `${base}.svg`, bundle.productionSvg],
        ['production-pdf', `${base}.pdf`, bundle.pdf],
        ['metadata', `${base}.json`, bundle.metadata],
      ];
      if (bundle.eps) files.push(['production-eps', `${base}.eps`, bundle.eps]);
      item.files = [];
      for (const [kind, name, data] of files) {
        const p = `${o.id}/${name}`;
        await store.putFile(p, data, MIME[kind]);
        item.files.push({ kind, name, path: p, size: typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength });
      }
      item.preflight = preflight;
      item.profileId = profile.id;
      item.mirror = profile.mirror;
      item.productionJobId = `JOB-${o.id}-${i + 1}`;
      if (!preflight.ready) ok = false;
    } catch (e) {
      console.error('[production-engine]', o.id, i, e);
      item.preflight = { ready: false, score: 0, errors: ['יצירת קובץ הייצור נכשלה'], warnings: [] };
      ok = false;
    }
  }
  return { ok };
}

/** PREFLIGHT → READY / AWAITING_APPROVAL / PRODUCTION_FILE_ERROR */
export async function runPreflight(o: Order, actor = 'system') {
  transition(o, 'PREFLIGHT', actor);
  const { ok } = await generateProductionFiles(o);
  if (!ok) {
    transition(o, 'PRODUCTION_FILE_ERROR', actor);
    o.notificationsSent.push(...(await notify(o, 'order.production_error')));
    return;
  }
  const needsApproval = o.items.some((i) => i.profileId === 'dater');
  transition(o, needsApproval ? 'AWAITING_APPROVAL' : 'READY_FOR_PRODUCTION', actor);
}

// ------------------------------------------------------------------ checkout

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function createOrder(input: CheckoutInput): Promise<Order> {
  const store = getStore();
  const existing = await store.findByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing; // double click / refresh / retry (spec §146)

  const rules = pricingRules();
  const items: OrderItem[] = input.items.map((it, i) => {
    const product = getProduct(it.productSlug);
    const model = product && designerModelForProduct(product);
    if (!product || !model) throw new CheckoutError(`מוצר לא זמין: ${it.productSlug}`);
    const design = it.design as unknown as Design;
    if (Math.abs(design.width - model.width) > 0.01 || Math.abs(design.height - model.height) > 0.01 || design.shape !== model.shape) {
      throw new CheckoutError(`מידות העיצוב אינן תואמות למוצר ${product.title}`);
    }
    const hasLogo = design.elements.some((e) => e.type === 'image');
    // Prices are always recomputed on the server – never trusted from the client.
    const q = quoteLine({ basePrice: product.price, quantity: it.quantity, ink: it.ink, body: it.bodyColor, hasLogo }, rules);
    return {
      id: `${i + 1}`,
      productSlug: product.slug,
      productName: product.title,
      size: formatSize(model),
      width: model.width,
      height: model.height,
      ink: design.inkColor,
      bodyColor: it.bodyColor,
      quantity: q.quantity,
      unitPrice: q.unitPrice,
      total: q.total,
      designVersionId: it.designVersionId ?? `DV-${crypto.createHash('sha1').update(JSON.stringify(design)).digest('hex').slice(0, 12)}`,
      design,
      profileId: 'standard',
      mirror: false,
      preflight: { ready: false, score: 0, errors: [], warnings: [] },
      files: [],
    };
  });

  const method = rules.shipping.find((s) => s.id === input.shipping.method);
  if (!method) throw new CheckoutError('שיטת משלוח לא תקינה');
  if (method.id !== 'pickup' && (!input.shipping.address?.street || !input.shipping.address?.city)) throw new CheckoutError('נא למלא כתובת למשלוח');
  const cart = quoteCart(
    items.map((i) => i.total),
    { shippingId: method.id, couponCode: input.couponCode || undefined },
    rules,
  );
  if (input.couponCode && cart.couponError) throw new CheckoutError(cart.couponError);

  const provider = getPaymentProvider();
  const order: Order = {
    id: newOrderId(),
    token: crypto.randomBytes(18).toString('base64url'),
    idempotencyKey: input.idempotencyKey,
    createdAt: now(),
    updatedAt: now(),
    status: 'PAYMENT_PENDING',
    paymentStatus: provider.id === 'manual' ? 'unpaid' : 'pending',
    paymentMethod: provider.id,
    customer: { ...input.customer, email: input.customer.email || undefined },
    shipping: { method: method.id, label: method.label, price: cart.shipping, address: method.id === 'pickup' ? undefined : input.shipping.address },
    items,
    subtotal: cart.subtotal,
    discount: cart.discount,
    couponCode: cart.coupon?.code,
    shippingPrice: cart.shipping,
    total: cart.total,
    notes: input.notes,
    staffNotes: [],
    audit: [],
    notificationsSent: [],
  };
  audit(order, 'customer', 'created', { to: 'PAYMENT_PENDING' });

  if (provider.id === 'manual' && manualAutoProduction()) {
    await runPreflight(order);
  }
  await store.saveOrder(order);

  // Staff e-mail carries the production files, so the studio can work even before the admin is set up.
  const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
  for (const item of order.items) {
    for (const f of item.files.filter((x) => x.kind === 'production-pdf' || x.kind === 'production-svg' || x.kind === 'metadata')) {
      const file = await store.getFile(f.path);
      if (file) attachments.push({ filename: f.name, content: Buffer.from(file.data), contentType: file.contentType });
    }
  }
  order.notificationsSent.push(...(await notify(order, order.status === 'AWAITING_APPROVAL' ? 'order.awaiting_approval' : 'order.created', attachments)));
  if (order.status === 'AWAITING_APPROVAL') order.notificationsSent.push(...(await notify(order, 'order.created', attachments)));
  await store.saveOrder(order);
  return order;
}

// ------------------------------------------------------------------ staff / customer actions

export async function loadOrder(id: string) {
  return getStore().getOrder(id);
}

export async function saveOrder(o: Order) {
  o.updatedAt = now();
  await getStore().saveOrder(o);
}

export async function applyStatus(o: Order, to: OrderStatus, actor: string, note?: string) {
  if (!transition(o, to, actor, note)) return false;
  if (to === 'IN_PRODUCTION') o.notificationsSent.push(...(await notify(o, 'production.started')));
  if (to === 'READY_FOR_SHIPPING') o.notificationsSent.push(...(await notify(o, 'order.ready_for_pickup')));
  if (to === 'SHIPPED') o.notificationsSent.push(...(await notify(o, 'order.shipped')));
  if (to === 'PREFLIGHT') await runPreflight(o, actor);
  return true;
}

export const verifyToken = (o: Order | null, token: string | null) =>
  !!o && !!token && o.token.length === token.length && crypto.timingSafeEqual(Buffer.from(o.token), Buffer.from(token));

export { audit };
