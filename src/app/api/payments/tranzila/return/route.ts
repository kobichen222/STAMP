import { NextResponse } from 'next/server';
import { failPayment } from '@/server/orders/service';
import { orderFor, readFields } from '../fields';

export const dynamic = 'force-dynamic';

/** Where Tranzila returns the customer (success / fail addresses). Never marks an order paid – notify does. */
async function handle(req: Request) {
  const url = new URL(req.url);
  const f = await readFields(req);
  const o = await orderFor(f);
  if (!o) return NextResponse.redirect(new URL('/', url.origin), 303);
  const failed = url.searchParams.get('result') === 'fail' || (f.Response !== undefined && f.Response !== '000');
  if (failed) await failPayment(o, 'customer', `חזרה מדף התשלום${f.Response ? ` (Response ${f.Response})` : ''}`);
  const to = new URL(`/order/${o.id}/`, url.origin);
  to.searchParams.set('t', o.token);
  to.searchParams.set(failed ? 'pay' : 'new', failed ? 'failed' : '1');
  return NextResponse.redirect(to, 303);
}

export const GET = handle;
export const POST = handle;
