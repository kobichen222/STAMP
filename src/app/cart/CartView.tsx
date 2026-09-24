'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { StampThumb } from '@/components/StampThumb';
import { Icon } from '@/components/ui/Icon';
import { QuantityStepper } from '@/components/catalog/ProductConfigurator';
import { INK_COLORS } from '@/designer/types';
import { removeCartItem, updateCartItem, duplicateCartItem, useCart, type CartItem } from '@/lib/cart-store';
import { saveDesign } from '@/lib/designs-store';
import { formatPrice } from '@/lib/format';
import { quoteCart, quoteLine } from '@/lib/pricing';

export function CartView() {
  const items = useCart();
  const router = useRouter();
  const added = useSearchParams().get('added');
  // unitPrice stored in the cart is the base unit price at design time; tiers apply on quantity.
  const totals = items.map((i) => (i.unitPrice == null ? 0 : quoteLine({ basePrice: i.unitPrice, quantity: i.quantity }).total));
  const cart = quoteCart(totals);

  const edit = (i: CartItem) => {
    const id = i.designId ?? `d-${i.id}`;
    saveDesign({ id, name: i.productName, productSlug: i.productSlug, productName: i.productName, size: i.size, design: i.design, previewSvg: i.previewSvg }, false);
    removeCartItem(i.id);
    router.push(`/designer/${i.productSlug}/?design=${id}&qty=${i.quantity}`);
  };

  return (
    <div className="container-x pt-24 pb-20">
      <h1 className="text-3xl font-extrabold">סל הקניות</h1>
      {added && items.length > 0 && (
        <p className="mt-4 flex animate-pop items-center gap-2 rounded-xl bg-ok/10 px-4 py-3 text-sm font-medium text-ok" role="status">
          <Icon name="check" size={18} /> {Number(added) > 1 ? `${added} חותמות נוספו לסל` : 'החותמת נוספה לסל'}
        </p>
      )}
      {!items.length ? (
        <div className="card mt-8 grid place-items-center p-14 text-center">
          <Icon name="cart" size={36} className="text-muted" />
          <p className="mt-3 text-lg font-semibold">הסל ריק</p>
          <p className="mt-1 text-muted">עצבו חותמת והיא תופיע כאן.</p>
          <Link href="/designer/" className="btn-primary mt-6">
            עיצוב חותמת
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <ul className="space-y-4">
            {items.map((i, n) => (
              <li key={i.id} className="card flex animate-fade-up flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="grid h-28 w-full shrink-0 place-items-center rounded-xl bg-[#fdfcf8] p-3 sm:w-44">
                  <StampThumb svg={i.previewSvg} ink={i.ink} className="max-h-full max-w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{i.productName}</p>
                  <p className="mt-1 text-sm text-muted">
                    {i.size} · דיו {INK_COLORS[i.ink].label}
                    {i.bodyColor ? ` · גוף ${i.bodyColor}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => edit(i)}>
                      <Icon name="text" size={15} /> עריכה
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => duplicateCartItem(i.id)}>
                      <Icon name="copy" size={15} /> שכפול
                    </button>
                    <button type="button" className="btn-ghost btn-sm text-bad" onClick={() => removeCartItem(i.id)}>
                      <Icon name="trash" size={15} /> הסרה
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end">
                  <QuantityStepper value={i.quantity} onChange={(q) => updateCartItem(i.id, { quantity: q })} />
                  <p className="text-lg font-bold">{i.unitPrice == null ? 'לפי הצעה' : formatPrice(totals[n])}</p>
                </div>
              </li>
            ))}
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
