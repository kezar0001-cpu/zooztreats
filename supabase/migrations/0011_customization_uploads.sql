-- ---------------------------------------------------------------------------
-- Zooz Treats — customization-uploads storage bucket
--
-- Holds customer-uploaded sticker designs for party / premium boxes. Uploads
-- happen through a server route using the service-role client (which bypasses
-- RLS), so no anon insert policy is required. Reads are public so the admin and
-- the order pages can display the design.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('customization-uploads', 'customization-uploads', true)
on conflict (id) do update set public = excluded.public;

-- Anyone can read uploaded designs (public bucket).
drop policy if exists "customization_uploads_public_read" on storage.objects;
create policy "customization_uploads_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'customization-uploads');

-- Authenticated users (admins) may manage objects directly if needed.
drop policy if exists "customization_uploads_auth_insert" on storage.objects;
create policy "customization_uploads_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'customization-uploads');

drop policy if exists "customization_uploads_auth_delete" on storage.objects;
create policy "customization_uploads_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'customization-uploads');
