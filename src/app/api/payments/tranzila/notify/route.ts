import { confirmPayment, failPayment, saveOrder } from '@/server/orders/service';
import { alertPaymentFailed, codeText, logPayment } from '@/server/payment-log';
import { orderFor, readFields } from '../fields';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Server-to-server result from Tranzila ("notify" address). The only place a card payment is marked paid. */
export async function POST(req: Request) {
  const f = await readFields(req);
  console.info('[tranzila] notify in', f.order_id, 'Response', f.Response, 'sum', f.sum);
  const o = await orderFor(f);
  if (!o) {
    console.warn('[tranzila] notify for unknown order', f.order_id);
    await logPayment({ orderId: f.order_id || null, kind: 'notify', ok: false, code: f.Response, sum: Number(f.sum) || null, message: 'הזמנה לא נמצאה או קוד גישה שגוי', fields: f });
    return new Response('unknown order', { status: 200 });
  }
  if (f.Response === '000') {
    const ref = [f.index && `Tranzila ${f.index}`, f.ConfirmationCode && `אישור ${f.ConfirmationCode}`].filter(Boolean).join(' · ');
    const r = await confirmPayment(o, { ref: ref || undefined, amount: Number(f.sum), actor: 'tranzila' });
    console.info('[tranzila] notify', o.id, r);
    await logPayment({
      orderId: o.id,
      kind: 'notify',
      ok: r !== 'amount_mismatch',
      code: f.Response,
      sum: Number(f.sum) || null,
      message: r === 'amount_mismatch' ? `אושר בטרנזילה אבל הסכום שונה מההזמנה (₪${f.sum} במקום ₪${o.total})` : `${codeText(f.Response)}${ref ? ` · ${ref}` : ''}`,
      fields: f,
    });
    if (r === 'amount_mismatch') await alertPaymentFailed(o, f.Response, 'סכום שונה מההזמנה');
  } else {
    await failPayment(o, 'tranzila', `Response ${f.Response ?? '?'}`);
    await logPayment({ orderId: o.id, kind: 'notify', ok: false, code: f.Response, sum: Number(f.sum) || null, message: codeText(f.Response), fields: f });
    if (!o.notificationsSent.includes('payment.failed:staff')) {
      o.notificationsSent.push('payment.failed:staff');
      await saveOrder(o);
      await alertPaymentFailed(o, f.Response, 'תשובת טרנזילה');
    }
  }
  return new Response('OK');
}

export const GET = POST;
