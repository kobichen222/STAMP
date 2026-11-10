import 'server-only';
import crypto from 'node:crypto';
import { z } from 'zod';
import { designerModelForProduct, formatSize } from '@/designer/models';
import type { Design } from '@/designer/types';
import { INK_COLORS } from '@/designer/types';
import { getProduct } from '@/lib/content';
import { addressNeed, ADDONS, DEFAULT_RULES, lineInputFor, quoteCart, quoteLine, type PricingRules } from '@/lib/pricing';
import { notify } from '../notifications';
import { ensureSettings } from '../settings';
import { getPaymentProvider, manualAutoProduction } from '../payments';
import { runProductionEngine } from '../production-engine';
import { carrierCardFor, createShipment, datalogicsConfigured } from '../shipping/datalogics';
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
        addons: z.record(z.string(), z.number().int().min(0).max(50)).optional(),
      }),
    )
    .min(1)
    .max(50),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function pricingRules(): PricingRules {
  // Coupons: the admin's (applied by ensureSettings) plus any from the environment.
  let env: PricingRules['coupons'] = [];
  try {
    env = process.env.PRICING_COUPONS ? JSON.parse(process.env.PRICING_COUPONS) : [];
  } catch {
    /* ignore malformed env */
  }
  return { ...DEFAULT_RULES, coupons: [...DEFAULT_RULES.coupons, ...env] };
}

/**
 * Rules for a cart, including a personal one-time code (the 7% reward) when
 * the customer typed one. Used / unknown codes fall through to the normal
 * "invalid code" message.
 */
export async function pricingRulesFor(couponCode?: string): Promise<PricingRules> {
  await ensureSettings();
  const rules = pricingRules();
  const code = couponCode?.trim();
  if (!code || rules.coupons.some((c) => c.code.toLowerCase() === code.toLowerCase())) return rules;
  try {
    const personal = await getStore().getCoupon(code);
    if (personal && !personal.usedAt) return { ...rules, coupons: [...rules.coupons, { code: personal.code, type: 'percent', value: personal.pct }] };
  } catch (e) {
    console.error('[coupon]', e);
  }
  return rules;
}

/** After payment: a personal one-time code for the next order (7%), e-mailed and shown on the tracking page. */
export async function issueReward(o: Order): Promise<void> {
  if (o.rewardCode) return;
  await ensureSettings();
  const rules = pricingRules();
  if (!rules.rewardPct) return;
  const code = `S2G${rules.rewardPct}-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`;
  await getStore().saveCoupon({ code, pct: rules.rewardPct, orderId: o.id, phone: o.customer.phone, email: o.customer.email, createdAt: now() });
  o.rewardCode = code;
  audit(o, 'system', 'reward_issued', { note: `${code} (${rules.rewardPct}%)` });
  o.notificationsSent.push(...(await notify(o, 'order.reward')));
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

export function transition(o: Order, to: OrderStatus, actor: string, note?: string, force = false): boolean {
  if (o.status === to) return true;
  // Staff may pick any step by hand (force); automatic flows stay on the allowed paths.
  if (!force && !canTransition(o.status, to)) {
    audit(o, actor, 'transition_rejected', { from: o.status, to, note });
    return false;
  }
  audit(o, actor, 'status', { from: o.status, to, note: force && !canTransition(o.status, to) ? `${note ? `${note} · ` : ''}בחירה ידנית` : note });
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

  const rules = await pricingRulesFor(input.couponCode);
  const items: OrderItem[] = input.items.map((it, i) => {
    const product = getProduct(it.productSlug);
    const model = product && designerModelForProduct(product);
    if (!product || !model || product.hidden) throw new CheckoutError(`מוצר לא זמין: ${it.productSlug}`);
    const design = it.design as unknown as Design;
    if (Math.abs(design.width - model.width) > 0.01 || Math.abs(design.height - model.height) > 0.01 || design.shape !== model.shape) {
      throw new CheckoutError(`מידות העיצוב אינן תואמות למוצר ${product.title}`);
    }
    // Prices are always recomputed on the server – never trusted from the client.
    const addons = it.addons ? Object.fromEntries(Object.entries(it.addons).filter(([k]) => ADDONS.some((a) => a.id === k))) : undefined;
    const q = quoteLine(lineInputFor({ basePrice: product.price, quantity: it.quantity, design, ink: design.inkColor, body: it.bodyColor, addons }), rules);
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
      priceLines: q.lines,
      addons,
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
  const need = addressNeed(method);
  if (need === 'full' && (!input.shipping.address?.street || !input.shipping.address?.city)) throw new CheckoutError('נא למלא כתובת למשלוח');
  if (need === 'city' && !input.shipping.address?.city) throw new CheckoutError('נא למלא עיר לנקודת המסירה');
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
    shipping: {
      method: method.id,
      label: method.label,
      price: cart.shipping,
      address: need === 'none' ? undefined : input.shipping.address,
      carrier: method.carrierAccount ? 'זיג זג' : undefined,
      carrierAccount: method.carrierAccount,
    },
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

  // A personal code is single-use: mark it as redeemed by this order.
  if (cart.coupon) {
    const personal = await store.getCoupon(cart.coupon.code).catch(() => null);
    if (personal && !personal.usedAt) await store.saveCoupon({ ...personal, usedAt: now(), usedOrderId: order.id });
  }

  if (provider.id === 'manual') {
    if (manualAutoProduction()) await runPreflight(order);
    await store.saveOrder(order);
    await announce(order);
    await store.saveOrder(order);
  } else {
    // Card payment: files and e-mails wait for the payment confirmation (confirmPayment).
    await store.saveOrder(order);
  }
  return order;
}

/** "Order received" e-mails; the staff copy carries the production files. Idempotent per recipient. */
export async function announce(order: Order) {
  const store = getStore();
  const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
  for (const item of order.items) {
    for (const f of item.files.filter((x) => x.kind === 'production-pdf' || x.kind === 'production-svg' || x.kind === 'metadata')) {
      const file = await store.getFile(f.path);
      if (file) attachments.push({ filename: f.name, content: Buffer.from(file.data), contentType: file.contentType });
    }
  }
  if (order.status === 'AWAITING_APPROVAL') order.notificationsSent.push(...(await notify(order, 'order.awaiting_approval', attachments)));
  order.notificationsSent.push(...(await notify(order, 'order.created', attachments)));
}

/**
 * A confirmed card payment (from the provider's server notification). Idempotent:
 * a repeated notification for a paid order changes nothing.
 */
export async function confirmPayment(o: Order, payment: { ref?: string; amount: number; actor: string }): Promise<'paid' | 'already' | 'amount_mismatch'> {
  if (o.paymentStatus === 'paid') return 'already';
  if (Math.abs(payment.amount - o.total) > 0.009) {
    audit(o, payment.actor, 'payment_rejected', { note: `סכום ${payment.amount} במקום ${o.total}` });
    await saveOrder(o);
    return 'amount_mismatch';
  }
  o.paymentStatus = 'paid';
  o.paymentRef = payment.ref;
  audit(o, payment.actor, 'payment', { note: `שולם ₪${payment.amount}${payment.ref ? ` · ${payment.ref}` : ''}` });
  if (o.status === 'PAYMENT_PENDING' || o.status === 'PAYMENT_FAILED') transition(o, 'PAID', payment.actor);
  await saveOrder(o); // record the payment before the slower steps
  if (o.status === 'PAID') await runPreflight(o, payment.actor);
  await issueReward(o).catch((e) => console.error('[reward]', o.id, e));
  await announce(o);
  await autoShip(o, payment.actor);
  await saveOrder(o);
  return 'paid';
}

/**
 * A paid ZigZag order goes straight to ZigZag (DataLogics). A failure never blocks
 * the order: it is written to the order history and the manual button stays in the admin.
 */
export async function autoShip(o: Order, actor: string) {
  // The studio approves every shipment by hand (the ZigZag button in the order); automatic only when switched on.
  if (process.env.ZIGZAG_AUTO_SHIP !== '1') return;
  const card = carrierCardFor(o);
  if (!card || o.shipping.method === 'pickup' || o.shipping.trackingNumber || !datalogicsConfigured()) return;
  try {
    const r = await createShipment(o);
    o.shipping.carrier = r.platform || 'זיג זג';
    o.shipping.trackingNumber = r.trackingNumber;
    o.shipping.labelUrl = r.labelUrl;
    audit(o, actor, 'shipment_created', { note: `זיג זג ${r.trackingNumber} · כרטיס ${card} (אוטומטי)` });
  } catch (e) {
    console.error('[zigzag:auto]', o.id, e);
    audit(o, actor, 'shipment_failed', { note: `שידור אוטומטי לזיג זג נכשל: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300) });
  }
}

/** A declined / cancelled card payment – the customer can try again from the order page. */
export async function failPayment(o: Order, actor: string, note?: string) {
  if (o.paymentStatus === 'paid') return;
  o.paymentStatus = 'failed';
  transition(o, 'PAYMENT_FAILED', actor, note);
  await saveOrder(o);
}

// ------------------------------------------------------------------ staff / customer actions

export async function loadOrder(id: string) {
  return getStore().getOrder(id);
}

export async function saveOrder(o: Order) {
  o.updatedAt = now();
  await getStore().saveOrder(o);
}

const STATUS_EVENTS: Partial<Record<OrderStatus, Parameters<typeof notify>[1]>> = {
  IN_PRODUCTION: 'production.started',
  READY_FOR_SHIPPING: 'order.ready_for_pickup',
  SHIPPED: 'order.shipped',
};

/**
 * Moves the order to `to`. With `deferNotify` the customer e-mail is not awaited: the event is
 * returned so the caller sends it after answering (staff see the new status at once).
 */
export async function applyStatus(o: Order, to: OrderStatus, actor: string, note?: string, opts: { force?: boolean; deferNotify?: boolean } = {}) {
  const from = o.status;
  if (!transition(o, to, actor, note, opts.force)) return false;
  const event = from !== to ? STATUS_EVENTS[to] : undefined;
  if (event && !opts.deferNotify) o.notificationsSent.push(...(await notify(o, event)));
  if (to === 'PREFLIGHT' && from !== to) await runPreflight(o, actor);
  return event && opts.deferNotify ? event : true;
}

/** Sends a status e-mail that applyStatus deferred, and records it on the (fresh) order. */
export async function sendStatusEmail(id: string, event: Parameters<typeof notify>[1]) {
  const o = await loadOrder(id);
  if (!o) return;
  const sent = await notify(o, event);
  if (!sent.length) return;
  o.notificationsSent.push(...sent);
  await saveOrder(o);
}

export const verifyToken = (o: Order | null, token: string | null) =>
  !!o && !!token && o.token.length === token.length && crypto.timingSafeEqual(Buffer.from(o.token), Buffer.from(token));

export { audit };

/** Admin: send the order e-mails that did not go out (each recipient at most once). */
export async function resendOrderEmails(o: Order): Promise<number> {
  const before = o.notificationsSent.length;
  if (o.paymentStatus === 'paid' || o.paymentMethod === 'manual') {
    await announce(o);
    if (o.rewardCode) o.notificationsSent.push(...(await notify(o, 'order.reward')));
  }
  return o.notificationsSent.length - before;
}

// ------------------------------------------------------------------ staff editing

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Re-price an edited order with today's rules. A coupon keeps the same share
 * of the subtotal it had (personal codes are already used by this order).
 */
export async function recalcOrder(o: Order) {
  const rules = await pricingRulesFor();
  const oldSubtotal = o.subtotal;
  for (const it of o.items) {
    const product = it.productSlug ? getProduct(it.productSlug) : undefined;
    if (!product || product.price == null) {
      it.total = round2(it.unitPrice * it.quantity);
      continue;
    }
    const q = quoteLine(lineInputFor({ basePrice: product.price, quantity: it.quantity, design: it.design, ink: it.ink, body: it.bodyColor, addons: it.addons }), rules);
    it.quantity = q.quantity;
    it.unitPrice = q.unitPrice;
    it.total = q.total;
    it.priceLines = q.lines;
  }
  const cart = quoteCart(
    o.items.map((i) => i.total),
    { shippingId: o.shipping.method },
    rules,
  );
  o.subtotal = cart.subtotal;
  o.discount = o.discount > 0 && oldSubtotal > 0 ? round2((cart.subtotal * o.discount) / oldSubtotal) : 0;
  o.shippingPrice = cart.shipping;
  o.shipping.price = cart.shipping;
  o.total = Math.max(0, round2(cart.subtotal - o.discount + cart.shipping + (o.adjustment ?? 0)));
}

export const editOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(30),
    email: z.string().trim().max(160).optional(),
    company: z.string().trim().max(160).optional(),
    companyId: z.string().trim().max(30).optional(),
    poNumber: z.string().trim().max(60).optional(),
  }),
  shipping: z.object({
    method: z.string().min(1).max(40),
    address: z.object({ street: z.string().trim().max(160), city: z.string().trim().max(80), zip: z.string().trim().max(12).optional(), notes: z.string().trim().max(300).optional() }).optional(),
  }),
  items: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().min(1).max(999),
        ink: z.string(),
        addons: z.record(z.string(), z.number().int().min(0).max(99)).optional(),
      }),
    )
    .min(1),
  notes: z.string().max(2000).optional(),
  adjustment: z.number().min(-100000).max(100000).optional(),
});
export type EditOrderInput = z.infer<typeof editOrderSchema>;

const opt = (s?: string) => (s && s.trim() ? s.trim() : undefined);

/** Apply a staff edit (customer, shipping, items, price) and re-price. Returns a short change summary. */
export async function applyOrderEdit(o: Order, input: EditOrderInput, actor: string): Promise<string[]> {
  const rules = await pricingRulesFor();
  const changes: string[] = [];
  const c = input.customer;
  const nextCustomer = { name: c.name, phone: c.phone, email: opt(c.email), company: opt(c.company), companyId: opt(c.companyId), poNumber: opt(c.poNumber) };
  if (JSON.stringify(nextCustomer) !== JSON.stringify({ ...o.customer, email: opt(o.customer.email), company: opt(o.customer.company), companyId: opt(o.customer.companyId), poNumber: opt(o.customer.poNumber) })) changes.push('פרטי לקוח');
  o.customer = nextCustomer;

  const method = rules.shipping.find((s) => s.id === input.shipping.method);
  if (!method) throw new Error('שיטת משלוח לא תקינה');
  const need = addressNeed(method);
  const addr = input.shipping.address;
  if (need === 'full' && (!addr?.street || !addr?.city)) throw new Error('נא למלא רחוב ועיר למשלוח');
  if (need === 'city' && !addr?.city) throw new Error('נא למלא עיר');
  const nextAddress = need === 'none' || !addr ? undefined : { street: addr.street, city: addr.city, zip: opt(addr.zip), notes: opt(addr.notes) };
  if (method.id !== o.shipping.method) changes.push(`משלוח: ${o.shipping.label} → ${method.label}`);
  else if (JSON.stringify(nextAddress ?? null) !== JSON.stringify(o.shipping.address ?? null)) changes.push('כתובת');
  o.shipping = { ...o.shipping, method: method.id, label: method.label, address: nextAddress, carrierAccount: method.carrierAccount, carrier: method.carrierAccount ? 'זיג זג' : o.shipping.carrier };

  // Items: keep / remove / update quantity, ink and extras.
  const kept: OrderItem[] = [];
  for (const it of o.items) {
    const e = input.items.find((x) => x.id === it.id);
    if (!e) {
      changes.push(`הוסר: ${it.productName}`);
      continue;
    }
    if (e.quantity !== it.quantity) changes.push(`${it.productName}: כמות ${it.quantity} → ${e.quantity}`);
    it.quantity = e.quantity;
    if (e.ink in INK_COLORS && e.ink !== it.ink) {
      changes.push(`${it.productName}: דיו ${INK_COLORS[it.ink]?.label} → ${INK_COLORS[e.ink as keyof typeof INK_COLORS].label}`);
      it.ink = e.ink as OrderItem['ink'];
      it.design = { ...it.design, inkColor: it.ink };
    }
    const addons = Object.fromEntries(Object.entries(e.addons ?? {}).filter(([k, v]) => ADDONS.some((a) => a.id === k) && v > 0));
    if (JSON.stringify(addons) !== JSON.stringify(Object.fromEntries(Object.entries(it.addons ?? {}).filter(([, v]) => (v ?? 0) > 0)))) changes.push(`${it.productName}: תוספות`);
    it.addons = Object.keys(addons).length ? addons : undefined;
    kept.push(it);
  }
  if (!kept.length) throw new Error('בהזמנה חייב להישאר לפחות פריט אחד');
  o.items = kept.map((it, i) => ({ ...it, id: `${i + 1}` }));

  if (opt(input.notes) !== opt(o.notes)) changes.push('הערת לקוח');
  o.notes = opt(input.notes);
  const adj = input.adjustment ? round2(input.adjustment) : undefined;
  if ((adj ?? 0) !== (o.adjustment ?? 0)) changes.push(`התאמת מחיר ${adj ?? 0}₪`);
  o.adjustment = adj;

  const before = o.total;
  await recalcOrder(o);
  if (o.total !== before) changes.push(`סה״כ ₪${before} → ₪${o.total}`);
  if (o.items.some((i) => i.files.length)) await generateProductionFiles(o);
  if (changes.length) audit(o, actor, 'edited', { note: changes.join(' · ') });
  return changes;
}

/** Replace one item's design (and possibly its product/size) from the editor. */
export async function replaceItemDesign(o: Order, index: number, productSlug: string, design: Design, actor: string) {
  const it = o.items[index];
  if (!it) throw new Error('פריט לא נמצא');
  const product = getProduct(productSlug);
  const model = product && designerModelForProduct(product);
  if (!product || !model) throw new Error('מוצר לא זמין');
  if (Math.abs(design.width - model.width) > 0.01 || Math.abs(design.height - model.height) > 0.01 || design.shape !== model.shape) throw new Error('מידות העיצוב אינן תואמות למוצר');
  const moved = product.slug !== it.productSlug;
  Object.assign(it, {
    productSlug: product.slug,
    productName: product.title,
    size: formatSize(model),
    width: model.width,
    height: model.height,
    ink: design.inkColor,
    design,
    designVersionId: `DV-${crypto.createHash('sha1').update(JSON.stringify(design)).digest('hex').slice(0, 12)}`,
  });
  const before = o.total;
  await recalcOrder(o);
  if (it.files.length || ['READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_CHECK', 'AWAITING_APPROVAL', 'PRODUCTION_FILE_ERROR'].includes(o.status)) await generateProductionFiles(o);
  audit(o, actor, 'design_edited', { note: `פריט ${index + 1}${moved ? ` · מוצר: ${product.title}` : ''}${o.total !== before ? ` · סה״כ ₪${before} → ₪${o.total}` : ''}` });
}
