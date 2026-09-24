import fs from 'node:fs/promises';
import path from 'node:path';
import type { Order } from '../orders/types';
import { matchesQuery, type ListOptions, type OrderStore } from './types';

/**
 * Development / fallback store: JSON files on disk. On Vercel only /tmp is
 * writable and it is NOT shared between instances – configure Supabase for
 * production (see docs/DEPLOYMENT.md).
 */
export function filesystemStore(): OrderStore {
  const root = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/stamp2go-data' : path.join(process.cwd(), '.data'));
  const orderPath = (id: string) => path.join(root, 'orders', `${id.replace(/[^\w-]/g, '')}.json`);
  const filePath = (p: string) => path.join(root, 'files', p.replace(/\.\.+/g, '').replace(/^\/+/, ''));

  return {
    kind: 'filesystem',
    durable: !process.env.VERCEL,
    async findByIdempotencyKey(key) {
      return (await this.listOrders({ limit: 500 })).find((o) => o.idempotencyKey === key) ?? null;
    },
    async getOrder(id) {
      try {
        return JSON.parse(await fs.readFile(orderPath(id), 'utf8'));
      } catch {
        return null;
      }
    },
    async listOrders(opts: ListOptions = {}) {
      let names: string[] = [];
      try {
        names = await fs.readdir(path.join(root, 'orders'));
      } catch {
        return [];
      }
      const orders: Order[] = [];
      for (const n of names) {
        try {
          orders.push(JSON.parse(await fs.readFile(path.join(root, 'orders', n), 'utf8')));
        } catch {
          /* skip corrupt */
        }
      }
      return orders
        .filter((o) => (!opts.status?.length || opts.status.includes(o.status)) && (!opts.q || matchesQuery(o, opts.q)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, opts.limit ?? 200);
    },
    async saveOrder(order) {
      await fs.mkdir(path.join(root, 'orders'), { recursive: true });
      const tmp = orderPath(order.id) + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(order));
      await fs.rename(tmp, orderPath(order.id));
    },
    async putFile(p, data, contentType) {
      const fp = filePath(p);
      await fs.mkdir(path.dirname(fp), { recursive: true });
      await fs.writeFile(fp, data);
      await fs.writeFile(fp + '.type', contentType);
    },
    async getFile(p) {
      try {
        const fp = filePath(p);
        return { data: new Uint8Array(await fs.readFile(fp)), contentType: await fs.readFile(fp + '.type', 'utf8') };
      } catch {
        return null;
      }
    },
  };
}
