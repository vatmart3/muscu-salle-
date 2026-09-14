-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — stockage des photos de progression
-- Bucket privé. Aucune URL publique : l'app génère des URL signées de courte
-- durée. Convention de chemin : <user_id>/<angle>/<date>-<uuid>.<ext>
-- ═══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos-progres',
  'photos-progres',
  false,
  8 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Le premier segment du chemin doit être l'identifiant du membre.
create policy "photos_lecture_soi" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos-progres' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos_depot_soi" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos-progres' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos_maj_soi" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos-progres' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos-progres' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "photos_suppression_soi" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos-progres' and (storage.foldername(name))[1] = (select auth.uid())::text);
