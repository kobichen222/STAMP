import { getStore } from '@/server/store';
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from '@/server/orders/types';
import { OrderRow } from '../components';

export const metadata = { title: 'הזמנות' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const statuses = status ? (status.split(',').filter((s) => (ORDER_STATUSES as readonly string[]).includes(s)) as OrderStatus[]) : undefined;
  const orders = await getStore().listOrders({ q, status: statuses, limit: 300 });
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="text-2xl font-bold">הזמנות</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="חיפוש: מספר הזמנה, שם, טלפון, אימייל, חברה, SKU…" className="input max-w-md" />
        <select name="status" defaultValue={status ?? ''} className="input !w-auto">
          <option value="">כל הסטטוסים</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button className="btn-dark">חיפוש</button>
      </form>
      <section className="card overflow-hidden">
        {orders.map((o) => (
          <OrderRow key={o.id} o={o} />
        ))}
        {!orders.length && <p className="p-8 text-center text-sm text-muted">לא נמצאו הזמנות.</p>}
      </section>
    </div>
  );
}
