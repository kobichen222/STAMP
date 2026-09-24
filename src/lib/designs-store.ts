'use client';

import type { Design } from '@/designer/types';
import { createLocalStore } from './local-store';

export interface SavedDesign {
  id: string;
  name: string;
  productSlug?: string;
  productName: string;
  size: string;
  design: Design;
  previewSvg: string;
  updatedAt: string;
  versions: { at: string; design: Design }[];
}

export interface LocalOrder {
  id: string;
  token: string;
  createdAt: string;
  total: number;
  items: { name: string; size: string; quantity: number; previewSvg: string }[];
}

const MAX_VERSIONS = 20;

export const designsStore = createLocalStore<SavedDesign[]>('s2g-designs', []);
export const ordersStore = createLocalStore<LocalOrder[]>('s2g-orders', []);

export function saveDesign(entry: Omit<SavedDesign, 'updatedAt' | 'versions'>, snapshot = true) {
  const now = new Date().toISOString();
  designsStore.set((list) => {
    const existing = list.find((d) => d.id === entry.id);
    if (!existing) return [{ ...entry, updatedAt: now, versions: [{ at: now, design: entry.design }] }, ...list];
    const versions = snapshot ? [{ at: now, design: entry.design }, ...existing.versions].slice(0, MAX_VERSIONS) : existing.versions;
    return list.map((d) => (d.id === entry.id ? { ...d, ...entry, updatedAt: now, versions } : d));
  });
}

export const deleteDesign = (id: string) => designsStore.set((l) => l.filter((d) => d.id !== id));

export function duplicateDesign(id: string, name?: string) {
  const src = designsStore.get().find((d) => d.id === id);
  if (!src) return null;
  const copy: SavedDesign = { ...src, id: `d-${Date.now().toString(36)}`, name: name ?? `${src.name} (עותק)`, updatedAt: new Date().toISOString(), versions: [] };
  designsStore.set((l) => [copy, ...l]);
  return copy.id;
}
