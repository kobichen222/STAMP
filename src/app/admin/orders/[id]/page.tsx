import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { notFound } from 'next/navigation';
import { INK_COLORS } from '@/designer/types';
import { ADDONS } from '@/lib/pricing';
import { formatDate } from '@/lib/format';
import { trackingLink } from '@/server/notifications';
import { loadOrder } from '@/server/orders/service';
import { STATUS_LABEL, TIMELINE, TRANSITIONS, type OrderStatus } from '@/server/orders/types';
import { addNote, markPaid, resendEmails, retryProduction, setStatus, setTracking, toggleUrgent } from '../../actions';
import { Preview, StatusBadge } from '../../components';
import { ExportMenu } from '../../ExportMenu';
import { ZigZagBox } from '../../ZigZagBox';
import { DeleteOrder } from './DeleteOrder';
import { carrierCardFor, datalogicsConfigured } from '@/server/shipping/datalogics';
import { ensureSettings } from '@/server/settings';

const KIND_LABEL: Record<string, string> = {
  'production-svg': 'SVG ייצור',
  'production-pdf': 'PDF ייצור',
  'production-eps': 'EPS',
  'master-svg': 'Master SVG',
  metadata: 'JSON',
};

/** The usual next step for each status – shown as the main action button. */
const PRIMARY: Partial<Record<OrderStatus, OrderStatus>> = {
  PAID: 'PREFLIGHT',
  PREFLIGHT: 'READY_FOR_PRODUCTION',
  AWAITING_APPROVAL: 'READY_FOR_PRODUCTION',
  CHANGE_REQUESTED: 'PREFLIGHT',
  READY_FOR_PRODUCTION: 'IN_PRODUCTION',
  IN_PRODUCTION: 'READY_FOR_SHIPPING',
  QUALITY_CHECK: 'READY_FOR_SHIPPING',
  READY_FOR_SHIPPING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await loadOrder(id);
  if (!o) notFound();
  await ensureSettings();
  const card = carrierCardFor(o);
  const next = TRANSITIONS[o.status];
  const primary = PRIMARY[o.status];
  const stepsDone = TIMELINE.filter((t) => t.reached.includes(o.status)).length;
  const closed = ['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'PAYMENT_FAILED'].includes(o.status);
  const wa = `https://wa.me/972${o.customer.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`שלום ${o.customer.name}, לגבי הזמנה ${o.id} מ-Stamp2Go: `)}`;
  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-20 sm:space-y-5 lg:pb-0">
      <div>
        <Link href="/admin/orders/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          → כל ההזמנות
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-xl font-bold sm:text-2xl" dir="ltr">
            {o.id}
          </h1>
          <StatusBadge status={o.status} />
          {o.urgent && <span className="rounded-full bg-bad px-2 py-0.5 text-xs font-bold text-white">דחוף</span>}
          <Link href={`/admin/orders/${o.id}/edit/`} className="btn-outline btn-sm ms-auto">
            <Icon name="edit" size={15} /> עריכת הזמנה
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted">
          {formatDate(o.createdAt)} · <strong className="text-ink tabular-nums">₪{o.total}</strong> · {o.paymentStatus === 'paid' ? <span className="text-ok">שולם</span> : <span className="text-warn">לא שולם</span>} · {o.shipping.label}
        </p>
        {!closed && (
          <ol className="mt-3 grid grid-cols-6 gap-1" aria-label="התקדמות ההזמנה">
            {TIMELINE.map((t, n) => (
              <li key={t.key} className="min-w-0">
                <span className={`block h-1.5 rounded-full ${n < stepsDone ? 'bg-blue' : 'bg-line'}`} />
                <span className={`mt-1 block truncate text-[10px] sm:text-xs ${n === stepsDone - 1 ? 'font-bold text-blue' : 'text-muted'}`}>{t.label}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 sm:space-y-5">
          {o.items.map((it, i) => (
            <section key={it.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap gap-4 sm:gap-5">
                <Preview order={o} index={i} className="h-36 w-full sm:h-40 sm:w-64" />
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
                    {it.addons && Object.values(it.addons).some(Boolean) && (
                      <>
                        <dt className="text-muted">תוספות</dt>
                        <dd className="font-semibold text-blue">
                          {ADDONS.filter((a) => it.addons?.[a.id])
                            .map((a) => `${a.label} × ${it.addons![a.id]}`)
                            .join(' · ')}
                        </dd>
                      </>
                    )}
                    {it.priceLines && (
                      <>
                        <dt className="text-muted">תמחור</dt>
                        <dd className="text-xs text-muted">{it.priceLines.map((l) => `${l.label} ${l.amount < 0 ? '−' : ''}₪${Math.abs(l.amount)}`).join(' · ')}</dd>
                      </>
                    )}
                    <dt className="text-muted max-sm:hidden">Profile</dt>
                    <dd className="max-sm:hidden">{it.profileId}</dd>
                    <dt className="text-muted max-sm:hidden">Design version</dt>
                    <dd dir="ltr" className="text-right text-xs max-sm:hidden">
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
              <Link href={`/admin/orders/${o.id}/print/?item=${i}`} className="btn-primary mt-4 w-full sm:w-auto">
                <Icon name="file" size={17} /> שלח להדפסה
              </Link>
              <div className="mt-3 flex flex-wrap gap-2">
                {it.files
                  .filter((f) => f.kind !== 'preview-svg')
                  .map((f) => (
                    <a key={f.path} href={`/api/admin/files/?path=${encodeURIComponent(f.path)}`} className={f.kind.startsWith('production') ? 'btn-primary btn-sm' : 'btn-outline btn-sm'}>
                      הורד {KIND_LABEL[f.kind] ?? f.kind}
                    </a>
                  ))}
                {!it.files.length && <span className="text-sm text-muted">קבצי ייצור עוד לא נוצרו</span>}
              </div>
              <div className="mt-3">
                <p className="mb-1.5 text-sm font-semibold">הורדה בכל פורמט (CorelDRAW / לייזר)</p>
                <ExportMenu orderId={o.id} index={i} mirror={it.mirror} hasRasterLogo={it.design.elements.some((e) => e.type === 'image' && !e.vector)} />
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

          <details className="card group p-4 sm:p-5" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
              יומן פעולות <span className="text-xs font-normal text-muted">({o.audit.length})</span>
            </summary>
            <ul className="mt-3 space-y-1.5 text-sm">
              {[...o.audit].reverse().map((a, n) => (
                <li key={n} className="flex flex-col gap-0.5 border-b border-line/60 pb-1.5 last:border-0 sm:flex-row sm:gap-3 sm:border-0 sm:pb-0">
                  <span className="shrink-0 text-xs text-muted tabular-nums sm:w-32 sm:text-sm">{formatDate(a.at)}</span>
                  <span>
                    <strong>{a.actor}</strong> · {a.action}
                    {a.to && ` → ${STATUS_LABEL[a.to]}`}
                    {a.note && <span className="text-muted"> · {a.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <aside className="space-y-4 max-lg:order-first sm:space-y-5">
          <section className="card p-4 sm:p-5">
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
              {o.shipping.address && ` · ${[o.shipping.address.street, o.shipping.address.city].filter(Boolean).join(', ')}`}
            </p>
            {card && (
              <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm">
                לשדר בזיג זג בכרטיס לקוח <strong dir="ltr">{card}</strong> ·{' '}
                <a href="https://www.zig-zag.co.il/" target="_blank" rel="noopener" className="text-blue underline">
                  לאתר זיג זג
                </a>
              </p>
            )}
            {o.notes && <p className="mt-2 rounded-lg bg-warn/10 p-2 text-sm">הערת לקוח: {o.notes}</p>}
            <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              <a href={`tel:${o.customer.phone}`} className="btn-outline btn-sm">
                <Icon name="phone" size={15} /> חיוג
              </a>
              <a href={wa} target="_blank" rel="noopener" className="btn-outline btn-sm">
                <Icon name="whatsapp" size={15} /> וואטסאפ
              </a>
              {o.customer.email && (
                <a href={`mailto:${o.customer.email}?subject=${encodeURIComponent(`הזמנה ${o.id}`)}`} className="btn-outline btn-sm">
                  <Icon name="mail" size={15} /> מייל
                </a>
              )}
              <a href={trackingLink(o)} target="_blank" rel="noopener" className="btn-ghost btn-sm col-span-3">
                קישור מעקב ללקוח
              </a>
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <h2 className="font-bold">סטטוס</h2>
            {primary && (
              <form action={setStatus.bind(null, o.id, primary, undefined)} className="mt-3">
                <button className="btn-primary w-full">העברה ל: {STATUS_LABEL[primary]}</button>
              </form>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {next.filter((x) => x !== primary).map((s) => (
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
            {(o.paymentStatus === 'paid' || o.paymentMethod === 'manual') && !o.notificationsSent.includes('order.created:staff') && (
              <form action={resendEmails.bind(null, o.id)} className="mt-3">
                <button className="btn-outline btn-sm w-full">שליחת מיילי ההזמנה שלא נשלחו</button>
              </form>
            )}
            <form action={toggleUrgent.bind(null, o.id)} className="mt-3">
              <button className="btn-ghost btn-sm">{o.urgent ? 'בטל דחיפות' : 'סמן כדחוף'}</button>
            </form>
          </section>

          <section id="pay" className="card scroll-mt-20 p-4 sm:p-5">
            <h2 className="font-bold">תשלום</h2>
            <p className="mt-2 text-sm">
              ₪{o.total} · {o.paymentStatus === 'paid' ? `שולם ${o.paymentRef ?? ''}` : 'לא שולם'} ({o.paymentMethod})
            </p>
            {o.paymentStatus !== 'paid' && (
              <form action={markPaid.bind(null, o.id)} className="mt-3 flex gap-2">
                <input name="ref" placeholder="אסמכתא" className="input min-w-0 !py-1.5 text-sm" />
                <button className="btn-dark btn-sm shrink-0">סמן כשולם</button>
              </form>
            )}
          </section>

          <section className="card p-4 sm:p-5">
            <h2 className="font-bold">משלוח</h2>
            {card && (
              <ZigZagBox
                id={o.id}
                card={card}
                configured={datalogicsConfigured()}
                tracking={o.shipping.trackingNumber}
                labelUrl={o.shipping.labelUrl}
                history={o.shipping.statusHistory}
              />
            )}
            <form action={setTracking.bind(null, o.id)} className="mt-3 space-y-2">
              <input name="carrier" defaultValue={o.shipping.carrier} placeholder="חברת שילוח" className="input !py-1.5 text-sm" />
              <input name="trackingNumber" defaultValue={o.shipping.trackingNumber} placeholder="מספר מעקב" className="input !py-1.5 text-sm" dir="ltr" />
              <input name="trackingUrl" defaultValue={o.shipping.trackingUrl} placeholder="קישור מעקב" className="input !py-1.5 text-sm" dir="ltr" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ship" value="1" className="accent-blue" /> סמן כנשלח
              </label>
              <button className="btn-outline btn-sm w-full sm:w-auto">שמירת משלוח</button>
            </form>
          </section>

          <section className="card p-4 sm:p-5">
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
          <section className="card p-4 sm:p-5">
            <DeleteOrder
              id={o.id}
              warnings={[
                ...(o.paymentStatus === 'paid' ? ['ההזמנה שולמה – מחיקה לא מבטלת את החיוב בכרטיס.'] : []),
                ...(o.shipping.trackingNumber ? ['נוצר לה משלוח – בטלו אותו קודם בזיג זג.'] : []),
                ...(['IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING'].includes(o.status) ? ['ההזמנה כבר בייצור.'] : []),
              ]}
            />
          </section>
        </aside>
      </div>

      {/* Phones: quick actions always at hand, above the bottom tabs */}
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <a href={`tel:${o.customer.phone}`} className="btn-outline btn-sm !h-11 !w-11 shrink-0 !p-0" aria-label="חיוג ללקוח">
            <Icon name="phone" size={18} />
          </a>
          <a href={wa} target="_blank" rel="noopener" className="btn-outline btn-sm !h-11 !w-11 shrink-0 !p-0 text-[#25D366]" aria-label="וואטסאפ ללקוח">
            <Icon name="whatsapp" size={18} />
          </a>
          {primary ? (
            <form action={setStatus.bind(null, o.id, primary, undefined)} className="min-w-0 flex-1">
              <button className="btn-primary !h-11 w-full truncate text-sm">העברה ל: {STATUS_LABEL[primary]}</button>
            </form>
          ) : o.paymentStatus !== 'paid' && !closed ? (
            <a href="#pay" className="btn-dark !h-11 min-w-0 flex-1 text-sm">
              סימון תשלום
            </a>
          ) : (
            <span className="min-w-0 flex-1 truncate text-center text-sm text-muted">{STATUS_LABEL[o.status]}</span>
          )}
        </div>
      </div>
    </div>
  );
}
