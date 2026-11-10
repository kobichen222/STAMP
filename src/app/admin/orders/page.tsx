import { getStore } from '@/server/store';
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from '@/server/orders/types';
import { Icon } from '@/components/ui/Icon';
import { OrderRow } from '../components';

export const metadata = { title: 'הזמנות' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const statuses = status ? (status.split(',').filter((s) => (ORDER_STATUSES as readonly string[]).includes(s)) as OrderStatus[]) : undefined;
  const orders = await getStore().listOrders({ q, status: statuses, limit: 300 });
  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">
          הזמנות <span className="text-base font-medium text-muted">({orders.length})</span>
        </h1>
        <a href="/api/admin/orders.csv" className="btn-outline btn-sm">
          <Icon name="download" size={16} /> ייצוא CSV
        </a>
      </div>
      <form className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-wrap">
        <input name="q" type="search" defaultValue={q} placeholder="חיפוש: הזמנה, שם, טלפון, מייל…" className="input col-span-2 sm:max-w-md" />
        <select name="status" defaultValue={status ?? ''} className="input sm:!w-auto">
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
