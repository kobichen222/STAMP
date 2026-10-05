import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type { Order } from '../orders/types';
import type { ListOptions, OrderStore, RewardCoupon } from './types';

/**
 * Neon (serverless Postgres) store. Orders are a JSON document with indexed
 * columns for search; production files are kept in the database itself (they
 * are small SVG/PDF/EPS files) and only served through authenticated routes.
 * Tables carry an `s2g_` prefix so the site can share a database safely, and
 * are created on first use – no manual migration step.
 */
export const SCHEMA = [
  `create table if not exists s2g_orders (
    id               text primary key,
    idempotency_key  text not null unique,
    status           text not null,
    payment_status   text not null default 'unpaid',
    customer_name    text not null,
    customer_phone   text not null,
    customer_email   text,
    company          text,
    total            numeric(10,2) not null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    data             jsonb not null
  )`,
  `create index if not exists s2g_orders_status_idx on s2g_orders (status, created_at desc)`,
  `create index if not exists s2g_orders_created_idx on s2g_orders (created_at desc)`,
  `create index if not exists s2g_orders_phone_idx on s2g_orders (customer_phone)`,
  `create table if not exists s2g_files (
    path          text primary key,
    content_type  text not null,
    data          bytea not null,
    created_at    timestamptz not null default now()
  )`,
  `create table if not exists s2g_contacts (
    id          bigserial primary key,
    at          timestamptz not null default now(),
    name        text not null,
    phone       text not null,
    email       text,
    message     text,
    page        text,
    mailed      boolean not null default false
  )`,
  `create index if not exists s2g_contacts_at_idx on s2g_contacts (at desc)`,
  `create table if not exists s2g_settings (
    key         text primary key,
    value       jsonb not null,
    updated_at  timestamptz not null default now()
  )`,
  `alter table s2g_contacts add column if not exists handled boolean not null default false`,
  `create table if not exists s2g_coupons (
    code           text primary key,
    pct            numeric(5,2) not null,
    order_id       text not null,
    phone          text,
    email          text,
    created_at     timestamptz not null default now(),
    used_at        timestamptz,
    used_order_id  text
  )`,
];

let ready: Promise<void> | null = null;

/**
 * The Vercel ↔ Neon integration may add a custom prefix to its variables
 * (e.g. STAMOOO_DATABASE_URL), so prefixed names are accepted as well.
 */
export function databaseUrl(): string | undefined {
  const env = process.env;
  const exact = env.DATABASE_URL || env.POSTGRES_URL || env.NEON_DATABASE_URL;
  if (exact) return exact;
  for (const suffix of ['_DATABASE_URL', '_POSTGRES_URL', '_DATABASE_URL_UNPOOLED', '_POSTGRES_URL_NON_POOLING']) {
    const key = Object.keys(env).find((k) => k.endsWith(suffix) && env[k]?.startsWith('postgres'));
    if (key) return env[key];
  }
  return undefined;
}

/** Shared SQL client; the schema is ensured once per server instance. */
export async function db(): Promise<NeonQueryFunction<false, false>> {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not configured');
  const sql = neon(url);
  ready ??= (async () => {
    for (const stmt of SCHEMA) await sql.query(stmt);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return sql;
}

export function neonStore(): OrderStore {
  return {
    kind: 'neon',
    durable: true,
    async findByIdempotencyKey(key) {
      const sql = await db();
      const rows = await sql`select data from s2g_orders where idempotency_key = ${key} limit 1`;
      return (rows[0]?.data as Order) ?? null;
    },
    async getOrder(id) {
      const sql = await db();
      const rows = await sql`select data from s2g_orders where id = ${id} limit 1`;
      return (rows[0]?.data as Order) ?? null;
    },
    async listOrders(opts: ListOptions = {}) {
      const sql = await db();
      const status = opts.status?.length ? opts.status : null;
      const q = opts.q?.trim() ? `%${opts.q.trim().replace(/[\\%_]/g, (c) => '\\' + c)}%` : null;
      const rows = await sql`
        select data from s2g_orders
        where (${status}::text[] is null or status = any(${status}::text[]))
          and (${q}::text is null or id ilike ${q} or customer_name ilike ${q} or customer_phone ilike ${q}
               or customer_email ilike ${q} or company ilike ${q} or data::text ilike ${q})
        order by created_at desc
        limit ${opts.limit ?? 200}`;
      return rows.map((r) => r.data as Order);
    },
    async saveOrder(o) {
      const sql = await db();
      await sql`
        insert into s2g_orders (id, idempotency_key, status, payment_status, customer_name, customer_phone, customer_email, company, total, created_at, updated_at, data)
        values (${o.id}, ${o.idempotencyKey}, ${o.status}, ${o.paymentStatus}, ${o.customer.name}, ${o.customer.phone}, ${o.customer.email ?? null},
                ${o.customer.company ?? null}, ${o.total}, ${o.createdAt}, ${o.updatedAt}, ${JSON.stringify(o)}::jsonb)
        on conflict (id) do update set
          status = excluded.status, payment_status = excluded.payment_status, customer_name = excluded.customer_name,
          customer_phone = excluded.customer_phone, customer_email = excluded.customer_email, company = excluded.company,
          total = excluded.total, updated_at = excluded.updated_at, data = excluded.data`;
    },
    async putFile(path, data, contentType) {
      const sql = await db();
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const hex = '\\x' + Buffer.from(bytes).toString('hex');
      await sql`
        insert into s2g_files (path, content_type, data) values (${path}, ${contentType}, ${hex}::bytea)
        on conflict (path) do update set content_type = excluded.content_type, data = excluded.data, created_at = now()`;
    },
    async getFile(path) {
      const sql = await db();
      const rows = await sql`select content_type, encode(data, 'base64') as b64 from s2g_files where path = ${path} limit 1`;
      if (!rows[0]) return null;
      return { data: new Uint8Array(Buffer.from(rows[0].b64 as string, 'base64')), contentType: rows[0].content_type as string };
    },
    async getCoupon(code) {
      const sql = await db();
      const rows = await sql`select * from s2g_coupons where upper(code) = upper(${code}) limit 1`;
      const r = rows[0];
      if (!r) return null;
      const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);
      return {
        code: r.code,
        pct: Number(r.pct),
        orderId: r.order_id,
        phone: r.phone ?? undefined,
        email: r.email ?? undefined,
        createdAt: iso(r.created_at)!,
        usedAt: iso(r.used_at),
        usedOrderId: r.used_order_id ?? undefined,
      } satisfies RewardCoupon;
    },
    async saveCoupon(c) {
      const sql = await db();
      await sql`
        insert into s2g_coupons (code, pct, order_id, phone, email, created_at, used_at, used_order_id)
        values (${c.code}, ${c.pct}, ${c.orderId}, ${c.phone ?? null}, ${c.email ?? null}, ${c.createdAt}, ${c.usedAt ?? null}, ${c.usedOrderId ?? null})
        on conflict (code) do update set used_at = excluded.used_at, used_order_id = excluded.used_order_id`;
    },
  };
}

/** Keeps every contact-form lead, even when e-mail delivery fails. */
export async function saveContact(c: { name: string; phone: string; email?: string; message?: string; page?: string; mailed: boolean }) {
  if (!databaseUrl()) return;
  const sql = await db();
  await sql`insert into s2g_contacts (name, phone, email, message, page, mailed)
            values (${c.name}, ${c.phone}, ${c.email || null}, ${c.message || null}, ${c.page || null}, ${c.mailed})`;
}

export async function listContacts(limit = 200) {
  if (!databaseUrl()) return [];
  const sql = await db();
  return (await sql`select id, at, name, phone, email, message, page, mailed, handled from s2g_contacts order by at desc limit ${limit}`) as {
    id: number;
    at: string;
    name: string;
    phone: string;
    email: string | null;
    message: string | null;
    page: string | null;
    mailed: boolean;
    handled: boolean;
  }[];
}

export async function setContactHandled(id: number, handled: boolean) {
  if (!databaseUrl()) return;
  const sql = await db();
  await sql`update s2g_contacts set handled = ${handled} where id = ${id}`;
}

/** Personal reward codes issued after payment (newest first). */
export async function listRewardCoupons(limit = 200): Promise<RewardCoupon[]> {
  if (!databaseUrl()) return [];
  const sql = await db();
  const rows = await sql`select * from s2g_coupons order by created_at desc limit ${limit}`;
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : undefined);
  return rows.map((r) => ({
    code: r.code,
    pct: Number(r.pct),
    orderId: r.order_id,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    createdAt: iso(r.created_at)!,
    usedAt: iso(r.used_at),
    usedOrderId: r.used_order_id ?? undefined,
  }));
}
