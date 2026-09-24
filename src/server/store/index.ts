import 'server-only';
import { filesystemStore } from './filesystem';
import { supabaseStore } from './supabase';
import type { OrderStore } from './types';

let store: OrderStore | null = null;

export function getStore(): OrderStore {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  store = url && key ? supabaseStore(url, key) : filesystemStore();
  return store;
}

export type { OrderStore } from './types';
