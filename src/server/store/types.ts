import type { Order, OrderStatus } from '../orders/types';

export interface ListOptions {
  status?: OrderStatus[];
  q?: string;
  limit?: number;
}

export interface OrderStore {
  kind: 'supabase' | 'filesystem';
  /** True when data survives deployments/instances (Supabase). */
  durable: boolean;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(opts?: ListOptions): Promise<Order[]>;
  saveOrder(order: Order): Promise<void>;
  putFile(path: string, data: Uint8Array | string, contentType: string): Promise<void>;
  getFile(path: string): Promise<{ data: Uint8Array; contentType: string } | null>;
}

export function matchesQuery(o: Order, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [o.id, o.customer.name, o.customer.phone, o.customer.email, o.customer.company, o.shipping.trackingNumber, ...o.items.map((i) => i.productSlug)]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(s));
}
