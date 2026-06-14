-- ---------------------------------------------------------------------------
-- Make discount redemption respect max_redemptions atomically.
--
-- The increment now only fires when the code is below its cap, and returns the
-- resulting count (or NULL when nothing was incremented: cap reached or the
-- code no longer exists). The webhook treats NULL as "cap reached" and skips.
-- ---------------------------------------------------------------------------

drop function if exists public.increment_discount_redemption(text);

create or replace function public.increment_discount_redemption(p_code text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.discount_codes
  set redemption_count = redemption_count + 1
  where upper(code) = upper(trim(p_code))
    and (max_redemptions is null or redemption_count < max_redemptions)
  returning redemption_count into new_count;

  return new_count; -- NULL when no row was updated
end;
$$;

revoke all on function public.increment_discount_redemption(text) from public;
grant execute on function public.increment_discount_redemption(text) to service_role;
