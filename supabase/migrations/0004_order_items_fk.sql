-- ---------------------------------------------------------------------------
-- Allow deleting products that appear in past orders.
--
-- order_items.product_id originally referenced products(id) with the default
-- (NO ACTION) behavior, so deleting a sold product failed with a foreign-key
-- violation. Each line item already snapshots product_name, so we switch the
-- FK to ON DELETE SET NULL: history is preserved, deletion succeeds.
-- ---------------------------------------------------------------------------

do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.order_items'::regclass
    and contype = 'f'
    and conkey = array[
      (select attnum from pg_attribute
        where attrelid = 'public.order_items'::regclass and attname = 'product_id')
    ];

  if fk_name is not null then
    execute format('alter table public.order_items drop constraint %I', fk_name);
  end if;
end $$;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id)
  references public.products (id)
  on delete set null;
