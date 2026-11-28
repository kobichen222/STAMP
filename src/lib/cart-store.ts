'use client';

import type { Design, InkColor } from '@/designer/types';
import type { AddonSelection } from './pricing';
import { createLocalStore } from './local-store';

export interface CartItem {
  id: string;
  productSlug?: string;
  productName: string;
  modelId: string;
  size: string;
  design: Design;
  /** Small SVG thumbnail (outlined, safe to inline). */
  previewSvg: string;
  ink: InkColor;
  bodyColor?: string;
  quantity: number;
  /** Base list price per unit; quantity tiers are applied by the pricing engine. */
  unitPrice: number | null;
  /** Extras chosen in the order summary (ink bottle, pad, extra body…). */
  addons?: AddonSelection;
  /** Id of the design in "my designs", if saved. */
  designId?: string;
  addedAt: string;
}

export const cartStore = createLocalStore<CartItem[]>('s2g-cart', []);

export const useCart = () => cartStore.use();
export const useCartCount = () => cartStore.use().reduce((n, i) => n + i.quantity, 0);

export function addToCart(item: Omit<CartItem, 'id' | 'addedAt'>) {
  const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  cartStore.set((items) => [...items, { ...item, id, addedAt: new Date().toISOString() }]);
  return id;
}

export const updateCartItem = (id: string, patch: Partial<CartItem>) =>
  cartStore.set((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

/**
 * The cart with line `id` replaced in place by `item`: same id, position and time added, its `addons` and
 * `bodyColor` kept (the extras the customer chose stay with the line). null when that line is no longer in the cart.
 */
export function replacedLines(items: CartItem[], id: string, item: Omit<CartItem, 'id' | 'addedAt'>): CartItem[] | null {
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const old = items[i];
  const next = [...items];
  next[i] = {
    ...item,
    id: old.id,
    addedAt: old.addedAt,
    ...(old.addons ? { addons: old.addons } : {}),
    ...(old.bodyColor ? { bodyColor: old.bodyColor } : {}),
  };
  return next;
}

/** A stamp edited on the home page goes back over its cart line; a line removed meanwhile is added anew. true = replaced. */
export function replaceCartLine(id: string, item: Omit<CartItem, 'id' | 'addedAt'>): boolean {
  const next = replacedLines(cartStore.get(), id, item);
  if (!next) {
    addToCart(item);
    return false;
  }
  cartStore.set(next);
  return true;
}

export const removeCartItem = (id: string) => cartStore.set((items) => items.filter((i) => i.id !== id));

export function duplicateCartItem(id: string) {
  cartStore.set((items) => {
    const src = items.find((i) => i.id === id);
    if (!src) return items;
    return [...items, { ...src, id: `c-${Date.now().toString(36)}`, addedAt: new Date().toISOString() }];
  });
}

export const clearCart = () => cartStore.set([]);

export const cartSubtotal = (items: CartItem[]) => items.reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0);
