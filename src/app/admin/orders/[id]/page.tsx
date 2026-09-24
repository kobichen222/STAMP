import Link from 'next/link';
import { notFound } from 'next/navigation';
import { INK_COLORS } from '@/designer/types';
import { formatDate } from '@/lib/format';
import { trackingLink } from '@/server/notifications';
import { loadOrder } from '@/server/orders/service';
import { STATUS_LABEL, TRANSITIONS } from '@/server/orders/types';
import { addNote, markPaid, retryProduction, setStatus, setTracking, toggleUrgent } from '../../actions';
import { Preview, StatusBadge } from '../../components';

const KIND_LABEL: Record<string, string> = {
  'production-svg': 'SVG ייצור',
  'production-pdf': 'PDF ייצור',
  'production-eps': 'EPS',
  'master-svg': 'Master SVG',
  metadata: 'JSON',
};

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await loadOrder(id);
  if (!o) notFound();
  const next = TRANSITIONS[o.status];
  const wa = `https://wa.me/972${o.customer.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`שלום ${o.customer.name}, לגבי הזמנה ${o.id} מ-Stamp2Go: `)}`;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders/" className="text-sm text-muted">
          ← הזמנות
        </Link>
        <h1 className="text-2xl font-bold" dir="ltr">
          {o.id}
        </h1>
        <StatusBadge status={o.status} />
        {o.urgent && <span className="rounded-full bg-bad px-2 py-0.5 text-xs font-bold text-white">דחוף</span>}
        <span className="text-sm text-muted">{formatDate(o.createdAt)}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {o.items.map((it, i) => (
            <section key={it.id} className="card p-5">
              <div className="flex flex-wrap gap-5">
                <Preview order={o} index={i} className="h-40 w-64" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">{it.productName}</h2>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted">מידה</dt>
                    <dd className="font-semibold">{it.size}</dd>
                    <dt className="text-muted">Mirror</dt>
                    <dd>{it.mirror ? 'כן' : 'לא'}</dd>
                    <dt className="text-muted">צבע קובץ</dt>
                    <dd>Black 100%</dd>
                    <dt className="text-muted">צבע דיו</dt>
                    <dd>{INK_COLORS[it.ink]?.label}</dd>
                    <dt className="text-muted">כמות</dt>
                    <dd className="font-semibold">{it.quantity}</dd>
                    <dt className="text-muted">Profile</dt>
                    <dd>{it.profileId}</dd>
                    <dt className="text-muted">Design version</dt>
                    <dd dir="ltr" className="text-right text-xs">
                      {it.designVersionId}
                    </dd>
                    {it.worker && (
                      <>
                        <dt className="text-muted">עובד</dt>
                        <dd>
                          {it.worker} · {it.startedAt && formatDate(it.startedAt)}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {it.files
                  .filter((f) => f.kind !== 'preview-svg')
                  .map((f) => (
                    <a key={f.path} href={`/api/admin/files/?path=${encodeURIComponent(f.path)}`} className={f.kind.startsWith('production') ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>
                      הורד {KIND_LABEL[f.kind] ?? f.kind}
                    </a>
                  ))}
                {!it.files.length && <span className="text-sm text-muted">קבצי ייצור עוד לא נוצרו</span>}
              </div>
              <div className="mt-4 rounded-xl bg-surface p-3 text-sm">
                <p className={it.preflight.ready ? 'font-semibold text-ok' : 'font-semibold text-bad'}>
                  Preflight: {it.preflight.ready ? 'מוכן לייצור' : 'נדרשים תיקונים'} · Production readiness {it.preflight.score}%
                </p>
                {[...it.preflight.errors.map((e) => ['error', e]), ...it.preflight.warnings.map((w) => ['warning', w])].map(([t, m], n) => (
                  <p key={n} className={t === 'error' ? 'text-bad' : 'text-warn'}>
                    • {m}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section className="card p-5">
            <h2 className="font-bold">יומן פעולות (Audit)</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[...o.audit].reverse().map((a, n) => (
                <li key={n} className="flex gap-3">
                  <span className="w-32 shrink-0 text-muted tabular-nums">{formatDate(a.at)}</span>
                  <span>
                    <strong>{a.actor}</strong> · {a.action}
                    {a.to && ` → ${STATUS_LABEL[a.to]}`}
                    {a.note && <span className="text-muted"> · {a.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold">לקוח</h2>
            <p className="mt-2 font-semibold">{o.customer.name}</p>
            <p className="text-sm" dir="ltr">
              {o.customer.phone}
            </p>
            {o.customer.email && <p className="text-sm">{o.customer.email}</p>}
            {o.customer.company && (
              <p className="text-sm">
                {o.customer.company} {o.customer.companyId && `· ח.פ. ${o.customer.companyId}`}
              </p>
            )}
            {o.customer.poNumber && <p className="text-sm">PO: {o.customer.poNumber}</p>}
            <p className="mt-2 text-sm text-muted">
              {o.shipping.label}
              {o.shipping.address && ` · ${o.shipping.address.street}, ${o.shipping.address.city}`}
            </p>
            {o.notes && <p className="mt-2 rounded-lg bg-warn/10 p-2 text-sm">הערת לקוח: {o.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${o.customer.phone}`} className="btn-outline btn-sm">
                חיוג
              </a>
              <a href={wa} target="_blank" rel="noopener" className="btn-outline btn-sm">
                WhatsApp
              </a>
              {o.customer.email && (
                <a href={`mailto:${o.customer.email}?subject=${encodeURIComponent(`הזמנה ${o.id}`)}`} className="btn-outline btn-sm">
                  Email
                </a>
              )}
              <a href={trackingLink(o)} target="_blank" rel="noopener" className="btn-ghost btn-sm">
                קישור מעקב ללקוח
              </a>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">סטטוס</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {next.map((s) => (
                <form key={s} action={setStatus.bind(null, o.id, s, undefined)}>
                  <button className={['CANCELLED', 'REFUNDED'].includes(s) ? 'btn-ghost btn-sm text-bad' : 'btn-outline btn-sm'}>{STATUS_LABEL[s]}</button>
                </form>
              ))}
            </div>
            {o.status === 'PRODUCTION_FILE_ERROR' && (
              <form action={retryProduction.bind(null, o.id)} className="mt-3">
                <button className="btn-primary btn-sm w-full">נסה שוב ליצור קבצים</button>
              </form>
            )}
            <form action={toggleUrgent.bind(null, o.id)} className="mt-3">
              <button className="btn-ghost btn-sm">{o.urgent ? 'בטל דחיפות' : 'סמן כדחוף'}</button>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">תשלום</h2>
            <p className="mt-2 text-sm">
              ₪{o.total} · {o.paymentStatus === 'paid' ? `שולם ${o.paymentRef ?? ''}` : 'לא שולם'} ({o.paymentMethod})
            </p>
            {o.paymentStatus !== 'paid' && (
              <form action={markPaid.bind(null, o.id)} className="mt-3 flex gap-2">
                <input name="ref" placeholder="אסמכתא" className="input !py-1.5 text-sm" />
                <button className="btn-dark btn-sm">סמן כשולם</button>
              </form>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-bold">משלוח</h2>
            <form action={setTracking.bind(null, o.id)} className="mt-3 space-y-2">
              <input name="carrier" defaultValue={o.shipping.carrier} placeholder="חברת שילוח" className="input !py-1.5 text-sm" />
              <input name="trackingNumber" defaultValue={o.shipping.trackingNumber} placeholder="מספר מעקב" className="input !py-1.5 text-sm" dir="ltr" />
              <input name="trackingUrl" defaultValue={o.shipping.trackingUrl} placeholder="קישור מעקב" className="input !py-1.5 text-sm" dir="ltr" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ship" value="1" className="accent-blue" /> סמן כנשלח
              </label>
              <button className="btn-outline btn-sm">שמירה</button>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">הערות פנימיות</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {o.staffNotes.map((n, i) => (
                <li key={i} className="rounded-lg bg-surface p-2">
                  {n.text}
                  <span className="block text-xs text-muted">
                    {n.by} · {formatDate(n.at)}
                  </span>
                </li>
              ))}
            </ul>
            <form action={addNote.bind(null, o.id)} className="mt-3 space-y-2">
              <textarea name="text" rows={2} className="input text-sm" placeholder="לא מוצג ללקוח" />
              <button className="btn-outline btn-sm">הוספת הערה</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
