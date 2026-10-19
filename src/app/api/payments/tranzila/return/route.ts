import { failPayment } from '@/server/orders/service';
import { orderFor, readFields } from '../fields';

export const dynamic = 'force-dynamic';

/**
 * The payment form runs in a frame inside our checkout, so this page loads in
 * that frame: it moves the whole window (not just the frame) to the order page.
 */
function leaveFrame(target: URL) {
  const href = JSON.stringify(target.toString()).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<body style="font-family:system-ui,sans-serif;text-align:center;padding:40px 16px;color:#333">
<p>מעבירים לדף ההזמנה…</p><p><a href=${href} target="_top">להמשך לחצו כאן</a></p>
<script>try{window.top.location.replace(${href})}catch(e){location.replace(${href})}</script></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

/** Where Tranzila returns the customer (success / fail addresses). Never marks an order paid – notify does. */
async function handle(req: Request) {
  const url = new URL(req.url);
  const f = await readFields(req);
  const o = await orderFor(f);
  if (!o) return leaveFrame(new URL('/', url.origin));
  const failed = url.searchParams.get('result') === 'fail' || (f.Response !== undefined && f.Response !== '000');
  if (failed) await failPayment(o, 'customer', `חזרה מדף התשלום${f.Response ? ` (Response ${f.Response})` : ''}`);
  const to = new URL(`/order/${o.id}/`, url.origin);
  to.searchParams.set('t', o.token);
  to.searchParams.set(failed ? 'pay' : 'new', failed ? 'failed' : '1');
  return leaveFrame(to);
}

export const GET = handle;
export const POST = handle;
