import 'server-only';
import { filesystemStore } from './filesystem';
import { databaseUrl, neonStore } from './neon';
import { supabaseStore } from './supabase';
import type { OrderStore } from './types';

let store: OrderStore | null = null;

export function getStore(): OrderStore {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Neon (DATABASE_URL, set by the Vercel ↔ Neon integration) wins, then Supabase, then local files.
  store = databaseUrl() ? neonStore() : url && key ? supabaseStore(url, key) : filesystemStore();
  return store;
}

export type { OrderStore } from './types';
