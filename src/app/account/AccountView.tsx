'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StampThumb } from '@/components/StampThumb';
import { Icon } from '@/components/ui/Icon';
import { addToCart } from '@/lib/cart-store';
import { deleteDesign, designsStore, duplicateDesign, ordersStore } from '@/lib/designs-store';
import { formatDate, formatPrice } from '@/lib/format';

function OrderStatus({ id, token }: { id: string; token: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/orders/${id}/?t=${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLabel(d?.statusLabel ?? '—'))
      .catch(() => setLabel('—'));
  }, [id, token]);
  return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue">{label ?? '…'}</span>;
}

function Lookup() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className="card grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const r = await fetch('/api/orders/lookup/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, phone }) });
        const d = await r.json();
        if (r.ok) router.push(d.url);
        else setError(d.error);
      }}
    >
      <label>
        <span className="label">מספר הזמנה</span>
        <input className="input text-right" dir="ltr" placeholder="ORD-…" value={id} onChange={(e) => setId(e.target.value)} required />
      </label>
      <label>
        <span className="label">טלפון</span>
        <input className="input text-right" dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <button className="btn-dark">מעקב</button>
      {error && <p className="text-sm text-bad sm:col-span-3">{error}</p>}
    </form>
  );
}

export function AccountView() {
  const designs = designsStore.use();
  const orders = ordersStore.use();
  const router = useRouter();
  const [tab, setTab] = useState<'designs' | 'orders'>('designs');
  useEffect(() => {
    if (window.location.hash === '#orders') setTab('orders');
  }, []);

  return (
    <div className="container-x pt-24 pb-20">
      <h1 className="text-3xl font-extrabold">האזור שלי</h1>
      <p className="mt-2 text-sm text-muted">העיצובים וההזמנות נשמרים במכשיר הזה. כניסה עם חשבון לסנכרון בין מכשירים – בקרוב.</p>
      <div className="mt-6 flex gap-2" role="tablist">
        {(
          [
            ['designs', `העיצובים שלי (${designs.length})`],
            ['orders', `ההזמנות שלי (${orders.length})`],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`chip ${tab === k ? 'chip-on' : ''}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'designs' ? (
        <section id="designs" className="mt-6">
          {!designs.length ? (
            <div className="card grid place-items-center p-12 text-center">
              <p className="text-muted">עוד אין עיצובים שמורים.</p>
              <Link href="/designer/" className="btn-primary mt-4">
                עיצוב חותמת
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map((d) => (
                <article key={d.id} className="card flex flex-col p-4">
                  <div className="grid aspect-[3/2] place-items-center rounded-xl bg-[#fdfcf8] p-4">
                    <StampThumb svg={d.previewSvg} ink={d.design.inkColor} className="max-h-full max-w-full" />
                  </div>
                  <h2 className="mt-3 truncate font-semibold">{d.name}</h2>
                  <p className="text-sm text-muted">
                    {d.productName} · {d.size}
                  </p>
                  <p className="text-xs text-muted">עודכן {formatDate(d.updatedAt)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href={`/designer/${d.productSlug}/?design=${d.id}`} className="btn-primary btn-sm">
                      עריכה
                    </Link>
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => {
                        addToCart({
                          productSlug: d.productSlug,
                          productName: d.productName,
                          modelId: d.design.modelId,
                          size: d.size,
                          design: d.design,
                          previewSvg: d.previewSvg,
                          ink: d.design.inkColor,
                          quantity: 1,
                          unitPrice: d.price ?? null,
                          designId: d.id,
                        });
                        router.push('/cart/?added=1');
                      }}
                    >
                      הזמן שוב
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => duplicateDesign(d.id)}>
                      <Icon name="copy" size={15} /> שכפול
                    </button>
                    <button type="button" className="btn-ghost btn-sm text-bad" onClick={() => confirm('למחוק את העיצוב?') && deleteDesign(d.id)}>
                      <Icon name="trash" size={15} /> מחיקה
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section id="orders" className="mt-6 space-y-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/order/${o.id}/?t=${o.token}`} className="card flex items-center gap-4 p-4 transition hover:shadow-soft">
              <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-[#fdfcf8] p-1.5">
                <StampThumb svg={o.items[0]?.previewSvg ?? ''} className="max-h-full max-w-full" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold" dir="ltr">
                  {o.id}
                </p>
                <p className="truncate text-muted">
                  {formatDate(o.createdAt)} · {o.items.map((i) => i.name).join(', ')}
                </p>
              </div>
              <OrderStatus id={o.id} token={o.token} />
              <span className="font-semibold">{formatPrice(o.total)}</span>
            </Link>
          ))}
          <h2 className="pt-4 font-semibold">הזמנה ממכשיר אחר?</h2>
          <Lookup />
        </section>
      )}
    </div>
  );
}
