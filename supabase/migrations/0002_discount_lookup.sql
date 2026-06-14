-- ---------------------------------------------------------------------------
-- Phase 2: public discount-code lookup
--
-- The storefront needs to validate a discount code the customer types in, but
-- the discount_codes table must NOT be readable by anonymous visitors (RLS
-- only grants access to authenticated admins). This SECURITY DEFINER function
-- looks up a SINGLE code by exact match and returns only that row, so the
-- table is never enumerable from the browser. All discount math still happens
-- server-side (and is re-checked at checkout in Phase 3).
-- ---------------------------------------------------------------------------

create or replace function public.find_discount_code(p_code text)
returns public.discount_codes
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.discount_codes
  where upper(code) = upper(trim(p_code))
  limit 1;
$$;

-- Lock down then grant explicit execute to the anon + authenticated roles.
revoke all on function public.find_discount_code(text) from public;
grant execute on function public.find_discount_code(text) to anon, authenticated;
