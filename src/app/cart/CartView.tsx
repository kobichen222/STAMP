'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StampProof } from '@/components/StampProof';
import { Icon } from '@/components/ui/Icon';
import { QuantityStepper } from '@/components/catalog/ProductConfigurator';
import { INK_COLORS } from '@/designer/types';
import { cartStore, removeCartItem, updateCartItem, duplicateCartItem, useCart, type CartItem } from '@/lib/cart-store';
import { saveDesign } from '@/lib/designs-store';
import { formatPrice } from '@/lib/format';
import { ADDONS, lineInputFor, quoteCart, quoteLine } from '@/lib/pricing';
import { useUndo, type Removed } from '@/lib/use-undo';
import { cartStatusText, insertAt } from './cart-logic';

/** The home page opens the cart line stored under this key as a card to edit (see the stage 5 hand-off). */
const EDIT_LINE_KEY = 's2g-edit-line';

export function CartView() {
  const items = useCart();
  const router = useRouter();
  const params = useSearchParams();
  const status = cartStatusText(params.get('added'), params.get('updated'));
  const removed = useUndo<CartItem>();
  // unitPrice stored in the cart is the base unit price at design time; tiers apply on quantity.
  const totals = items.map((i) => (i.unitPrice == null ? 0 : quoteLine(lineInputFor({ basePrice: i.unitPrice, quantity: i.quantity, design: i.design, ink: i.ink, body: i.bodyColor, addons: i.addons })).total));
  const cart = quoteCart(totals);

  const edit = (i: CartItem) => {
    const id = i.designId ?? `d-${i.id}`;
    saveDesign({ id, name: i.productName, productSlug: i.productSlug, productName: i.productName, size: i.size, design: i.design, previewSvg: i.previewSvg }, false);
    removeCartItem(i.id);
    router.push(`/designer/${i.productSlug}/?design=${id}&qty=${i.quantity}`);
  };

  // a bot stamp is edited on the home page; the cart line stays as it is until the card there replaces it
  const editBot = (i: CartItem) => {
    try {
      window.sessionStorage.setItem(EDIT_LINE_KEY, i.id);
    } catch {
      /* blocked storage: the home page simply opens without the card */
    }
    router.push('/');
  };

  // removed at once, so it can never reach the checkout; "ביטול" puts it back where it was
  const remove = (i: CartItem, at: number) => {
    removeCartItem(i.id);
    removed.hold(i.id, i, at);
  };
  const undo = (key: string) => {
    const r = removed.take(key);
    if (r) cartStore.set((list) => insertAt(list, r.item, r.at));
  };

  const strip = (r: Removed<CartItem>) => (
    <li key={`removed-${r.key}`} className="flex animate-fade-up items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5 text-sm text-muted" role="status">
      <span>החותמת הוסרה מהסל</span>
      <button type="button" className="font-medium text-blue underline underline-offset-4 hover:text-blue-600" onClick={() => undo(r.key)}>
        ביטול
      </button>
    </li>
  );
  // the strips that stand before line n (a strip past the end of the list stands after the last line)
  const stripsAt = (n: number) => removed.waiting.filter((r) => Math.min(r.at, items.length) === n).map(strip);

  return (
    <div className="container-x pt-24 pb-20">
      <h1 className="text-3xl font-extrabold">סל הקניות</h1>
      {status && items.length > 0 && (
        <p className="mt-4 flex animate-pop items-center gap-2 rounded-xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok" role="status">
          <Icon name="check" size={18} /> {status}
        </p>
      )}
      {!items.length ? (
        <>
          {removed.waiting.length > 0 && <ul className="mt-8 space-y-2">{removed.waiting.map(strip)}</ul>}
          <div className={`card grid place-items-center p-14 text-center ${removed.waiting.length ? 'mt-4' : 'mt-8'}`}>
            <Icon name="cart" size={36} className="text-muted" />
            <p className="mt-3 text-lg font-semibold">הסל ריק</p>
            <p className="mt-1 text-muted">עצבו חותמת והיא תופיע כאן.</p>
            <Link href="/designer/" className="btn-primary mt-6">
              עיצוב חותמת
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4">
            {items.map((i, n) => (
              <Fragment key={i.id}>
                {stripsAt(n)}
                <li className="card flex animate-fade-up flex-col gap-4 p-4 sm:flex-row sm:items-start">
                  <div className="w-full shrink-0 sm:w-56">
                    <StampProof svg={i.previewSvg} ink={i.ink} design={i.design} name={i.productName} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{i.productName}</p>
                    <p className="mt-1 text-sm text-muted">
                      {i.size} · דיו {INK_COLORS[i.ink].label}
                      {i.bodyColor ? ` · גוף ${i.bodyColor}` : ''}
                    </p>
                    {i.addons && Object.values(i.addons).some(Boolean) && (
                      <p className="mt-1 text-sm text-blue">
                        + {ADDONS.filter((a) => i.addons?.[a.id]).map((a) => `${a.label}${(i.addons?.[a.id] ?? 0) > 1 ? ` × ${i.addons?.[a.id]}` : ''}`).join(' · ')}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => (i.design.bot ? editBot(i) : edit(i))}>
                        <Icon name="text" size={15} /> עריכה
                      </button>
                      <button type="button" className="btn-ghost btn-sm" onClick={() => duplicateCartItem(i.id)}>
                        <Icon name="copy" size={15} /> שכפול
                      </button>
                      <button type="button" className="btn-ghost btn-sm text-bad" onClick={() => remove(i, n)}>
                        <Icon name="trash" size={15} /> הסרה
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end">
                    <QuantityStepper value={i.quantity} onChange={(q) => updateCartItem(i.id, { quantity: q })} />
                    <p className="text-lg font-bold">{i.unitPrice == null ? 'לפי הצעה' : formatPrice(totals[n])}</p>
                  </div>
                </li>
              </Fragment>
            ))}
            {stripsAt(items.length)}
          </ul>
          <aside className="card h-fit p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-bold">סיכום</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">מוצרים ({items.reduce((s, i) => s + i.quantity, 0)})</dt>
                <dd>{formatPrice(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">משלוח</dt>
                <dd className="text-muted">יחושב בקופה</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-semibold">סה״כ</span>
              <span className="text-2xl font-extrabold">{formatPrice(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">כולל מע״מ</p>
            <Link href="/checkout/" className="btn-primary btn-lg mt-6 w-full">
              המשך לקופה
            </Link>
            <Link href="/designer/" className="btn-ghost mt-2 w-full">
              + הוספת חותמת נוספת
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
