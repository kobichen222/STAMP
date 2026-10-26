'use server';

import { revalidatePath } from 'next/cache';
import { applyStatus, audit, issueReward, loadOrder, runPreflight, saveOrder } from '@/server/orders/service';
import { ORDER_STATUSES, type OrderStatus } from '@/server/orders/types';
import { cancelShipment, createShipment, shipmentStatus, ShippingApiError } from '@/server/shipping/datalogics';
import { requireStaff } from '@/server/staff';

async function withOrder(id: string, roles: ('admin' | 'production')[], fn: (o: NonNullable<Awaited<ReturnType<typeof loadOrder>>>, role: string) => Promise<void>) {
  const role = await requireStaff(roles);
  const o = await loadOrder(id);
  if (!o) throw new Error('order not found');
  await fn(o, role);
  await saveOrder(o);
  revalidatePath(`/admin/orders/${id}/`);
  revalidatePath('/admin/production/');
  revalidatePath('/admin/');
}

export async function setStatus(id: string, to: string, note?: string) {
  if (!(ORDER_STATUSES as readonly string[]).includes(to)) throw new Error('bad status');
  await withOrder(id, ['admin'], async (o, role) => {
    await applyStatus(o, to as OrderStatus, role, note);
  });
}

export async function addNote(id: string, formData: FormData) {
  const text = String(formData.get('text') ?? '').trim().slice(0, 2000);
  if (!text) return;
  await withOrder(id, ['admin'], async (o, role) => {
    o.staffNotes.push({ at: new Date().toISOString(), by: role, text });
    audit(o, role, 'note');
  });
}

export async function setTracking(id: string, formData: FormData) {
  await withOrder(id, ['admin'], async (o, role) => {
    o.shipping.carrier = String(formData.get('carrier') ?? '').slice(0, 60) || undefined;
    o.shipping.trackingNumber = String(formData.get('trackingNumber') ?? '').slice(0, 80) || undefined;
    o.shipping.trackingUrl = String(formData.get('trackingUrl') ?? '').slice(0, 300) || undefined;
    audit(o, role, 'tracking', { note: o.shipping.trackingNumber });
    if (formData.get('ship') === '1') await applyStatus(o, 'SHIPPED', role);
  });
}

export async function markPaid(id: string, formData: FormData) {
  await withOrder(id, ['admin'], async (o, role) => {
    o.paymentStatus = 'paid';
    o.paymentRef = String(formData.get('ref') ?? '').slice(0, 80) || undefined;
    audit(o, role, 'payment', { note: `סומן כשולם ${o.paymentRef ?? ''}` });
    if (o.status === 'PAYMENT_PENDING' || o.status === 'PAYMENT_FAILED') await applyStatus(o, 'PAID', role);
    await issueReward(o);
  });
}

export async function retryProduction(id: string) {
  await withOrder(id, ['admin'], async (o, role) => {
    await runPreflight(o, role);
  });
}

export async function toggleUrgent(id: string) {
  await withOrder(id, ['admin'], async (o, role) => {
    o.urgent = !o.urgent;
    audit(o, role, o.urgent ? 'urgent_on' : 'urgent_off');
  });
}

/** Production station: lock job to a worker and start (spec §141). */
export async function startJob(id: string, worker: string) {
  await withOrder(id, ['admin', 'production'], async (o) => {
    const name = worker.trim().slice(0, 40) || 'ייצור';
    for (const i of o.items) {
      i.worker = name;
      i.startedAt = new Date().toISOString();
    }
    await applyStatus(o, 'IN_PRODUCTION', name);
  });
}

export async function finishJob(id: string, worker: string) {
  await withOrder(id, ['admin', 'production'], async (o) => {
    const name = worker.trim().slice(0, 40) || 'ייצור';
    for (const i of o.items) i.finishedAt = new Date().toISOString();
    await applyStatus(o, 'READY_FOR_SHIPPING', name, 'הושלם בייצור');
  });
}

// ------------------------------------------------------------------ ZigZag (DataLogics)

export type ShipResult = { ok: true; msg: string } | { ok: false; msg: string };

async function shipAction(id: string, fn: (o: NonNullable<Awaited<ReturnType<typeof loadOrder>>>, role: string) => Promise<string>): Promise<ShipResult> {
  let msg = '';
  try {
    await withOrder(id, ['admin'], async (o, role) => {
      msg = await fn(o, role);
    });
    return { ok: true, msg };
  } catch (e) {
    if (e instanceof ShippingApiError) return { ok: false, msg: e.message };
    console.error('[zigzag]', id, e);
    return { ok: false, msg: 'הפעולה נכשלה' };
  }
}

export async function sendToZigZag(id: string): Promise<ShipResult> {
  return shipAction(id, async (o, role) => {
    const r = await createShipment(o);
    o.shipping.carrier = r.platform || 'זיג זג';
    o.shipping.trackingNumber = r.trackingNumber;
    o.shipping.labelUrl = r.labelUrl;
    audit(o, role, 'shipment_created', { note: `זיג זג ${r.trackingNumber}${o.shipping.carrierAccount ? ` · כרטיס ${o.shipping.carrierAccount}` : ''}` });
    return `המשלוח שודר – מספר מעקב ${r.trackingNumber}`;
  });
}

export async function cancelZigZag(id: string): Promise<ShipResult> {
  return shipAction(id, async (o, role) => {
    await cancelShipment(o);
    audit(o, role, 'shipment_cancelled', { note: o.shipping.trackingNumber });
    o.shipping.trackingNumber = undefined;
    o.shipping.labelUrl = undefined;
    o.shipping.statusHistory = undefined;
    return 'המשלוח בוטל';
  });
}

export async function refreshZigZagStatus(id: string): Promise<ShipResult> {
  return shipAction(id, async (o) => {
    o.shipping.statusHistory = await shipmentStatus(o);
    const last = o.shipping.statusHistory.at(-1);
    return last ? `סטטוס: ${last.status}` : 'אין עדיין עדכוני סטטוס';
  });
}
