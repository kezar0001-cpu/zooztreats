-- ---------------------------------------------------------------------------
-- Zooz Treats — Phase 1 schema
-- Tables: products, product_images, discount_codes
-- Storage: product-images bucket + policies
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh on UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  category text,
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  prep_time_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_idx on public.products (active);
create index if not exists products_sort_order_idx on public.products (sort_order);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx
  on public.product_images (product_id);
create index if not exists product_images_sort_order_idx
  on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- discount_codes
-- ---------------------------------------------------------------------------
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('percent', 'fixed', 'free_shipping')),
  value integer not null check (value >= 0),
  active boolean not null default true,
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions >= 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discount_codes_active_idx on public.discount_codes (active);

drop trigger if exists discount_codes_set_updated_at on public.discount_codes;
create trigger discount_codes_set_updated_at
  before update on public.discount_codes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Strategy for Phase 1:
--   * Public (anon) visitors can READ active products and their images
--     (needed for the customer-facing store built in a later phase).
--   * Authenticated users can do everything (read/write) on all tables.
--     The admin UI is additionally gated by the ADMIN_EMAILS env var, and
--     public sign-ups should be disabled in Supabase Auth so that only the
--     bakery owner has an account.
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.discount_codes enable row level security;

-- products
drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active"
  on public.products for select
  to anon
  using (active = true);

drop policy if exists "products_auth_all" on public.products;
create policy "products_auth_all"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

-- product_images
drop policy if exists "product_images_public_read_active" on public.product_images;
create policy "product_images_public_read_active"
  on public.product_images for select
  to anon
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id and p.active = true
    )
  );

drop policy if exists "product_images_auth_all" on public.product_images;
create policy "product_images_auth_all"
  on public.product_images for all
  to authenticated
  using (true)
  with check (true);

-- discount_codes (admin-only; never exposed to anon)
drop policy if exists "discount_codes_auth_all" on public.discount_codes;
create policy "discount_codes_auth_all"
  on public.discount_codes for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Storage bucket: product-images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

-- Anyone can read images (public bucket / store display).
drop policy if exists "product_images_storage_public_read" on storage.objects;
create policy "product_images_storage_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- Authenticated users (admins) can upload / update / delete images.
drop policy if exists "product_images_storage_auth_insert" on storage.objects;
create policy "product_images_storage_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "product_images_storage_auth_update" on storage.objects;
create policy "product_images_storage_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "product_images_storage_auth_delete" on storage.objects;
create policy "product_images_storage_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
