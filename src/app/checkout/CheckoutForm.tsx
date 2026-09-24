'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StampThumb } from '@/components/StampThumb';
import { Icon } from '@/components/ui/Icon';
import { clearCart, useCart } from '@/lib/cart-store';
import { ordersStore } from '@/lib/designs-store';
import { formatPrice } from '@/lib/format';
import { quoteCart, quoteLine, type CartQuote, type ShippingMethod } from '@/lib/pricing';

const DRAFT_KEY = 's2g-checkout';

export function CheckoutForm({ shipping, paymentLabel, manual }: { shipping: ShippingMethod[]; paymentLabel: string; manual: boolean }) {
  const items = useCart();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', companyId: '', poNumber: '', street: '', city: '', zip: '', notes: '' });
  const [method, setMethod] = useState(shipping[0].id);
  const [b2b, setB2b] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string | undefined>();
  const [serverQuote, setServerQuote] = useState<CartQuote | null>(null);
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [error, setError] = useState('');
  const idem = useRef<string>('');

  useEffect(() => {
    idem.current = `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d) setForm((f) => ({ ...f, ...d }));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      const { name, phone, email, company, companyId, street, city, zip } = form;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, phone, email, company, companyId, street, city, zip }));
    } catch {
      /* ignore */
    }
  }, [form]);

  const lineTotals = useMemo(() => items.map((i) => (i.unitPrice == null ? 0 : quoteLine({ basePrice: i.unitPrice, quantity: i.quantity }).total)), [items]);
  const localQuote = quoteCart(lineTotals, { shippingId: method });
  const q = serverQuote ?? localQuote;

  useEffect(() => {
    let alive = true;
    fetch('/api/quote/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineTotals, shippingId: method, couponCode: applied }) })
      .then((r) => r.json())
      .then((d) => alive && setServerQuote(d))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [lineTotals, method, applied]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const needsAddress = method !== 'pickup';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError('');
    const res = await fetch('/api/orders/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: idem.current,
        customer: { name: form.name, phone: form.phone, email: form.email, company: form.company || undefined, companyId: form.companyId || undefined, poNumber: form.poNumber || undefined },
        shipping: { method, address: needsAddress ? { street: form.street, city: form.city, zip: form.zip } : undefined },
        couponCode: applied,
        notes: form.notes || undefined,
        items: items.map((i) => ({ productSlug: i.productSlug, design: i.design, ink: i.ink, bodyColor: i.bodyColor, quantity: i.quantity })),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      setError(data?.error || 'לא הצלחנו לשלוח את ההזמנה. בדקו את החיבור ונסו שוב.');
      setState('error');
      return;
    }
    ordersStore.set((l) => [
      { id: data.id, token: data.token, createdAt: new Date().toISOString(), total: data.total, items: items.map((i) => ({ name: i.productName, size: i.size, quantity: i.quantity, previewSvg: i.previewSvg })) },
      ...l,
    ]);
    clearCart();
    router.push(`/order/${data.id}/?t=${data.token}&new=1`);
  }

  if (!items.length && state !== 'sending') {
    return (
      <div className="container-x pt-28 pb-20 text-center">
        <h1 className="text-2xl font-bold">הסל ריק</h1>
        <Link href="/designer/" className="btn-primary mt-6">
          עיצוב חותמת
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="container-x grid gap-8 pt-24 pb-20 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold">קופה</h1>
        <section className="card p-6">
          <h2 className="font-bold">פרטים</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label">שם מלא *</span>
              <input className="input" required value={form.name} onChange={set('name')} autoComplete="name" />
            </label>
            <label>
              <span className="label">טלפון *</span>
              <input className="input text-right" required type="tel" dir="ltr" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </label>
            <label className="sm:col-span-2">
              <span className="label">אימייל (לאישור ומעקב)</span>
              <input className="input text-right" type="email" dir="ltr" value={form.email} onChange={set('email')} autoComplete="email" />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-blue" checked={b2b} onChange={(e) => setB2b(e.target.checked)} />
            הזמנה לחברה / עסק
          </label>
          {b2b && (
            <div className="mt-4 grid animate-fade-up gap-4 sm:grid-cols-3">
              <label>
                <span className="label">שם החברה</span>
                <input className="input" value={form.company} onChange={set('company')} autoComplete="organization" />
              </label>
              <label>
                <span className="label">ח.פ. / ע.מ.</span>
                <input className="input" inputMode="numeric" value={form.companyId} onChange={set('companyId')} />
              </label>
              <label>
                <span className="label">מספר הזמנת רכש (PO)</span>
                <input className="input" value={form.poNumber} onChange={set('poNumber')} />
              </label>
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-bold">קבלת ההזמנה</h2>
          <div className="mt-4 grid gap-3">
            {shipping.map((s) => (
              <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${method === s.id ? 'border-blue bg-blue-50' : 'border-line hover:border-ink/30'}`}>
                <input type="radio" name="shipping" className="h-4 w-4 accent-blue" checked={method === s.id} onChange={() => setMethod(s.id)} />
                <span className="flex-1">
                  <span className="block font-medium">{s.label}</span>
                  <span className="text-sm text-muted">{s.eta}{s.freeFrom ? ` · חינם מעל ₪${s.freeFrom}` : ''}</span>
                </span>
                <span className="font-semibold">{s.price ? formatPrice(s.price) : 'חינם'}</span>
              </label>
            ))}
          </div>
          {needsAddress && (
            <div className="mt-4 grid animate-fade-up gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              <label>
                <span className="label">רחוב ומספר *</span>
                <input className="input" required value={form.street} onChange={set('street')} autoComplete="street-address" />
              </label>
              <label>
                <span className="label">עיר *</span>
                <input className="input" required value={form.city} onChange={set('city')} autoComplete="address-level2" />
              </label>
              <label>
                <span className="label">מיקוד</span>
                <input className="input" inputMode="numeric" value={form.zip} onChange={set('zip')} autoComplete="postal-code" />
              </label>
            </div>
          )}
          <label className="mt-4 block">
            <span className="label">הערות להזמנה</span>
            <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} />
          </label>
        </section>

        <section className="card p-6">
          <h2 className="font-bold">תשלום</h2>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface p-4 text-sm">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-blue" />
            <span>
              <strong className="block">{paymentLabel}</strong>
              {manual && 'ההזמנה נכנסת לייצור מיד. נציג יחזור אליכם לתשלום מאובטח בטלפון, או שתשלמו באיסוף.'}
            </span>
          </p>
        </section>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">ההזמנה שלך</h2>
        <ul className="mt-4 space-y-3">
          {items.map((i, n) => (
            <li key={i.id} className="flex items-center gap-3">
              <div className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-[#fdfcf8] p-1.5">
                <StampThumb svg={i.previewSvg} ink={i.ink} className="max-h-full max-w-full" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{i.productName}</p>
                <p className="text-muted">
                  {i.size} · ×{i.quantity}
                </p>
              </div>
              <span className="text-sm font-semibold">{formatPrice(lineTotals[n])}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <input className="input !py-2 text-sm" placeholder="קוד קופון" value={coupon} onChange={(e) => setCoupon(e.target.value)} aria-label="קוד קופון" />
          <button type="button" className="btn-outline btn-sm" onClick={() => setApplied(coupon.trim() || undefined)}>
            החל
          </button>
        </div>
        {applied && q.couponError && <p className="mt-1 text-xs text-bad">{q.couponError}</p>}
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">מוצרים</dt>
            <dd>{formatPrice(q.subtotal)}</dd>
          </div>
          {q.discount > 0 && (
            <div className="flex justify-between text-ok">
              <dt>הנחה ({q.coupon?.code})</dt>
              <dd>−{formatPrice(q.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">משלוח</dt>
            <dd>{q.shipping ? formatPrice(q.shipping) : 'חינם'}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="font-semibold">לתשלום</span>
          <span className="text-2xl font-extrabold">{formatPrice(q.total)}</span>
        </div>
        <p className="text-xs text-muted">כולל מע״מ ({formatPrice(q.vatIncluded)})</p>
        <label className="mt-5 flex items-start gap-2 text-xs leading-5">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue" required checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          אני מאשר/ת שבדקתי את הטקסט והעיצוב, ושהחותמת תיוצר בדיוק כפי שמוצג.
        </label>
        <button className="btn-primary btn-lg mt-5 w-full" disabled={state === 'sending' || !agree}>
          {state === 'sending' ? 'שולח…' : 'אישור הזמנה'}
        </button>
        {state === 'error' && (
          <p role="alert" className="mt-3 text-sm text-bad">
            {error}
          </p>
        )}
      </aside>
    </form>
  );
}
