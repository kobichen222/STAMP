'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { INK_COLORS, type InkColor } from '@/designer/types';

export interface LeadProduct {
  slug: string;
  title: string;
  size: string;
  price: number | null;
  image: string | null;
  popular?: boolean;
}
export interface LeadShipping {
  id: string;
  label: string;
  price: number;
  eta: string;
  address?: 'full' | 'city' | 'none';
}

/**
 * Quick order request – a button that opens a short order form: the stamp (model, text, ink,
 * quantity), how to get it, and who to call. A bottom sheet on phones, a centred card from
 * tablets up. It goes through /api/contact, so the studio gets it by e-mail and in admin → פניות;
 * the studio then opens the order and closes the payment with the customer.
 */
export function LeadButton({ className, children, source = 'popup', products, shipping }: { className?: string; children: ReactNode; source?: string; products: LeadProduct[]; shipping: LeadShipping[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {children}
      </button>
      {open && <LeadDialog source={source} products={products} shipping={shipping} onClose={() => setOpen(false)} />}
    </>
  );
}

const nis = (n: number) => `₪${Math.round(n * 100) / 100}`;

/** The stamp model: a dropdown with a photo, size and price for every model – the popular ones first. */
function ProductPicker({ products, value, onChange }: { products: LeadProduct[]; value: string; onChange: (slug: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = products.find((p) => p.slug === value);
  const list = q.trim() ? products.filter((p) => `${p.title} ${p.size}`.toLowerCase().includes(q.trim().toLowerCase())) : products;
  const Row = ({ p }: { p: LeadProduct }) => (
    <>
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
        {p.image ? <img src={encodeURI(p.image)} alt="" loading="lazy" className="h-full w-full object-contain mix-blend-multiply" /> : <Icon name="image" size={18} className="text-muted" />}
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold">{p.title}</span>
          {p.popular && <span className="shrink-0 rounded-full bg-blue px-1.5 py-0.5 text-[10px] font-bold text-white">פופולרי</span>}
        </span>
        <span className="block text-xs text-muted">{p.size}</span>
      </span>
      {p.price != null && <span className="shrink-0 text-sm font-bold tabular-nums">{nis(p.price)}</span>}
    </>
  );
  return (
    <div>
      <span className="label" id="lead-product">
        סוג החותמת *
      </span>
      <button
        type="button"
        data-first
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="lead-product"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 rounded-xl border bg-white p-2 pe-3 transition ${open ? 'border-blue ring-4 ring-blue/10' : 'border-line hover:border-ink/40'}`}
      >
        {current && <Row p={current} />}
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-line bg-white shadow-soft">
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="חיפוש דגם או מידה…" aria-label="חיפוש דגם" className="w-full border-b border-line px-3.5 py-2.5 text-sm outline-none" />
          <ul role="listbox" aria-labelledby="lead-product" className="max-h-64 overflow-y-auto overscroll-contain p-1">
            {list.map((p) => (
              <li key={p.slug} role="option" aria-selected={p.slug === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.slug);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg p-1.5 pe-2.5 transition ${p.slug === value ? 'bg-blue-50' : 'hover:bg-surface'}`}
                >
                  <Row p={p} />
                </button>
              </li>
            ))}
            {!list.length && <li className="p-4 text-center text-sm text-muted">לא נמצא דגם מתאים.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function Group({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <legend className="mb-1 flex items-center gap-2 text-[15px] font-extrabold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-blue text-xs font-bold text-white">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function LeadDialog({ onClose, source, products, shipping }: { onClose: () => void; source: string; products: LeadProduct[]; shipping: LeadShipping[] }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [shown, setShown] = useState(false);
  const [slug, setSlug] = useState(products[0]?.slug ?? '');
  const [ink, setInk] = useState<InkColor>('black');
  const [qty, setQty] = useState(1);
  const [ship, setShip] = useState(shipping[0]?.id ?? '');
  const product = products.find((p) => p.slug === slug);
  const method = shipping.find((m) => m.id === ship);
  const need = method?.address ?? 'none';
  const estimate = product?.price != null ? product.price * qty + (method?.price ?? 0) : null;
  const panel = useRef<HTMLDivElement>(null);
  const title = useId();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setShown(true));
    const focus = setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-first]')?.focus({ preventScroll: true }), 250);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      // Keep the focus inside the dialog.
      const items = [...panel.current.querySelectorAll<HTMLElement>('button, a[href], input:not(.hp), textarea, select')].filter((el) => !el.hasAttribute('disabled'));
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) (e.preventDefault(), z.focus());
      else if (!e.shiftKey && document.activeElement === z) (e.preventDefault(), a.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(focus);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const address = need === 'full' ? `${f.street}, ${f.city}` : need === 'city' ? f.city : '';
    const message = [
      'בקשת הזמנה מהאתר',
      `מוצר: ${product ? `${product.title} (${product.size})` : '—'}`,
      `צבע דיו: ${INK_COLORS[ink].label}`,
      `כמות: ${qty}`,
      'הטקסט לחותמת:',
      f.text.trim(),
      `קבלה: ${method?.label ?? '—'}${address ? ` – ${address}` : ''}`,
      estimate != null ? `הערכת מחיר שהוצגה ללקוח: ${nis(estimate)}` : '',
      f.notes?.trim() ? `דרישות מיוחדות: ${f.notes.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const res = await fetch('/api/contact/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.name, phone: f.phone, email: f.email, website: f.website, message, page: `${window.location.pathname} (${source})` }),
    }).catch(() => null);
    if (res?.ok) return setState('sent');
    setError((await res?.json().catch(() => null))?.error || 'השליחה נכשלה, נסו שוב');
    setState('error');
  }

  return createPortal(
    <div className="fixed inset-0 z-[2147483600] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={title}>
      <div className={`absolute inset-0 bg-ink/55 backdrop-blur-sm transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-lift transition duration-300 ease-out sm:max-w-[35rem] sm:rounded-[1.75rem] ${shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-0 sm:translate-y-4 sm:scale-95'}`}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-blue to-violet px-5 pb-4 pt-3 text-white sm:px-7 sm:pb-5 sm:pt-5">
          <span className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-white/40 sm:hidden" aria-hidden />
          <span className="pointer-events-none absolute -end-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <span className="pointer-events-none absolute -bottom-16 start-6 h-32 w-32 rounded-full bg-white/10" aria-hidden />
          <button type="button" onClick={onClose} aria-label="סגירה" className="absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 sm:end-4 sm:top-4">
            <Icon name="close" size={18} />
          </button>
          <p className="relative text-[13px] font-semibold text-white/80">הזמנה מהירה</p>
          <h2 id={title} className="relative mt-0.5 pe-12 text-xl font-extrabold leading-tight sm:text-2xl">
            ממלאים פרטים – ואנחנו מכינים
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {state === 'sent' ? (
            <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-center sm:px-7 sm:pb-7">
              <span className="mx-auto grid h-16 w-16 animate-pop place-items-center rounded-full bg-ok/10 text-ok">
                <Icon name="check" size={34} />
              </span>
              <p className="mt-4 text-xl font-extrabold">תודה, קיבלנו!</p>
              <p className="mt-1 text-[15px] text-muted">קיבלנו את בקשת ההזמנה. נחזור אליכם עם סקיצה לאישור ולסגירת התשלום – בדרך כלל תוך שעה בשעות הפעילות.</p>
              <button type="button" onClick={onClose} className="btn-primary mt-6 w-full justify-center">
                סגירה
              </button>
            </div>
          ) : (
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
              <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] content-start gap-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
              <Group n={1} title="החותמת">
                <ProductPicker products={products} value={slug} onChange={setSlug} />
                <label>
                  <span className="label">הטקסט לחותמת *</span>
                  <textarea name="text" rows={3} required placeholder={'שורה לכל שורה בחותמת, למשל:\nישראל ישראלי\nעו״ד · רישיון 12345'} className="input resize-none" />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <span className="label">צבע דיו</span>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="צבע דיו">
                      {(Object.entries(INK_COLORS) as [InkColor, { label: string; hex: string }][]).map(([k, c]) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={ink === k}
                          onClick={() => setInk(k)}
                          className={`flex items-center gap-1.5 rounded-full border py-1.5 pe-3 ps-1.5 text-sm transition ${ink === k ? 'border-blue bg-blue-50 font-semibold' : 'border-line bg-white hover:border-ink/40'}`}
                        >
                          <i className="h-5 w-5 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="label">כמות</span>
                    <div className="inline-flex items-center rounded-full border border-line bg-white">
                      <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="פחות">
                        <Icon name="minus" size={16} />
                      </button>
                      <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">
                        {qty}
                      </span>
                      <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="עוד">
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                <label>
                  <span className="label">
                    דרישות מיוחדות <span className="font-normal text-muted">(לא חובה)</span>
                  </span>
                  <textarea name="notes" rows={2} placeholder="לוגו, מסגרת, גופן מועדף, דחיפות, חשבונית על שם…" className="input resize-none" />
                </label>
              </Group>

              <Group n={2} title="איך מקבלים">
                <div className="grid gap-2" role="radiogroup" aria-label="משלוח או איסוף">
                  {shipping.map((m) => (
                    <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${ship === m.id ? 'border-blue bg-blue-50' : 'border-line bg-white hover:border-ink/40'}`}>
                      <input type="radio" name="ship" value={m.id} checked={ship === m.id} onChange={() => setShip(m.id)} className="h-4 w-4 shrink-0 accent-blue" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">{m.label}</span>
                        <span className="block text-xs text-muted">{m.eta}</span>
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums">{m.price ? nis(m.price) : 'חינם'}</span>
                    </label>
                  ))}
                </div>
                {need !== 'none' && (
                  <div className={`grid gap-3 ${need === 'full' ? 'sm:grid-cols-[1.6fr_1fr]' : ''}`}>
                    {need === 'full' && (
                      <label>
                        <span className="label">רחוב ומספר *</span>
                        <input name="street" required autoComplete="street-address" className="input" />
                      </label>
                    )}
                    <label>
                      <span className="label">עיר *</span>
                      <input name="city" required autoComplete="address-level2" className="input" />
                    </label>
                  </div>
                )}
              </Group>

              <Group n={3} title="הפרטים שלכם">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="label">שם *</span>
                    <input name="name" required placeholder="שם פרטי ומשפחה" autoComplete="name" className="input" />
                  </label>
                  <label>
                    <span className="label">טלפון *</span>
                    <input name="phone" type="tel" inputMode="tel" required pattern="[\d\s+()\-]{7,}" title="מספר טלפון תקין" placeholder="050-0000000" autoComplete="tel" dir="ltr" className="input text-right" />
                  </label>
                </div>
                <label>
                  <span className="label">
                    אימייל <span className="font-normal text-muted">(לקבלת הסקיצה)</span>
                  </span>
                  <input name="email" type="email" autoComplete="email" dir="ltr" className="input text-right" />
                </label>
              </Group>
              <input name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />

              </div>
              <div className="grid shrink-0 gap-2 border-t border-line bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-7 sm:pb-5">
                {estimate != null && (
                  <p className="flex items-baseline justify-between text-sm">
                    <span className="text-muted">הערכת מחיר, כולל {method?.price ? 'משלוח' : 'איסוף'}</span>
                    <b className="text-lg tabular-nums">{nis(estimate)}</b>
                  </p>
                )}
                <button className="btn-primary !h-13 w-full justify-center !text-base font-bold" disabled={state === 'sending'}>
                  {state === 'sending' ? 'שולח…' : 'שליחת בקשת ההזמנה'}
                </button>
                {state === 'error' && (
                  <p role="alert" className="text-center text-sm text-bad">
                    {error}
                  </p>
                )}
                <p className="text-center text-xs text-muted">בלי תשלום עכשיו – נחזור אליכם עם סקיצה לאישור ומחיר סופי.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
