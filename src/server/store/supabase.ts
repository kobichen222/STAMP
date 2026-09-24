import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Order } from '../orders/types';
import type { ListOptions, OrderStore } from './types';

const BUCKET = process.env.SUPABASE_BUCKET || 'production-files';

/**
 * Supabase store (see supabase/migrations). Orders are kept as a JSON document
 * with indexed columns for search; production files live in a PRIVATE bucket
 * and are only served through authenticated API routes (spec §195).
 */
export function supabaseStore(url: string, serviceKey: string): OrderStore {
  const db: SupabaseClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const row = (o: Order) => ({
    id: o.id,
    idempotency_key: o.idempotencyKey,
    status: o.status,
    payment_status: o.paymentStatus,
    customer_name: o.customer.name,
    customer_phone: o.customer.phone,
    customer_email: o.customer.email ?? null,
    company: o.customer.company ?? null,
    total: o.total,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
    data: o,
  });
  return {
    kind: 'supabase',
    durable: true,
    async findByIdempotencyKey(key) {
      const { data } = await db.from('orders').select('data').eq('idempotency_key', key).maybeSingle();
      return (data?.data as Order) ?? null;
    },
    async getOrder(id) {
      const { data, error } = await db.from('orders').select('data').eq('id', id).maybeSingle();
      if (error) throw error;
      return (data?.data as Order) ?? null;
    },
    async listOrders(opts: ListOptions = {}) {
      let q = db.from('orders').select('data').order('created_at', { ascending: false }).limit(opts.limit ?? 200);
      if (opts.status?.length) q = q.in('status', opts.status);
      if (opts.q) {
        const s = opts.q.replace(/[%,()]/g, ' ').trim();
        q = q.or(`id.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%,customer_email.ilike.%${s}%,company.ilike.%${s}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => r.data as Order);
    },
    async saveOrder(order) {
      const { error } = await db.from('orders').upsert(row(order), { onConflict: 'id' });
      if (error) throw error;
    },
    async putFile(p, data, contentType) {
      const body = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const { error } = await db.storage.from(BUCKET).upload(p, body, { contentType, upsert: true });
      if (error) throw error;
    },
    async getFile(p) {
      const { data, error } = await db.storage.from(BUCKET).download(p);
      if (error || !data) return null;
      return { data: new Uint8Array(await data.arrayBuffer()), contentType: data.type || 'application/octet-stream' };
    },
  };
}
