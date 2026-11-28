'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PaymentFrame } from '@/components/PaymentFrame';
import { StampProof } from '@/components/StampProof';
import { Icon } from '@/components/ui/Icon';
import { clearCart, useCart } from '@/lib/cart-store';
import { CHECKOUT_FIELDS, checkoutFieldErrors, type CheckoutField, type CheckoutFieldErrors } from '@/lib/checkout-rules';
import { ordersStore } from '@/lib/designs-store';
import { formatPrice } from '@/lib/format';
import { addressNeed, lineInputFor, quoteCart, quoteLine, type CartQuote, type ShippingMethod } from '@/lib/pricing';

const DRAFT_KEY = 's2g-checkout';
const LEAD_KEY = 's2g-cart-lead';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Delivery options are shown in three groups, decided by the method id (an id the admin added goes under "courier").
const PICKUP_IDS = ['pickup', 'locker'];
const FAST_IDS = ['express', 'gushdan', 'rush'];
const SHIPPING_GROUPS = [
  { title: 'איסוף', ids: PICKUP_IDS },
  { title: 'שליח', ids: null },
  { title: 'משלוח מהיר', ids: FAST_IDS },
] as const;
function shippingGroups(shipping: ShippingMethod[]) {
  return SHIPPING_GROUPS.map((g) => ({
    title: g.title,
    methods: g.ids
      ? shipping.filter((s) => g.ids.includes(s.id)).sort((a, b) => g.ids.indexOf(a.id) - g.ids.indexOf(b.id))
      : shipping.filter((s) => !PICKUP_IDS.includes(s.id) && !FAST_IDS.includes(s.id)),
  })).filter((g) => g.methods.length);
}

type FormKey = Exclude<CheckoutField, 'coupon'>;
const LINK_BTN = 'text-sm text-blue underline underline-offset-4 hover:text-blue-600 disabled:opacity-50';

export function CheckoutForm({ shipping, paymentLabel, manual }: { shipping: ShippingMethod[]; paymentLabel: string; manual: boolean }) {
  const items = useCart();
  const router = useRouter();
  const [form, setForm] = useState<Record<FormKey, string>>({ name: '', phone: '', email: '', company: '', companyId: '', poNumber: '', street: '', city: '', zip: '', notes: '' });
  const [method, setMethod] = useState(shipping[0].id);
  const [b2b, setB2b] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<string | undefined>();
  const [couponOpen, setCouponOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [serverQuote, setServerQuote] = useState<CartQuote | null>(null);
  const [agree, setAgree] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [tried, setTried] = useState(false);
  const [focusReq, setFocusReq] = useState(0);
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');
  const [pay, setPay] = useState<{ url: string; id: string; token: string; total: number } | null>(null);
  const idem = useRef<string>('');
  const formRef = useRef<HTMLFormElement>(null);
  const lock = state === 'sending';

  useEffect(() => {
    idem.current = `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d) setForm((f) => ({ ...f, ...d }));
      if (d?.notes) setNotesOpen(true);
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

  const lineTotals = useMemo(() => items.map((i) => (i.unitPrice == null ? 0 : quoteLine(lineInputFor({ basePrice: i.unitPrice, quantity: i.quantity, design: i.design, ink: i.ink, body: i.bodyColor, addons: i.addons })).total)), [items]);
  const localQuote = quoteCart(lineTotals, { shippingId: method });
  const q = serverQuote ?? localQuote;
  // The amount on the button is the server's quote only; none yet -> no amount.
  const quoted = typeof serverQuote?.total === 'number' ? serverQuote.total : null;

  // Abandoned-checkout reminder: once a valid e-mail is typed, save this cart (debounced).
  useEffect(() => {
    if (!items.length || !EMAIL_RE.test(form.email.trim())) return;
    const t = window.setTimeout(() => {
      let id = '';
      try {
        id = localStorage.getItem(LEAD_KEY) || '';
        if (!id) {
          id = `cl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`;
          localStorage.setItem(LEAD_KEY, id);
        }
      } catch {
        return;
      }
      fetch('/api/cart-lead/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          id,
          email: form.email.trim(),
          name: form.name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          total: q.total || undefined,
          items: items.map((i) => ({ productSlug: i.productSlug, productName: i.productName, modelId: i.modelId, size: i.size, design: i.design, ink: i.ink, bodyColor: i.bodyColor, quantity: i.quantity, unitPrice: i.unitPrice, addons: i.addons, previewSvg: !i.design.bot && i.previewSvg?.length < 80000 ? i.previewSvg : undefined })), // a bot drawing alone exceeds the 64 KiB keepalive cap
        }),
      }).catch(() => undefined);
    }, 1800);
    return () => window.clearTimeout(t);
  }, [items, form.email, form.name, form.phone, q.total]);


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

  // A slow send (production files for a bot stamp) says why it is still waiting.
  useEffect(() => {
    if (state !== 'sending') return;
    const t = window.setTimeout(() => setSlow(true), 8000);
    return () => {
      window.clearTimeout(t);
      setSlow(false);
    };
  }, [state]);

  // After a refused submit: focus the first marked field (or the confirmation checkbox) and bring it into view.
  useEffect(() => {
    if (!focusReq) return;
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }, [focusReq]);

  const need = addressNeed(shipping.find((s) => s.id === method));
  const needsAddress = need !== 'none';

  // The values exactly as submit sends them, for the shared checkout rules.
  const valuesOf = (f: Record<FormKey, string>, m: string, c: string | undefined) => ({
    name: f.name,
    phone: f.phone,
    email: f.email,
    company: f.company || undefined,
    companyId: f.companyId || undefined,
    poNumber: f.poNumber || undefined,
    street: f.street,
    city: f.city,
    zip: f.zip,
    notes: f.notes || undefined,
    coupon: c,
    shipping: shipping.find((s) => s.id === m),
  });

  /** Re-checks the marked fields only: a mark updates its message, and goes away once the field is valid. */
  function recheck(v: ReturnType<typeof valuesOf>) {
    setErrors((prev) => {
      const keys = Object.keys(prev) as CheckoutField[];
      if (!keys.length) return prev;
      const all = checkoutFieldErrors(v);
      const next: CheckoutFieldErrors = {};
      for (const k of keys) if (all[k]) next[k] = all[k];
      return next;
    });
  }

  /** On leaving a field: mark it when it fails, clear it when it passes. */
  const check = (k: CheckoutField) => () => {
    const msg = checkoutFieldErrors(valuesOf(form, method, applied))[k];
    setErrors((prev) => {
      if (prev[k] === msg) return prev;
      const next = { ...prev };
      if (msg) next[k] = msg;
      else delete next[k];
      return next;
    });
  };

  const set = (k: FormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    recheck(valuesOf(next, method, applied));
  };

  const pickMethod = (id: string) => {
    setMethod(id);
    recheck(valuesOf(form, id, applied));
  };

  const applyCoupon = (code: string | undefined) => {
    setApplied(code);
    recheck(valuesOf(form, method, code));
  };

  /** Opens hidden parts of the form that hold a marked field, then asks for focus on the first one. */
  function markAll(fields: CheckoutFieldErrors) {
    setErrors(fields);
    setTried(true);
    if (fields.company || fields.companyId || fields.poNumber) setB2b(true);
    if (fields.notes) setNotesOpen(true);
    if (fields.coupon) setCouponOpen(true);
    setFocusReq((n) => n + 1);
  }

  const fid = (k: CheckoutField) => `chk-${k}`;
  const msgId = (k: CheckoutField) => `chk-${k}-msg`;
  /** Props shared by every text field: value, checks, aria and the lock while sending. */
  const field = (k: FormKey, opts: { required?: boolean; describedBy?: string } = {}) => ({
    id: fid(k),
    value: form[k],
    onChange: set(k),
    onBlur: check(k),
    disabled: lock,
    'aria-required': opts.required || undefined,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': (errors[k] ? msgId(k) : opts.describedBy) || undefined,
  });
  const cls = (k: CheckoutField, base = 'input') => (errors[k] ? `${base} border-bad!` : base);
  const msg = (k: CheckoutField) =>
    errors[k] ? (
      <span id={msgId(k)} className="mt-1 block text-xs text-bad">
        {errors[k]}
      </span>
    ) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setError('');
    const all = checkoutFieldErrors(valuesOf(form, method, applied));
    const failing = Object.keys(all).length > 0;
    setAgreeError(!agree);
    if (failing || !agree) {
      setState('idle');
      markAll(all);
      return;
    }
    setErrors({});
    setState('sending');
    const res = await fetch('/api/orders/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: idem.current,
        customer: { name: form.name, phone: form.phone, email: form.email, company: form.company || undefined, companyId: form.companyId || undefined, poNumber: form.poNumber || undefined },
        shipping: { method, address: needsAddress ? { street: form.street, city: form.city, zip: need === 'full' ? form.zip : undefined } : undefined },
        couponCode: applied,
        notes: form.notes || undefined,
        items: items.map((i) => ({ productSlug: i.productSlug, design: i.design, ink: i.ink, bodyColor: i.bodyColor, quantity: i.quantity, addons: i.addons })),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.id) {
      // Field problems go next to their fields; anything else stays one line under the button.
      const fields: CheckoutFieldErrors = {};
      if (data?.fields && typeof data.fields === 'object') {
        for (const k of CHECKOUT_FIELDS) if (typeof data.fields[k] === 'string') fields[k] = data.fields[k];
      }
      if (Object.keys(fields).length) {
        setState('idle');
        markAll(fields);
        return;
      }
      setError(data?.error || 'לא הצלחנו לשלוח את ההזמנה. בדקו את החיבור ונסו שוב.');
      setState('error');
      return;
    }
    ordersStore.set((l) => [
      { id: data.id, token: data.token, createdAt: new Date().toISOString(), total: data.total, items: items.map((i) => ({ name: i.productName, size: i.size, quantity: i.quantity, previewSvg: i.previewSvg })) },
      ...l,
    ]);
    clearCart();
    try {
      localStorage.removeItem(LEAD_KEY);
    } catch {
      /* ignore */
    }
    if (data.paymentUrl) {
      // Card payment inside the checkout.
      setPay({ url: data.paymentUrl, id: data.id, token: data.token, total: data.total });
      setState('idle');
      window.scrollTo({ top: 0 });
      return;
    }
    router.push(`/order/${data.id}/?t=${data.token}&new=1`);
  }

  if (pay) {
    return (
      <div className="container-x grid gap-8 pt-24 pb-20 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="text-sm font-medium text-ok">✓ ההזמנה נשמרה · שלב אחרון</p>
          <h1 className="mt-1 text-3xl font-extrabold">תשלום</h1>
          <PaymentFrame url={pay.url} className="mt-5" />
        </div>
        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <p className="text-sm text-muted">מספר הזמנה</p>
          <p className="text-xl font-extrabold tracking-wide" dir="ltr">
            {pay.id}
          </p>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">לתשלום</span>
            <span className="text-2xl font-extrabold">{formatPrice(pay.total)}</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">
            ההזמנה והעיצוב שמורים. אפשר להשלים את התשלום גם מאוחר יותר מ
            <Link href={`/order/${pay.id}/?t=${pay.token}`} className="text-blue underline">
              דף ההזמנה
            </Link>
            .
          </p>
        </aside>
      </div>
    );
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

  const fieldCount = Object.keys(errors).length;
  const couponOk = !!applied && !!q.coupon && !q.couponError;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="container-x grid gap-8 pt-24 pb-20 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold">קופה</h1>
        <section className="card p-6">
          <h2 className="font-bold">פרטים</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={fid('name')} className="label">
                שם מלא *
              </label>
              <input className={cls('name')} {...field('name', { required: true })} autoComplete="name" />
              {msg('name')}
            </div>
            <div>
              <label htmlFor={fid('phone')} className="label">
                טלפון *
              </label>
              <input className={cls('phone', 'input text-right')} {...field('phone', { required: true, describedBy: 'chk-phone-help' })} type="tel" inputMode="tel" dir="ltr" autoComplete="tel" />
              {msg('phone') ?? (
                <span id="chk-phone-help" className="mt-1 block text-xs text-muted">
                  לשליח, ולעדכון כשהחותמת מוכנה.
                </span>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={fid('email')} className="label">
                אימייל (לאישור ומעקב)
              </label>
              <input className={cls('email', 'input text-right')} {...field('email')} aria-describedby={[errors.email ? msgId('email') : '', 'chk-email-help'].filter(Boolean).join(' ')} type="email" dir="ltr" autoComplete="email" />
              {msg('email')}
              <span id="chk-email-help" className="mt-1 block text-xs text-muted">
                אם ההזמנה לא תושלם, נשלח תזכורת אחת עם קישור להמשך.
              </span>
            </div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-blue" checked={b2b} disabled={lock} onChange={(e) => setB2b(e.target.checked)} />
            הזמנה לחברה / עסק
          </label>
          {b2b && (
            <div className="mt-4 grid animate-fade-up gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor={fid('company')} className="label">
                  שם החברה
                </label>
                <input className={cls('company')} {...field('company')} autoComplete="organization" />
                {msg('company')}
              </div>
              <div>
                <label htmlFor={fid('companyId')} className="label">
                  ח.פ. / ע.מ.
                </label>
                <input className={cls('companyId')} {...field('companyId')} inputMode="numeric" />
                {msg('companyId')}
              </div>
              <div>
                <label htmlFor={fid('poNumber')} className="label">
                  מספר הזמנת רכש (PO)
                </label>
                <input className={cls('poNumber')} {...field('poNumber')} />
                {msg('poNumber')}
              </div>
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 id="chk-shipping-title" className="font-bold">
            קבלת ההזמנה
          </h2>
          <div role="radiogroup" aria-labelledby="chk-shipping-title" className="mt-4 grid gap-5">
            {shippingGroups(shipping).map((g) => (
              <div key={g.title}>
                <h3 className="mb-2 text-xs font-semibold text-muted">{g.title}</h3>
                <div className="grid gap-3">
                  {g.methods.map((s) => (
                    <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${method === s.id ? 'border-blue bg-blue-50' : 'border-line hover:border-ink/30'}`}>
                      <input type="radio" name="shipping" className="h-4 w-4 accent-blue" checked={method === s.id} disabled={lock} onChange={() => pickMethod(s.id)} />
                      <span className="flex-1">
                        <span className="block font-medium">{s.label}</span>
                        <span className="text-sm text-muted">{s.eta}{s.freeFrom ? ` · חינם מעל ₪${s.freeFrom}` : ''}</span>
                      </span>
                      <span className="font-semibold">{s.price ? formatPrice(s.price) : 'חינם'}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {need === 'city' && (
            <div className="mt-4 grid animate-fade-up gap-4 sm:grid-cols-[1fr_2fr]">
              <div>
                <label htmlFor={fid('city')} className="label">
                  עיר *
                </label>
                <input className={cls('city')} {...field('city', { required: true })} autoComplete="address-level2" />
                {msg('city')}
              </div>
              <div>
                <label htmlFor={fid('street')} className="label">
                  נקודת מסירה / לוקר מועדפים (לא חובה)
                </label>
                <input className={cls('street')} {...field('street')} placeholder="למשל: לוקר בסופר ברחוב הרצל" />
                {msg('street')}
              </div>
              <p className="text-xs text-muted sm:col-span-2">נשלח את החבילה לנקודת המסירה הקרובה, ותקבלו הודעה כשהיא מחכה לאיסוף.</p>
            </div>
          )}
          {need === 'full' && (
            <div className="mt-4 grid animate-fade-up gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              <div>
                <label htmlFor={fid('street')} className="label">
                  רחוב ומספר *
                </label>
                <input className={cls('street')} {...field('street', { required: true })} autoComplete="street-address" />
                {msg('street')}
              </div>
              <div>
                <label htmlFor={fid('city')} className="label">
                  עיר *
                </label>
                <input className={cls('city')} {...field('city', { required: true })} autoComplete="address-level2" />
                {msg('city')}
              </div>
              <div>
                <label htmlFor={fid('zip')} className="label">
                  מיקוד
                </label>
                <input className={cls('zip')} {...field('zip')} inputMode="numeric" autoComplete="postal-code" />
                {msg('zip')}
              </div>
            </div>
          )}
          {notesOpen ? (
            <div className="mt-4">
              <label htmlFor={fid('notes')} className="label">
                הערות להזמנה
              </label>
              <textarea className={cls('notes')} rows={2} {...field('notes')} />
              {msg('notes')}
            </div>
          ) : (
            <button
              type="button"
              className={`mt-4 ${LINK_BTN}`}
              disabled={lock}
              onClick={() => {
                setNotesOpen(true);
                requestAnimationFrame(() => document.getElementById(fid('notes'))?.focus());
              }}
            >
              הוספת הערה להזמנה
            </button>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-bold">תשלום</h2>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface p-4 text-sm">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-blue" />
            <span>
              <strong className="block">{paymentLabel}</strong>
              {manual
                ? 'ההזמנה נכנסת לייצור מיד. נציג יחזור אליכם לתשלום מאובטח בטלפון, או שתשלמו באיסוף.'
                : 'בשלב הבא ממלאים את פרטי הכרטיס כאן בעמוד, בטופס המאובטח של טרנזילה. פרטי הכרטיס לא נשמרים באתר.'}
            </span>
          </p>
        </section>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">ההזמנה שלך</h2>
        <ul className="mt-4 space-y-3">
          {items.map((i, n) => (
            <li key={i.id} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{i.productName}</p>
                  <p className="text-muted">
                    {i.size} · ×{i.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatPrice(lineTotals[n])}</span>
              </div>
              <div className="mt-2">
                <StampProof svg={i.previewSvg} ink={i.ink} design={i.design} name={i.productName} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          {couponOk ? (
            <div className="flex items-center gap-2">
              <span className="chip text-ok">
                <span dir="ltr">{q.coupon?.code}</span> · −{formatPrice(q.discount)}
              </span>
              <button
                type="button"
                className="text-sm text-muted underline underline-offset-4 hover:text-ink disabled:opacity-50"
                disabled={lock}
                onClick={() => {
                  setCoupon('');
                  setCouponOpen(false);
                  applyCoupon(undefined);
                }}
              >
                הסרה
              </button>
            </div>
          ) : couponOpen || applied || errors.coupon ? (
            <>
              <div className="flex gap-2">
                <input
                  id={fid('coupon')}
                  className={cls('coupon', 'input !py-2 text-sm')}
                  placeholder="קוד קופון"
                  value={coupon}
                  disabled={lock}
                  onChange={(e) => setCoupon(e.target.value)}
                  aria-label="קוד קופון"
                  aria-invalid={errors.coupon ? true : undefined}
                  aria-describedby={errors.coupon ? msgId('coupon') : undefined}
                />
                <button type="button" className="btn-outline btn-sm" disabled={lock} onClick={() => applyCoupon(coupon.trim() || undefined)}>
                  החל
                </button>
              </div>
              {msg('coupon')}
              {applied && q.couponError && <p className="mt-1 text-xs text-bad">{q.couponError}</p>}
            </>
          ) : (
            <button
              type="button"
              className={LINK_BTN}
              disabled={lock}
              onClick={() => {
                setCouponOpen(true);
                requestAnimationFrame(() => document.getElementById(fid('coupon'))?.focus());
              }}
            >
              יש לכם קוד קופון?
            </button>
          )}
        </div>
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
        {tried && fieldCount > 0 && (
          <p aria-live="polite" className="mt-4 text-sm font-medium text-bad">
            {fieldCount === 1 ? 'יש שדה אחד לתיקון' : `יש ${fieldCount} שדות לתיקון`}
          </p>
        )}
        <label className="mt-5 flex items-start gap-2 text-xs leading-5">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-blue"
            checked={agree}
            disabled={lock}
            aria-required
            aria-invalid={agreeError && !agree ? true : undefined}
            aria-describedby={agreeError && !agree ? 'chk-agree-msg' : undefined}
            onChange={(e) => {
              setAgree(e.target.checked);
              if (e.target.checked) setAgreeError(false);
            }}
          />
          אני מאשר/ת שבדקתי את הטקסט והעיצוב, ושהחותמת תיוצר בדיוק כפי שמוצג.
        </label>
        {agreeError && !agree && (
          <p id="chk-agree-msg" className="mt-1 text-xs text-bad">
            סמנו שבדקתם את הטקסט כדי להמשיך
          </p>
        )}
        <button type="submit" className="btn-primary btn-lg mt-4 w-full" disabled={lock}>
          {lock ? (
            <>
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              בודקים את החותמות…
            </>
          ) : (
            `${manual ? 'אישור הזמנה' : 'המשך לתשלום'}${quoted != null ? ` · ${formatPrice(quoted)}` : ''}`
          )}
        </button>
        <p className="mt-2 text-center text-xs text-muted">{manual ? 'נציג יחזור אליכם לתשלום, או שתשלמו באיסוף.' : 'עדיין לא חויבתם. את פרטי הכרטיס ממלאים בשלב הבא.'}</p>
        {lock && slow && (
          <p aria-live="polite" className="mt-1 text-center text-xs text-muted">
            עוד רגע, מכינים את קבצי הייצור
          </p>
        )}
        <p className="mt-2 text-center text-xs text-muted">
          הפרטים משמשים לביצוע ההזמנה ולמשלוח, לפי{' '}
          <Link href="/privacy/" target="_blank" className="underline hover:text-ink">
            מדיניות הפרטיות
          </Link>
          .
        </p>
        {state === 'error' && (
          <p role="alert" className="mt-3 text-sm text-bad">
            {error}
          </p>
        )}
      </aside>
    </form>
  );
}
