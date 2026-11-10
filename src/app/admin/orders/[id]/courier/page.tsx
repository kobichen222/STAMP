import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE } from '@/lib/config';
import { DEFAULT_RULES } from '@/lib/pricing';
import { loadOrder } from '@/server/orders/service';
import { requireStaff } from '@/server/staff';
import { carrierCardFor, splitStreet } from '@/server/shipping/datalogics';
import { PrintButton } from './PrintButton';

export const metadata = { title: 'דף לשליח' };
export const dynamic = 'force-dynamic';

const SIZES = { a6: { w: 105, h: 148, label: 'A6 (מדבקה)' }, a5: { w: 148, h: 210, label: 'A5' }, a4: { w: 210, h: 297, label: 'A4' } } as const;
type Size = keyof typeof SIZES;

/** A slip for the courier: who, where, how and what to watch for – no prices, no design details. */
export default async function CourierSlip({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ size?: string }> }) {
  await requireStaff(['admin', 'production']);
  const { id } = await params;
  const sp = await searchParams;
  const o = await loadOrder(id);
  if (!o) notFound();
  const size: Size = sp.size && sp.size in SIZES ? (sp.size as Size) : 'a6';
  const page = SIZES[size];
  const scale = size === 'a6' ? 1 : size === 'a5' ? 1.3 : 1.7;

  const addr = o.shipping.address;
  const method = o.shipping.method;
  const rule = DEFAULT_RULES.shipping.find((m) => m.id === method);
  const card = carrierCardFor(o);
  const locker = method === 'locker';
  const pickup = method === 'pickup';
  const { street, house } = splitStreet(locker ? '' : (addr?.street ?? ''));
  const pieces = o.items.reduce((n, i) => n + i.quantity, 0);
  const created = new Date(o.createdAt).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
  const today = new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });

  const Row = ({ k, v, big }: { k: string; v?: React.ReactNode; big?: boolean }) =>
    v ? (
      <div className="slip-row">
        <span className="slip-k">{k}</span>
        <span className={big ? 'slip-v slip-big' : 'slip-v'}>{v}</span>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href={`/admin/orders/${o.id}/`} className="btn-outline btn-sm">
          → חזרה להזמנה
        </Link>
        <h1 className="text-xl font-bold">דף לשליח</h1>
        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          {(Object.keys(SIZES) as Size[]).map((s) => (
            <Link key={s} href={`?size=${s}`} className={`btn-sm ${s === size ? 'btn-primary' : 'btn-outline'}`}>
              {SIZES[s].label}
            </Link>
          ))}
          <PrintButton />
        </div>
      </div>

      <div className="overflow-auto rounded-xl bg-surface p-3 no-print-bg">
        <article id="courier-slip" dir="rtl" style={{ width: `${page.w}mm`, minHeight: `${page.h}mm`, fontSize: `${10 * scale}pt` }}>
          <header className="slip-head">
            <div>
              <div className="slip-brand">{SITE.name} · חתום ונעול</div>
              <div className="slip-small">
                שולח: {SITE.address} · {SITE.phone}
              </div>
            </div>
            <div className="slip-order" dir="ltr">
              {o.id}
            </div>
          </header>

          <div className="slip-method">
            {o.shipping.label}
            {rule?.eta && <div className="slip-small">{rule.eta}</div>}
          </div>
          {o.urgent && <div className="slip-urgent">דחוף</div>}

          <section className="slip-box">
            <div className="slip-title">{pickup ? 'נאסף על ידי' : 'נמען'}</div>
            <div className="slip-name">{o.customer.name}</div>
            {o.customer.company && <div className="slip-v">{o.customer.company}</div>}
            <div className="slip-phone" dir="ltr">
              {o.customer.phone}
            </div>
          </section>

          {!pickup && (
            <section className="slip-box">
              <div className="slip-title">{locker ? 'נקודת מסירה / לוקר' : 'כתובת למסירה'}</div>
              {locker ? (
                <>
                  <Row k="עיר" v={addr?.city} big />
                  <Row k="נקודה מועדפת" v={addr?.street} />
                </>
              ) : (
                <>
                  <Row k="עיר" v={addr?.city} big />
                  <Row k="רחוב" v={street} big />
                  <Row k="מספר בית" v={house} big />
                  <Row k="מיקוד" v={addr?.zip} />
                </>
              )}
              {addr?.notes && <div className="slip-note">הערות כתובת: {addr.notes}</div>}
            </section>
          )}

          {o.notes && <div className="slip-note">הערת לקוח: {o.notes}</div>}

          <section className="slip-grid">
            <Row k="חבילות" v="1" />
            <Row k="פריטים" v={String(pieces)} />
            <Row k="משקל" v={`${Number(process.env.DATALOGICS_WEIGHT) || 0.5} ק״ג`} />
            {card && <Row k="כרטיס זיג זג" v={<span dir="ltr">{card}</span>} />}
            {o.shipping.trackingNumber && <Row k="מספר משלוח" v={<span dir="ltr">{o.shipping.trackingNumber}</span>} />}
            <Row k="תאריך הזמנה" v={created} />
            <Row k="תאריך הדפסה" v={today} />
          </section>

          <footer className="slip-sign">
            <span>שם המקבל: ______________</span>
            <span>חתימה: ___________</span>
          </footer>
        </article>
      </div>

      <style>{`
        #courier-slip { background: #fff; color: #000; margin: 0 auto; padding: 5mm; box-sizing: border-box; font-family: inherit; line-height: 1.3; display: flex; flex-direction: column; gap: 2.5mm }
        #courier-slip .slip-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm; border-bottom: 0.5mm solid #000; padding-bottom: 2mm }
        #courier-slip .slip-brand { font-weight: 800; font-size: 1.1em }
        #courier-slip .slip-small { font-size: 0.8em }
        #courier-slip .slip-order { font-weight: 800; font-size: 1.15em; border: 0.4mm solid #000; padding: 1mm 2mm; white-space: nowrap }
        #courier-slip .slip-method { background: #000; color: #fff; text-align: center; font-weight: 800; font-size: 1.35em; padding: 2mm; -webkit-print-color-adjust: exact; print-color-adjust: exact }
        #courier-slip .slip-method .slip-small { font-weight: 400 }
        #courier-slip .slip-urgent { border: 0.6mm solid #000; text-align: center; font-weight: 900; font-size: 1.4em; letter-spacing: 1mm }
        #courier-slip .slip-box { border: 0.4mm solid #000; padding: 2mm; border-radius: 1.5mm }
        #courier-slip .slip-title { font-size: 0.8em; font-weight: 700; text-decoration: underline; margin-bottom: 1mm }
        #courier-slip .slip-name { font-size: 1.5em; font-weight: 800 }
        #courier-slip .slip-phone { font-size: 1.5em; font-weight: 800; text-align: right }
        #courier-slip .slip-row { display: flex; gap: 2mm; align-items: baseline }
        #courier-slip .slip-k { font-size: 0.8em; min-width: 18mm }
        #courier-slip .slip-v { font-weight: 600 }
        #courier-slip .slip-big { font-size: 1.3em; font-weight: 800 }
        #courier-slip .slip-note { border: 0.4mm dashed #000; padding: 1.5mm 2mm; font-weight: 700 }
        #courier-slip .slip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5mm 3mm; font-size: 0.9em }
        #courier-slip .slip-sign { margin-top: auto; display: flex; justify-content: space-between; gap: 2mm; font-size: 0.85em; padding-top: 4mm }
        @media print {
          @page { size: ${page.w}mm ${page.h}mm; margin: 0 }
          html, body { background: #fff !important }
          body * { visibility: hidden !important }
          #courier-slip, #courier-slip * { visibility: visible !important }
          #courier-slip { position: fixed; top: 0; left: 0; margin: 0; width: ${page.w}mm; height: ${page.h}mm; min-height: 0; overflow: hidden }
        }
      `}</style>
    </div>
  );
}
