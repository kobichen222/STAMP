import { INK_COLORS } from '@/designer/types';
import { getStore } from '@/server/store';
import { PageHead, SectionTitle, Stats } from '../blocks';
import { CourierBadge, OrderAge, PaidBadge, Preview } from '../components';
import { ExportMenu } from '../ExportMenu';
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
    <div className="space-y-4 sm:space-y-5">
      <PageHead title="תור ייצור" sub={`${jobs.length} עבודות בתור · הוותיקות והדחופות קודם`}>
        <WorkerName />
        <form className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:w-auto">
          <select name="ink" defaultValue={ink ?? ''} className="input !py-1.5 text-sm sm:!w-auto">
            <option value="">כל הדיו</option>
            {Object.entries(INK_COLORS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select name="size" defaultValue={size ?? ''} className="input !py-1.5 text-sm sm:!w-auto">
            <option value="">כל המידות</option>
            {sizes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="btn-dark btn-sm">סינון</button>
        </form>
      </PageHead>
      <Stats
        items={[
          { label: 'מוכנות לייצור', value: jobs.filter((o) => o.status === 'READY_FOR_PRODUCTION').length, sub: 'מחכות להתחלה', tone: 'blue' },
          { label: 'בעבודה', value: jobs.filter((o) => o.status === 'IN_PRODUCTION').length, sub: 'על המכונה עכשיו' },
          { label: 'בעייתיות', value: jobs.filter((o) => o.status === 'PRODUCTION_FILE_ERROR').length, sub: 'קובץ ייצור לבדיקה', tone: jobs.some((o) => o.status === 'PRODUCTION_FILE_ERROR') ? 'bad' : undefined },
          { label: 'חותמות לייצור', value: jobs.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0), sub: `${jobs.filter((o) => o.urgent).length} הזמנות דחופות` },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-3">
        {columns.map((c) => {
          const list = jobs.filter((o) => o.status === c.key);
          return (
            <section key={c.key}>
              <SectionTitle count={list.length}>{c.title}</SectionTitle>
              <div className="space-y-4">
                {list.map((o) => (
                  <article key={o.id} className={`card p-4 sm:p-5 ${o.urgent ? 'ring-2 ring-bad' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-extrabold" dir="ltr">
                        {o.id}
                      </p>
                      <span className="flex flex-wrap items-center justify-end gap-1.5">
                        <PaidBadge o={o} />
                        <CourierBadge o={o} />
                        {o.urgent && <span className="rounded-full bg-bad px-2 py-0.5 text-xs font-bold text-white">דחוף</span>}
                      </span>
                    </div>
                    {o.items.map((it, i) => (
                      <div key={it.id} className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-4">
                        <Preview order={o} index={i} className="h-32 w-full sm:h-28 sm:w-40" />
                        <dl className="min-w-0 text-sm">
                          <dd className="font-semibold">{it.productName}</dd>
                          <dd className="text-lg font-bold">{it.size}</dd>
                          <dd>
                            דיו {INK_COLORS[it.ink]?.label} · כמות <strong>{it.quantity}</strong>
                          </dd>
                          <dd className="text-muted">Mirror: {it.mirror ? 'כן' : 'לא'} · Black</dd>
                          <dd className="mt-1.5">
                            <a href={`/admin/orders/${o.id}/print/?item=${i}`} className="btn-primary btn-sm mb-1.5 w-full">
                              שלח להדפסה
                            </a>
                            <ExportMenu orderId={o.id} index={i} mirror={it.mirror} compact hasRasterLogo={it.design.elements.some((e) => e.type === 'image' && !e.vector)} />
                          </dd>
                        </dl>
                      </div>
                    ))}
                    <p className="mt-3 text-xs text-muted">
                      {o.customer.name} · <OrderAge o={o} />
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
