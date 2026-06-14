-- ---------------------------------------------------------------------------
-- Customer-facing order status page.
--   * order_token: unguessable per-order token used in the status URL.
--   * get_order_by_token: SECURITY DEFINER lookup returning ONLY safe,
--     customer-visible fields for a valid token. The orders table itself is
--     never exposed to anonymous visitors.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists order_token uuid not null default gen_random_uuid();

create unique index if not exists orders_order_token_idx
  on public.orders (order_token);

-- Returns the order + its items as JSON for a valid token, or null. Only safe
-- presentation fields are included (no Stripe ids, no internal flags).
create or replace function public.get_order_by_token(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id,
    'created_at', o.created_at,
    'fulfillment_method', o.fulfillment_method,
    'order_status', o.order_status,
    'payment_status', o.payment_status,
    'customer_name', o.customer_name,
    'subtotal_cents', o.subtotal_cents,
    'discount_code', o.discount_code,
    'discount_cents', o.discount_cents,
    'shipping_cents', o.shipping_cents,
    'total_cents', o.total_cents,
    'shipping_name', o.shipping_name,
    'shipping_line1', o.shipping_line1,
    'shipping_line2', o.shipping_line2,
    'shipping_city', o.shipping_city,
    'shipping_province', o.shipping_province,
    'shipping_postal_code', o.shipping_postal_code,
    'shipping_country', o.shipping_country,
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price_cents', oi.unit_price_cents,
            'total_cents', oi.total_cents
          )
          order by oi.created_at
        )
        from public.order_items oi
        where oi.order_id = o.id
      ),
      '[]'::jsonb
    )
  )
  from public.orders o
  where o.order_token = p_token
  limit 1;
$$;

-- Allow anonymous + authenticated callers to resolve a token (the token itself
-- is the secret). Lock down nothing else.
grant execute on function public.get_order_by_token(uuid) to anon, authenticated;
