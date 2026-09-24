'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tiny localStorage-backed store with cross-tab sync. Used for the cart, the
 * "my designs" library and drafts. Every access is wrapped in try/catch so
 * private windows / blocked storage degrade to in-memory state.
 */
export function createLocalStore<T>(key: string, initial: T) {
  let state: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) state = JSON.parse(raw);
    } catch {
      /* ignore */
    }
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return;
      try {
        state = e.newValue ? JSON.parse(e.newValue) : initial;
      } catch {
        state = initial;
      }
      listeners.forEach((l) => l());
    });
  };

  const get = () => {
    load();
    return state;
  };

  const set = (next: T | ((prev: T) => T)) => {
    load();
    state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota / private mode – keep in memory */
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  const use = (): T => useSyncExternalStore(subscribe, get, () => initial);

  return { get, set, subscribe, use };
}
