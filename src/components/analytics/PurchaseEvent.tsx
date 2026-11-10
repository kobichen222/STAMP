'use client';

import { useEffect } from 'react';

type Gtag = (...args: unknown[]) => void;

export interface PurchaseData {
  id: string;
  value: number;
  shipping: number;
  coupon?: string;
  items: { item_id: string; item_name: string; item_variant?: string; price: number; quantity: number }[];
}

/** Sends a GA4 "purchase" once per order (per browser), so sales show up in Analytics. */
export function PurchaseEvent({ order }: { order: PurchaseData }) {
  useEffect(() => {
    const key = `ga-purchase-${order.id}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {}
    let tries = 0;
    const send = () => {
      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (!gtag) {
        if (tries++ < 20) setTimeout(send, 500);
        return;
      }
      gtag('event', 'purchase', {
        transaction_id: order.id,
        value: order.value,
        currency: 'ILS',
        shipping: order.shipping,
        ...(order.coupon ? { coupon: order.coupon } : {}),
        items: order.items,
      });
      try {
        localStorage.setItem(key, '1');
      } catch {}
    };
    send();
  }, [order]);
  return null;
}
