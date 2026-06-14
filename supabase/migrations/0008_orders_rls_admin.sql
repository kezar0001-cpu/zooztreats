-- ---------------------------------------------------------------------------
-- Tighten orders / order_items RLS.
--
-- Previously any authenticated user could select/update all orders. The app now
-- reads/writes orders through the service-role client (gated by ADMIN_EMAILS +
-- middleware), so we lock the tables down to admins only at the database layer
-- too (defense in depth). Service-role access bypasses RLS as before.
--
-- Admin identity at the DB layer is an `admins` table checked by is_admin().
-- SEED IT to match ADMIN_EMAILS, e.g.:
--   insert into public.admins (email) values ('owner@zooztreats.com');
-- ---------------------------------------------------------------------------

create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Only the service role (which bypasses RLS) can manage the admins table.
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Replace the broad "any authenticated user" policies with admin-only ones.
drop policy if exists "orders_auth_select" on public.orders;
drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select"
  on public.orders for select
  to authenticated
  using (public.is_admin());

drop policy if exists "orders_auth_update" on public.orders;
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "order_items_auth_select" on public.order_items;
drop policy if exists "order_items_admin_select" on public.order_items;
create policy "order_items_admin_select"
  on public.order_items for select
  to authenticated
  using (public.is_admin());
