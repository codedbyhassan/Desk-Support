-- Private profile-image storage. Database stores only the object path;
-- the application derives short-lived signed URLs when an image is displayed.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-images','profile-images',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']::text[])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

alter table public.profiles add column if not exists avatar_path text;
create index if not exists idx_profiles_avatar_path on public.profiles(avatar_path) where avatar_path is not null;

-- The legacy column exists in the pre-hardening schema. Guard the cleanup so
-- this migration remains replayable when the remote database has already been
-- migrated by an earlier feature branch.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url'
  ) THEN
    UPDATE public.profiles SET avatar_url=null WHERE avatar_url is not null;
  END IF;
END $$;

drop policy if exists profile_images_select_member on storage.objects;
create policy profile_images_select_member on storage.objects for select to authenticated using (
  bucket_id='profile-images' and (
    split_part(name,'/',2)=(select auth.uid())::text
    or exists(select 1 from public.company_memberships m where m.user_id::text=split_part(name,'/',2) and m.company_id=any(public.current_company_id_array()) and m.is_active=true)
  )
);

drop policy if exists profile_images_insert_own on storage.objects;
create policy profile_images_insert_own on storage.objects for insert to authenticated with check (
  bucket_id='profile-images' and split_part(name,'/',1)='avatars' and split_part(name,'/',2)=(select auth.uid())::text
);

drop policy if exists profile_images_update_own on storage.objects;
create policy profile_images_update_own on storage.objects for update to authenticated using (
  bucket_id='profile-images' and split_part(name,'/',1)='avatars' and split_part(name,'/',2)=(select auth.uid())::text
) with check (
  bucket_id='profile-images' and split_part(name,'/',1)='avatars' and split_part(name,'/',2)=(select auth.uid())::text
);

drop policy if exists profile_images_delete_own on storage.objects;
create policy profile_images_delete_own on storage.objects for delete to authenticated using (
  bucket_id='profile-images' and split_part(name,'/',1)='avatars' and split_part(name,'/',2)=(select auth.uid())::text
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='avatar_url'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN avatar_url;
  END IF;
END $$;