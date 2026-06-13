-- ---------------------------------------------------------------------------
-- Zooz Treats — seed data
-- Safe to run multiple times (uses on conflict do nothing on unique keys).
-- ---------------------------------------------------------------------------

-- Products ------------------------------------------------------------------
insert into public.products
  (slug, name, description, price_cents, category, active, featured, sort_order, prep_time_note)
values
  ('classic-chocolate-chip-cookies', 'Classic Chocolate Chip Cookies',
   'Our signature soft-baked chocolate chip cookies. 6 pack.',
   1800, 'Cookies', true, true, 1, 'Baked fresh — allow 2-3 days.'),
  ('smores-cookie-box', 'S''mores Cookie Box',
   'Gooey marshmallow, graham, and chocolate cookies. 6 pack.',
   2200, 'Cookies', true, true, 2, 'Baked fresh — allow 2-3 days.'),
  ('pistachio-cream-cookies', 'Pistachio Cream Cookies',
   'Delicate pistachio cookies with a smooth cream center. 6 pack.',
   2400, 'Cookies', true, false, 3, 'Baked fresh — allow 2-3 days.'),
  ('mixed-cookie-box', 'Mixed Cookie Box',
   'A variety of our most-loved cookies. 12 pack.',
   3800, 'Boxes', true, true, 4, 'Baked fresh — allow 3-4 days.'),
  ('mini-baked-goods-box', 'Mini Baked Goods Box',
   'An assortment of mini treats, perfect for sharing.',
   3200, 'Boxes', true, false, 5, 'Baked fresh — allow 3-4 days.'),
  ('custom-order-deposit', 'Custom Order Deposit',
   'Deposit to start a custom bakery order. Final price quoted separately.',
   2000, 'Custom', true, false, 6, 'Lead time discussed per order.')
on conflict (slug) do nothing;

-- Discount codes ------------------------------------------------------------
insert into public.discount_codes
  (code, type, value, active, min_order_cents)
values
  ('ZOOZ10', 'percent', 10, true, 0),
  ('LAUNCH15', 'percent', 15, true, 0),
  ('LOCAL5', 'fixed', 500, true, 0),
  ('FREESHIP', 'free_shipping', 0, true, 0)
on conflict (code) do nothing;
