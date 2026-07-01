-- ---------------------------------------------------------------------------
-- Zooz Treats — Cookie boxes, customization options, expedite & site settings
--
--  * settings          single-row site config (delivery lead time, expedite,
--                       social handles, box-option surcharges, legal copy)
--  * ribbon_colours     admin-managed ribbon colour list (party + premium)
--  * products.box_type  standard | party | premium (null = regular product)
--  * order_items.options snapshot of the chosen customization per line
--  * orders             expedite flag/amount + promised lead time snapshot
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- settings — single-row configuration (enforced singleton via id = true)
-- All columns are public-safe, so anon may read; only authenticated may write.
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id boolean primary key default true,
  constraint settings_singleton check (id),

  -- Delivery / fulfillment
  delivery_lead_time_days integer not null default 14 check (delivery_lead_time_days >= 0),

  -- Expedite (rush) option
  expedite_enabled boolean not null default false,
  expedite_fee_type text not null default 'fixed' check (expedite_fee_type in ('fixed', 'percent')),
  expedite_fee_cents integer not null default 0 check (expedite_fee_cents >= 0),
  expedite_fee_percent integer not null default 0 check (expedite_fee_percent >= 0 and expedite_fee_percent <= 100),
  expedite_lead_time_days integer not null default 3 check (expedite_lead_time_days >= 0),

  -- Box option surcharges (ribbon colour surcharges live on ribbon_colours)
  party_sticker_surcharge_cents integer not null default 0 check (party_sticker_surcharge_cents >= 0),
  premium_wax_surcharge_cents integer not null default 0 check (premium_wax_surcharge_cents >= 0),
  premium_sticker_surcharge_cents integer not null default 0 check (premium_sticker_surcharge_cents >= 0),

  -- Social handles (an icon shows in the footer only when its handle is set)
  social_tiktok text,
  social_instagram text,
  social_youtube text,
  social_x text,

  -- Legal policies (admin-editable; plain text rendered with whitespace-pre-line)
  terms_content text,
  privacy_content text,
  refund_content text,

  updated_at timestamptz not null default now()
);

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Seed the single settings row with standard default policy copy.
insert into public.settings (id, terms_content, privacy_content, refund_content)
values (
  true,
$terms$Terms of Service

Welcome to Zooz Treats. By placing an order with us you agree to the terms below. Please read them carefully.

1. Our products
We bake cookies and other treats to order in Montreal. Product photos are illustrative; hand-made items naturally vary slightly in appearance.

2. Orders and acceptance
Placing an order is an offer to purchase. Your order is confirmed once payment is completed. We may decline or cancel an order (with a full refund) if an item is unavailable or the request cannot be fulfilled.

3. Prices and payment
All prices are in Canadian dollars (CAD) and include applicable options you select. Payment is processed securely by Stripe; we never see or store your full card details.

4. Fulfillment
We offer local delivery and local pickup in Montreal. Orders are normally ready within the lead time shown at checkout. A paid expedite option may be available to shorten this time.

5. Custom and personalized items
For party and premium boxes you may choose a ribbon colour and upload a sticker design. By uploading artwork you confirm you have the right to use it and grant us permission to reproduce it on your order. We may decline artwork that is unlawful or infringes someone else's rights.

6. Allergens
Our treats are made in a kitchen that handles wheat, eggs, dairy, nuts and other allergens. We cannot guarantee any item is free from traces of allergens.

7. Cancellations and refunds
Cancellations and refunds are governed by our Refund Policy.

8. Limitation of liability
To the fullest extent permitted by law, our liability for any order is limited to the amount you paid for that order.

9. Contact
Questions about these terms? Reach out to us through the store.

Last updated: 2026.$terms$,
$privacy$Privacy Policy

Zooz Treats respects your privacy. This policy explains what we collect and how we use it.

1. Information we collect
When you place an order we collect your name, email address, phone number, and (for delivery) your shipping address. For personalized boxes we also store any sticker design you upload. Payment information is handled directly by Stripe.

2. How we use your information
We use your information to process and deliver your order, to contact you about it, and to keep records required for our business.

3. Sharing
We share information only as needed to run the store: with Stripe (payments), our hosting and database provider, and delivery services. We do not sell your personal information.

4. Cart and cookies
Your shopping cart is stored in your browser's local storage. We use only the cookies necessary to operate the site.

5. Retention
We keep order records for as long as needed for accounting, warranty and legal purposes, then delete or anonymize them.

6. Your rights
Under Quebec's privacy law (Law 25) and applicable Canadian law you may request access to, correction of, or deletion of your personal information. Contact us to make a request.

7. Contact
For any privacy question, reach out to us through the store.

Last updated: 2026.$privacy$,
$refund$Refund Policy

Because our treats are freshly baked, perishable food made to order, we handle refunds as follows.

1. Changes and cancellations
Need to change or cancel an order? Contact us as soon as possible. We can usually adjust or cancel an order for a full refund if baking has not yet started. Once your order is in preparation it can no longer be cancelled.

2. Personalized items
Party and premium boxes with a chosen ribbon or an uploaded sticker design are made specifically for you and cannot be refunded once preparation has begun.

3. Expedite fees
Expedite (rush) fees are non-refundable once we have started preparing your order.

4. Something wrong with your order?
If your order arrives damaged or is incorrect, contact us within 48 hours of delivery or pickup with photos. We will make it right with a replacement or an appropriate refund.

5. How to reach us
The fastest way to resolve any issue is to contact us through the store with your order number.

Last updated: 2026.$refund$
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- ribbon_colours — admin-managed list used by party & premium boxes
-- ---------------------------------------------------------------------------
create table if not exists public.ribbon_colours (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hex text,
  surcharge_cents integer not null default 0 check (surcharge_cents >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ribbon_colours_active_idx on public.ribbon_colours (active);
create index if not exists ribbon_colours_sort_order_idx on public.ribbon_colours (sort_order);

drop trigger if exists ribbon_colours_set_updated_at on public.ribbon_colours;
create trigger ribbon_colours_set_updated_at
  before update on public.ribbon_colours
  for each row execute function public.set_updated_at();

insert into public.ribbon_colours (name, hex, sort_order)
values
  ('Red', '#c0392b', 0),
  ('Gold', '#d4af37', 1),
  ('Pink', '#e79ec3', 2),
  ('Black', '#1c1c1c', 3),
  ('White', '#ffffff', 4),
  ('Baby Blue', '#a7d3e8', 5)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- products.box_type
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists box_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_box_type_check'
  ) then
    alter table public.products
      add constraint products_box_type_check
      check (box_type is null or box_type in ('standard', 'party', 'premium'));
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- order_items.options — snapshot of the chosen customization for this line
-- ---------------------------------------------------------------------------
alter table public.order_items
  add column if not exists options jsonb;

-- ---------------------------------------------------------------------------
-- orders — expedite + promised lead time snapshot
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists expedite boolean not null default false;
alter table public.orders
  add column if not exists expedite_cents integer not null default 0;
alter table public.orders
  add column if not exists lead_time_days integer;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   settings        anon read (public-safe), authenticated write
--   ribbon_colours  anon read active, authenticated all
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.ribbon_colours enable row level security;

drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read"
  on public.settings for select
  to anon
  using (true);

drop policy if exists "settings_auth_all" on public.settings;
create policy "settings_auth_all"
  on public.settings for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "ribbon_colours_public_read_active" on public.ribbon_colours;
create policy "ribbon_colours_public_read_active"
  on public.ribbon_colours for select
  to anon
  using (active = true);

drop policy if exists "ribbon_colours_auth_all" on public.ribbon_colours;
create policy "ribbon_colours_auth_all"
  on public.ribbon_colours for all
  to authenticated
  using (true)
  with check (true);
