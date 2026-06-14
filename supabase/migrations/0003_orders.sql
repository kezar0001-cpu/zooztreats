-- ---------------------------------------------------------------------------
-- Phase 3: orders, order_items, Stripe coupon reuse, redemption increment
-- ---------------------------------------------------------------------------

-- Reuse the updated_at trigger helper from 0001 (created there).

-- --- orders ----------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  customer_email text,
  customer_name text,
  phone text,
  fulfillment_method text not null default 'shipping'
    check (fulfillment_method in ('shipping', 'pickup')),
  shipping_name text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_province text,
  shipping_postal_code text,
  shipping_country text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_code text,
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  order_status text not null default 'pending'
    check (order_status in ('pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled', 'refunded')),
  discount_redemption_recorded boolean not null default false,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_order_status_idx on public.orders (order_status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- --- order_items -----------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- --- discount_codes: Stripe coupon reuse -----------------------------------
alter table public.discount_codes
  add column if not exists stripe_coupon_id text;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   * Anonymous users get NO access to orders or order_items.
--   * Authenticated users (admins; gated further by ADMIN_EMAILS) can read and
--     update orders, and read order_items.
--   * Inserts come exclusively from server-side checkout/webhook logic using
--     the service role, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "orders_auth_select" on public.orders;
create policy "orders_auth_select"
  on public.orders for select
  to authenticated
  using (true);

drop policy if exists "orders_auth_update" on public.orders;
create policy "orders_auth_update"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "order_items_auth_select" on public.order_items;
create policy "order_items_auth_select"
  on public.order_items for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Atomic redemption increment (service-role only). SECURITY DEFINER so it can
-- update discount_codes; execute is locked down to service_role so anonymous
-- visitors cannot inflate redemption counts.
-- ---------------------------------------------------------------------------
create or replace function public.increment_discount_redemption(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.discount_codes
  set redemption_count = redemption_count + 1
  where upper(code) = upper(trim(p_code));
$$;

revoke all on function public.increment_discount_redemption(text) from public;
grant execute on function public.increment_discount_redemption(text) to service_role;
