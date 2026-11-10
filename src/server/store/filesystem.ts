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
    async deleteOrder(id, by) {
      const o = await this.getOrder(id);
      if (!o) return;
      await fs.mkdir(path.join(root, 'trash'), { recursive: true });
      await fs.writeFile(path.join(root, 'trash', `${id.replace(/[^\w-]/g, '')}.json`), JSON.stringify({ order: o, deletedAt: new Date().toISOString(), by }));
      await fs.rm(orderPath(id), { force: true });
    },
    async listDeleted(limit = 100) {
      let names: string[] = [];
      try {
        names = await fs.readdir(path.join(root, 'trash'));
      } catch {
        return [];
      }
      const out = [];
      for (const n of names) {
        try {
          out.push(JSON.parse(await fs.readFile(path.join(root, 'trash', n), 'utf8')));
        } catch {
          /* skip */
        }
      }
      return out.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)).slice(0, limit);
    },
    async restoreDeleted(id) {
      const fp = path.join(root, 'trash', `${id.replace(/[^\w-]/g, '')}.json`);
      try {
        const { order } = JSON.parse(await fs.readFile(fp, 'utf8'));
        await this.saveOrder(order);
        await fs.rm(fp, { force: true });
        return order;
      } catch {
        return null;
      }
    },
    async purgeDeleted(id) {
      await fs.rm(path.join(root, 'trash', `${id.replace(/[^\w-]/g, '')}.json`), { force: true });
    },
    async putFile(p, data, contentType) {
      const fp = filePath(p);
      await fs.mkdir(path.dirname(fp), { recursive: true });
      await fs.writeFile(fp, data);
      await fs.writeFile(fp + '.type', contentType);
    },
    async getCoupon(code) {
      try {
        return JSON.parse(await fs.readFile(path.join(root, 'coupons', `${code.toUpperCase().replace(/[^\w-]/g, '')}.json`), 'utf8'));
      } catch {
        return null;
      }
    },
    async saveCoupon(c) {
      await fs.mkdir(path.join(root, 'coupons'), { recursive: true });
      await fs.writeFile(path.join(root, 'coupons', `${c.code.toUpperCase().replace(/[^\w-]/g, '')}.json`), JSON.stringify(c));
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
