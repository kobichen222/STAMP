import { INK_COLORS } from '@/designer/types';
import { getStore } from '@/server/store';
import { Preview } from '../components';
import { ProductionControls, WorkerName } from './ProductionControls';

export const metadata = { title: 'תור ייצור' };

export default async function ProductionQueue({ searchParams }: { searchParams: Promise<{ ink?: string; size?: string }> }) {
  const { ink, size } = await searchParams;
  const all = await getStore().listOrders({ status: ['READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'PRODUCTION_FILE_ERROR'], limit: 200 });
  const jobs = all
    .filter((o) => (!ink || o.items.some((i) => i.ink === ink)) && (!size || o.items.some((i) => i.size === size)))
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || a.createdAt.localeCompare(b.createdAt));
  const sizes = [...new Set(all.flatMap((o) => o.items.map((i) => i.size)))];
  const columns = [
    { key: 'READY_FOR_PRODUCTION', title: 'חדשות – מוכנות לייצור' },
    { key: 'IN_PRODUCTION', title: 'בעבודה' },
    { key: 'PRODUCTION_FILE_ERROR', title: 'בעייתיות' },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">תור ייצור</h1>
        <WorkerName />
        <form className="ms-auto flex gap-2">
          <select name="ink" defaultValue={ink ?? ''} className="input !w-auto !py-1.5 text-sm">
            <option value="">כל צבעי הדיו</option>
            {Object.entries(INK_COLORS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select name="size" defaultValue={size ?? ''} className="input !w-auto !py-1.5 text-sm">
            <option value="">כל המידות</option>
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="btn-dark btn-sm">סינון</button>
        </form>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        {columns.map((c) => {
          const list = jobs.filter((o) => o.status === c.key);
          return (
            <section key={c.key}>
              <h2 className="mb-3 font-semibold">
                {c.title} <span className="text-muted">({list.length})</span>
              </h2>
              <div className="space-y-4">
                {list.map((o) => (
                  <article key={o.id} className={`card p-5 ${o.urgent ? 'ring-2 ring-bad' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-extrabold" dir="ltr">
                        {o.id}
                      </p>
                      {o.urgent && <span className="rounded-full bg-bad px-2 py-0.5 text-xs font-bold text-white">דחוף</span>}
                    </div>
                    {o.items.map((it, i) => (
                      <div key={it.id} className="mt-3 flex gap-4">
                        <Preview order={o} index={i} className="h-28 w-40" />
                        <dl className="text-sm">
                          <dd className="font-semibold">{it.productName}</dd>
                          <dd className="text-lg font-bold">{it.size}</dd>
                          <dd>
                            דיו {INK_COLORS[it.ink]?.label} · כמות <strong>{it.quantity}</strong>
                          </dd>
                          <dd className="text-muted">Mirror: {it.mirror ? 'כן' : 'לא'} · Black</dd>
                          <dd className="mt-1 flex gap-1.5">
                            {it.files
                              .filter((f) => f.kind === 'production-svg' || f.kind === 'production-pdf' || f.kind === 'production-eps')
                              .map((f) => (
                                <a key={f.path} href={`/api/admin/files/?path=${encodeURIComponent(f.path)}`} className="btn-outline btn-sm !px-2.5">
                                  {f.name.split('.').pop()?.toUpperCase()}
                                </a>
                              ))}
                          </dd>
                        </dl>
                      </div>
                    ))}
                    <p className="mt-3 text-xs text-muted">
                      {o.customer.name} · {new Date(o.createdAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}
                      {o.items[0]?.worker && ` · ${o.items[0].worker}`}
                    </p>
                    <ProductionControls id={o.id} status={o.status} />
                  </article>
                ))}
                {!list.length && <p className="card p-6 text-center text-sm text-muted">אין עבודות</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
