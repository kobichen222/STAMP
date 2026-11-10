import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/format';
import { exportDesign } from '@/server/production-engine';
import { loadOrder } from '@/server/orders/service';
import { getStore } from '@/server/store';
import { requireStaff } from '@/server/staff';
import { PrintStation } from './PrintStation';

export const metadata = { title: 'שליחה להדפסה' };
export const dynamic = 'force-dynamic';

/** One plate at true size (mm), ready for the browser's print dialog – staff pick the printer there. */
export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ item?: string; mirror?: string }> }) {
  await requireStaff(['admin', 'production']);
  const { id } = await params;
  const sp = await searchParams;
  const o = await loadOrder(id);
  if (!o) notFound();
  const index = Math.min(Math.max(0, Number(sp.item ?? 0) || 0), o.items.length - 1);
  const it = o.items[index];
  const mirror = sp.mirror == null ? it.mirror : sp.mirror === '1';
  const out = await exportDesign(it.design, 'svg', mirror, {
    orderId: o.id,
    customer: o.customer.company || o.customer.name,
    productName: it.productName,
    ink: it.ink,
    quantity: it.quantity,
    index,
  });
  const svg = String(out.data).replace(/<\?xml[^>]*>\s*/, '');

  // Recent prints from every order (newest first) – shows which printers/computers are in use.
  const recent = (await getStore().listOrders({ limit: 200 }))
    .flatMap((x) => x.audit.filter((a) => a.action === 'print').map((a) => ({ ...a, orderId: x.id })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-10">
      <div>
        <Link href={`/admin/orders/${o.id}/`} className="text-sm text-muted hover:text-ink">
          → חזרה להזמנה
        </Link>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
          שליחה להדפסה · <span dir="ltr">{o.id}</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          {o.customer.company || o.customer.name} · {it.productName} · כמות {it.quantity}
        </p>
      </div>

      <PrintStation
        orderId={o.id}
        index={index}
        items={o.items.map((x, i) => ({ index: i, label: `${i + 1}. ${x.productName} (${x.size})` }))}
        mirror={mirror}
        svg={svg}
        size={`${it.design.width}×${it.design.height} מ"מ`}
        mm={{ w: it.design.width, h: it.design.height }}
        shape={it.design.shape}
        quantity={it.quantity}
        canStart={['READY_FOR_PRODUCTION', 'AWAITING_APPROVAL'].includes(o.status)}
        omittedImages={out.omittedImages}
      />

      <section className="card p-4 sm:p-5">
        <h2 className="font-bold">יומן הדפסות</h2>
        <p className="mt-1 text-xs text-muted">כל הדפסה נרשמת עם שם המדפסת שנבחרה והמחשב שממנו הודפסה.</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {recent.map((r, n) => (
            <li key={n} className="py-2">
              <span className="text-xs text-muted tabular-nums">{formatDate(r.at)}</span>{' '}
              <Link href={`/admin/orders/${r.orderId}/`} className="font-semibold text-blue" dir="ltr">
                {r.orderId}
              </Link>{' '}
              · {r.actor}
              <span className="block break-words text-xs text-ink-2">{r.note}</span>
            </li>
          ))}
          {!recent.length && <li className="py-3 text-muted">עוד לא הודפס דבר.</li>}
        </ul>
      </section>
    </div>
  );
}
