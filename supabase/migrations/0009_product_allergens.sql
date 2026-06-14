-- ---------------------------------------------------------------------------
-- Allergen / ingredient information for products (shown on product pages).
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists allergens text;
