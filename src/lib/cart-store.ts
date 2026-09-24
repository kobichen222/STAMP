'use client';

import type { Design, InkColor } from '@/designer/types';
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
  unitPrice: number | null;
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
