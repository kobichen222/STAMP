'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { INK_COLORS, type InkColor } from '@/designer/types';
import { saveDesign } from '@/lib/designs-store';
import { addressNeed, ADDONS, lineInputFor, quoteCart, quoteLine, type PricingRules } from '@/lib/pricing';
import type { Order } from '@/server/orders/types';
import { Preview } from '../../../components';
import { updateOrder } from '../../../order-edit-actions';

type ItemDraft = { id: string; quantity: number; ink: InkColor; addons: Record<string, number>; removed: boolean };

const Field = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <label className={`block text-sm ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="mb-1 block font-medium">{label}</span>
    {children}
  </label>
);

export function OrderEditor({ order: o, rules, basePrices }: { order: Order; rules: PricingRules; basePrices: Record<string, number | null> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [customer, setCustomer] = useState({
    name: o.customer.name,
    phone: o.customer.phone,
    email: o.customer.email ?? '',
    company: o.customer.company ?? '',
    companyId: o.customer.companyId ?? '',
    poNumber: o.customer.poNumber ?? '',
  });
  const [method, setMethod] = useState(o.shipping.method);
  const [address, setAddress] = useState({ street: o.shipping.address?.street ?? '', city: o.shipping.address?.city ?? '', zip: o.shipping.address?.zip ?? '', notes: o.shipping.address?.notes ?? '' });
  const [items, setItems] = useState<ItemDraft[]>(() =>
    o.items.map((it) => ({ id: it.id, quantity: it.quantity, ink: it.ink, addons: Object.fromEntries(Object.entries(it.addons ?? {}).map(([k, v]) => [k, v ?? 0])), removed: false })),
  );
  const [notes, setNotes] = useState(o.notes ?? '');
  const [adjustment, setAdjustment] = useState(o.adjustment ? String(o.adjustment) : '');

  const ship = rules.shipping.find((s) => s.id === method) ?? rules.shipping[0];
  const need = addressNeed(ship);
  const setItem = (id: string, patch: Partial<ItemDraft>) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // Live price with the same functions the server uses.
  const quote = useMemo(() => {
    const lines = items
      .filter((d) => !d.removed)
      .map((d) => {
        const it = o.items.find((x) => x.id === d.id)!;
        const base = basePrices[d.id];
        if (base == null) return it.unitPrice * d.quantity;
        return quoteLine(lineInputFor({ basePrice: base, quantity: d.quantity, design: it.design, ink: d.ink, body: it.bodyColor, addons: d.addons }), rules).total;
      });
    const cart = quoteCart(lines, { shippingId: ship.id }, rules);
    const discount = o.discount > 0 && o.subtotal > 0 ? Math.round(((cart.subtotal * o.discount) / o.subtotal) * 100) / 100 : 0;
    const adj = Number(adjustment) || 0;
    return { subtotal: cart.subtotal, discount, shipping: cart.shipping, total: Math.max(0, Math.round((cart.subtotal - discount + cart.shipping + adj) * 100) / 100) };
  }, [items, ship, adjustment, rules, basePrices, o]);

  const editDesign = (index: number) => {
    const it = o.items[index];
    if (!it.productSlug) return;
    const id = `ord-${o.id}-${index}`;
    saveDesign({ id, name: `${o.id} · ${it.productName}`, productSlug: it.productSlug, productName: it.productName, size: it.size, design: it.design, previewSvg: '' }, false);
    window.location.href = `/designer/${encodeURIComponent(it.productSlug)}/?design=${encodeURIComponent(id)}&orderEdit=${encodeURIComponent(o.id)}&item=${index}`;
  };

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await updateOrder(o.id, {
        customer,
        shipping: { method, address: need === 'none' ? undefined : address },
        items: items.filter((d) => !d.removed).map((d) => ({ id: d.id, quantity: d.quantity, ink: d.ink, addons: d.addons })),
        notes,
        adjustment: Number(adjustment) || undefined,
      });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: r.changes.length ? `נשמר: ${r.changes.join(' · ')}` : 'אין שינויים' });
      router.push(`/admin/orders/${o.id}/`);
      router.refresh();
    });

  const c = (k: keyof typeof customer) => ({ value: customer[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCustomer((x) => ({ ...x, [k]: e.target.value })) });
  const a = (k: keyof typeof address) => ({ value: address[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAddress((x) => ({ ...x, [k]: e.target.value })) });
  const liveCount = items.filter((d) => !d.removed).length;

  return (
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 sm:space-y-5">
        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">פריטים</h2>
          <ul className="mt-3 space-y-3">
            {o.items.map((it, i) => {
              const d = items.find((x) => x.id === it.id)!;
              return (
                <li key={it.id} className={`rounded-2xl border border-line p-3 ${d.removed ? 'opacity-50' : ''}`}>
                  <div className="flex gap-3">
                    <Preview order={o} index={i} className="h-16 w-20 sm:h-20 sm:w-28" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{it.productName}</p>
                      <p className="text-xs text-muted">{it.size}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" onClick={() => editDesign(i)} disabled={!it.productSlug || d.removed} className="btn-outline btn-sm">
                          <Icon name="edit" size={15} /> עריכת העיצוב
                        </button>
                        {(liveCount > 1 || d.removed) && (
                          <button type="button" onClick={() => setItem(it.id, { removed: !d.removed })} className="btn-ghost btn-sm text-bad">
                            {d.removed ? 'ביטול הסרה' : 'הסרת פריט'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {!d.removed && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="כמות">
                        <input type="number" inputMode="numeric" min={1} max={999} value={d.quantity} onChange={(e) => setItem(it.id, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="input" dir="ltr" />
                      </Field>
                      <Field label="צבע דיו">
                        <select value={d.ink} onChange={(e) => setItem(it.id, { ink: e.target.value as InkColor })} className="input">
                          {Object.entries(INK_COLORS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {ADDONS.map((ad) => (
                        <Field key={ad.id} label={ad.label}>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={99}
                            value={d.addons[ad.id] ?? 0}
                            onChange={(e) => setItem(it.id, { addons: { ...d.addons, [ad.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })}
                            className="input"
                            dir="ltr"
                          />
                        </Field>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">לקוח</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="שם מלא">
              <input {...c('name')} className="input" autoComplete="off" />
            </Field>
            <Field label="טלפון">
              <input {...c('phone')} className="input" dir="ltr" inputMode="tel" />
            </Field>
            <Field label="אימייל">
              <input {...c('email')} className="input" dir="ltr" inputMode="email" />
            </Field>
            <Field label="חברה">
              <input {...c('company')} className="input" />
            </Field>
            <Field label="ח.פ. / ע.מ.">
              <input {...c('companyId')} className="input" dir="ltr" />
            </Field>
            <Field label="מספר הזמנת רכש (PO)">
              <input {...c('poNumber')} className="input" dir="ltr" />
            </Field>
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">משלוח</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="שיטת משלוח" wide>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
                {rules.shipping.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} · ₪{s.price}
                  </option>
                ))}
              </select>
            </Field>
            {need === 'full' && (
              <Field label="רחוב ומספר">
                <input {...a('street')} className="input" />
              </Field>
            )}
            {need !== 'none' && (
              <Field label="עיר">
                <input {...a('city')} className="input" />
              </Field>
            )}
            {need === 'full' && (
              <>
                <Field label="מיקוד">
                  <input {...a('zip')} className="input" dir="ltr" inputMode="numeric" />
                </Field>
                <Field label="הערות לשליח">
                  <input {...a('notes')} className="input" />
                </Field>
              </>
            )}
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">הערת לקוח</h2>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input mt-3" placeholder="מוצג גם ללקוח במייל ובמעקב" />
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">סיכום מחיר</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">מוצרים</dt>
              <dd className="tabular-nums">₪{quote.subtotal}</dd>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-ok">
                <dt>הנחה{o.couponCode ? ` (${o.couponCode})` : ''}</dt>
                <dd className="tabular-nums">−₪{quote.discount}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">משלוח</dt>
              <dd className="tabular-nums">{quote.shipping ? `₪${quote.shipping}` : 'חינם'}</dd>
            </div>
          </dl>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-medium">התאמת מחיר ידנית (₪, אפשר מינוס)</span>
            <input type="number" inputMode="decimal" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="0" className="input" dir="ltr" />
          </label>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-bold">סה״כ</span>
            <span className="text-2xl font-extrabold tabular-nums">₪{quote.total}</span>
          </div>
          {quote.total !== o.total && (
            <p className="mt-1 text-xs text-muted">
              לפני העריכה: ₪{o.total} ({quote.total > o.total ? '+' : '−'}₪{Math.abs(Math.round((quote.total - o.total) * 100) / 100)})
            </p>
          )}
        </section>
        {msg && <p className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>{msg.text}</p>}
        <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 px-3 py-2 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push(`/admin/orders/${o.id}/`)} className="btn-outline !h-11 shrink-0">
              ביטול
            </button>
            <button type="button" onClick={save} disabled={pending} className="btn-primary !h-11 flex-1">
              {pending ? 'שומר…' : `שמירת שינויים · ₪${quote.total}`}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
