'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Design, InkColor } from '@/designer/types';
import { cartStore, type CartItem } from '@/lib/cart-store';

const LEAD_KEY = 's2g-cart-lead';

/** The reminder e-mail's link: put the saved cart back and continue to checkout. */
export function RestoreCart() {
  const [state, setState] = useState<'loading' | 'missing'>('loading');
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('c') ?? '';
    fetch(`/api/cart-lead/?c=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; items?: (Omit<CartItem, 'id' | 'addedAt' | 'previewSvg' | 'design' | 'ink'> & { design: Design; ink: InkColor; previewSvg?: string })[] }) => {
        if (!d.ok || !d.items?.length) return setState('missing');
        const now = new Date().toISOString();
        const current = cartStore.get();
        // Keep what is already in this browser's cart; add the saved stamps that aren't there.
        const sameDesign = (a: Design, b: Design) => JSON.stringify(a) === JSON.stringify(b);
        const added = d.items
          .filter((x) => !current.some((c) => sameDesign(c.design, x.design)))
          .map((x, i) => ({ ...x, previewSvg: x.previewSvg ?? '', id: `c-${Date.now().toString(36)}-${i}`, addedAt: now }));
        cartStore.set([...current, ...added]);
        try {
          localStorage.setItem(LEAD_KEY, id);
        } catch {
          /* ignore */
        }
        location.replace('/checkout/');
      })
      .catch(() => setState('missing'));
  }, []);
  return (
    <div className="container-x grid min-h-[60vh] place-items-center pt-24 pb-16 text-center">
      {state === 'loading' ? (
        <p className="text-lg text-muted">מחזירים את העגלה שלך…</p>
      ) : (
        <div>
          <h1 className="text-2xl font-bold">לא מצאנו את העגלה</h1>
          <p className="mt-2 text-muted">ייתכן שהקישור פג. אפשר לעצב מחדש בדקה – או לכתוב לנו בוואטסאפ ונעזור.</p>
          <Link href="/designer/" className="btn-primary mt-6">
            לעיצוב חותמת
          </Link>
        </div>
      )}
    </div>
  );
}
