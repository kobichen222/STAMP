-- Stamp2Go – initial schema (Supabase / PostgreSQL)
-- Phase 1 (MVP) uses `orders` + the private storage bucket. The other tables
-- are the target model for phases 2–3 (B2B, inventory, roles, analytics) and
-- are created now so later features are additive migrations only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- orders (MVP)
create table if not exists public.orders (
  id               text primary key,                 -- ORD-yymmdd-XXXX
  idempotency_key  text not null unique,             -- double-submit protection
  status           text not null,
  payment_status   text not null default 'unpaid',
  customer_name    text not null,
  customer_phone   text not null,
  customer_email   text,
  company          text,
  total            numeric(10,2) not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  data             jsonb not null                    -- full Order document (items, design versions, files, audit)
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_phone_idx on public.orders (customer_phone);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- Only the server (service role) touches orders; no public access.
alter table public.orders enable row level security;

-- Private bucket for production files, uploads and previews (served via signed/authenticated routes only)
insert into storage.buckets (id, name, public)
values ('production-files', 'production-files', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- catalog & pricing (phase 2)
create table if not exists public.products (
  id              text primary key,                  -- slug
  sku             text unique,
  name            text not null,
  brand           text,
  model           text,
  shape           text not null check (shape in ('rect','round')),
  body_width_mm   numeric(6,2),                      -- physical product size
  body_height_mm  numeric(6,2),
  print_width_mm  numeric(6,2) not null,             -- printable area (canvas)
  print_height_mm numeric(6,2) not null,
  max_lines       int,
  ink_colors      text[] not null default array['black','blue','red'],
  body_colors     text[] not null default array['black'],
  base_price      numeric(10,2),
  production_profile_id text,
  production_method text default 'laser',
  images          jsonb not null default '[]',
  model_3d_url    text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.production_profiles (
  id              text primary key,
  safe_margin_mm  numeric(4,2) not null default 1,
  min_font_pt     numeric(4,2) not null default 6,
  warn_font_pt    numeric(4,2) not null default 7,
  min_stroke_mm   numeric(4,2) not null default 0.2,
  warn_stroke_mm  numeric(4,2) not null default 0.3,
  mirror          boolean not null default false,
  outputs         text[] not null default array['svg','pdf'],
  color_mode      text not null default 'black',
  approval        text not null default 'auto' check (approval in ('auto','customer','graphic'))
);

create table if not exists public.price_rules (
  id          uuid primary key default gen_random_uuid(),
  product_id  text references public.products(id) on delete cascade,
  kind        text not null,       -- size | body | ink | logo | quantity_tier | b2b_tier
  key         text,                -- e.g. 'blue', 'business', min qty
  amount      numeric(10,2),       -- fixed surcharge
  percent     numeric(5,2),        -- discount %
  valid_from  timestamptz,
  valid_to    timestamptz
);

create table if not exists public.coupons (
  code          text primary key,
  type          text not null check (type in ('percent','fixed')),
  value         numeric(10,2) not null,
  min_subtotal  numeric(10,2),
  expires_at    timestamptz,
  max_uses      int,
  used          int not null default 0
);

create table if not exists public.shipping_methods (
  id        text primary key,
  label     text not null,
  price     numeric(10,2) not null,
  eta       text,
  free_from numeric(10,2),
  active    boolean not null default true
);

-- ---------------------------------------------------------------- customers & B2B (phase 2)
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  company_id    text,                -- ח.פ.
  billing       jsonb,
  price_tier    text not null default 'retail',
  credit_terms  text,                -- card | net30 | net60 | credit
  created_at    timestamptz not null default now()
);

create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  auth_user   uuid,                  -- auth.users.id when registered
  name        text,
  phone       text,
  email       text,
  company     uuid references public.companies(id),
  role        text,                  -- owner | manager | designer | orderer | viewer
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.designs (
  id          text primary key,
  customer    uuid references public.customers(id),
  product_id  text,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.design_versions (
  id          text primary key,      -- DV-… (hash of the design JSON)
  design_id   text references public.designs(id) on delete cascade,
  data        jsonb not null,
  locked      boolean not null default false,  -- true once paid (spec §134)
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- operations (phase 2–3)
create table if not exists public.production_jobs (
  id            text primary key,     -- JOB-<order>-<item>
  order_id      text references public.orders(id) on delete cascade,
  item_index    int not null,
  status        text not null default 'queued',
  worker        text,
  started_at    timestamptz,
  finished_at   timestamptz
);

create table if not exists public.inventory_items (
  id          text primary key,       -- body-4913, ink-pad-4913, rubber, box…
  name        text not null,
  on_hand     int not null default 0,
  reserved    int not null default 0,
  low_stock   int not null default 5
);

create table if not exists public.bom (
  product_id  text references public.products(id) on delete cascade,
  item_id     text references public.inventory_items(id),
  qty         int not null default 1,
  primary key (product_id, item_id)
);

create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  auth_user   uuid,
  name        text not null,
  role        text not null check (role in ('super_admin','manager','designer','production','warehouse','support')),
  permissions text[] not null default '{}',   -- orders.read, orders.refund, production.download…
  active      boolean not null default true
);

create table if not exists public.audit_log (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  actor      text not null,
  action     text not null,
  entity     text not null,
  entity_id  text not null,
  data       jsonb
);

create table if not exists public.notifications (
  id          text primary key,       -- <event>:<order>:<recipient>  (dedupe, spec §179)
  order_id    text,
  channel     text not null,          -- email | whatsapp | admin
  template    text not null,
  status      text not null,
  sent_at     timestamptz
);

create table if not exists public.message_templates (
  id       text primary key,          -- order.created …
  channel  text not null,
  subject  text,
  body     text not null              -- supports {{customer_name}} {{order_number}} {{product_name}} {{tracking_number}}
);

create table if not exists public.analytics_events (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  session_id  text,
  event       text not null,          -- product_viewed, designer_opened, design_started, design_completed, add_to_cart, checkout_started, payment_completed…
  data        jsonb
);

-- Enable RLS everywhere; the app uses the service role on the server only.
alter table public.products enable row level security;
alter table public.production_profiles enable row level security;
alter table public.price_rules enable row level security;
alter table public.coupons enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.companies enable row level security;
alter table public.customers enable row level security;
alter table public.designs enable row level security;
alter table public.design_versions enable row level security;
alter table public.production_jobs enable row level security;
alter table public.inventory_items enable row level security;
alter table public.bom enable row level security;
alter table public.staff enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.message_templates enable row level security;
alter table public.analytics_events enable row level security;
