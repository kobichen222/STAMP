import { NextResponse } from 'next/server';
import { applyStatus, audit, loadOrder, saveOrder, verifyToken } from '@/server/orders/service';
import { STATUS_LABEL } from '@/server/orders/types';

type Ctx = { params: Promise<{ id: string }> };

/** Public order tracking – requires the order token from the confirmation link. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get('t');
  const o = await loadOrder(id);
  if (!verifyToken(o, token)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    id: o!.id,
    createdAt: o!.createdAt,
    status: o!.status,
    statusLabel: STATUS_LABEL[o!.status],
    total: o!.total,
    shipping: { label: o!.shipping.label, trackingNumber: o!.shipping.trackingNumber, trackingUrl: o!.shipping.trackingUrl },
    items: o!.items.map((i) => ({ productName: i.productName, size: i.size, quantity: i.quantity, ink: i.ink, total: i.total, ready: i.preflight.ready })),
  });
}

/** Customer proof approval / change request (spec §137). */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { token?: string; action?: 'approve' | 'change'; note?: string };
  const o = await loadOrder(id);
  if (!verifyToken(o, body.token ?? null)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (o!.status !== 'AWAITING_APPROVAL') return NextResponse.json({ error: 'ההזמנה אינה ממתינה לאישור' }, { status: 409 });
  if (body.action === 'approve') await applyStatus(o!, 'READY_FOR_PRODUCTION', 'customer', 'אישור לקוח להגהה');
  else if (body.action === 'change') {
    await applyStatus(o!, 'CHANGE_REQUESTED', 'customer', String(body.note ?? '').slice(0, 1000));
    audit(o!, 'customer', 'change_request', { note: String(body.note ?? '').slice(0, 1000) });
  } else return NextResponse.json({ error: 'bad action' }, { status: 400 });
  await saveOrder(o!);
  return NextResponse.json({ status: o!.status, statusLabel: STATUS_LABEL[o!.status] });
}
