-- ---------------------------------------------------------------------------
-- Order confirmation email: idempotency guard so webhook retries never
-- re-send the customer/owner confirmation.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists confirmation_email_sent boolean not null default false;
