import { confirmPayment, failPayment } from '@/server/orders/service';
import { orderFor, readFields } from '../fields';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Server-to-server result from Tranzila ("notify" address). The only place a card payment is marked paid. */
export async function POST(req: Request) {
  const f = await readFields(req);
  const o = await orderFor(f);
  if (!o) {
    console.warn('[tranzila] notify for unknown order', f.order_id);
    return new Response('unknown order', { status: 200 });
  }
  if (f.Response === '000') {
    const ref = [f.index && `Tranzila ${f.index}`, f.ConfirmationCode && `אישור ${f.ConfirmationCode}`].filter(Boolean).join(' · ');
    const r = await confirmPayment(o, { ref: ref || undefined, amount: Number(f.sum), actor: 'tranzila' });
    console.info('[tranzila] notify', o.id, r);
  } else {
    await failPayment(o, 'tranzila', `Response ${f.Response ?? '?'}`);
  }
  return new Response('OK');
}

export const GET = POST;
