-- The upload policy is intentionally expressed with explicit enum casts in the
-- role array. The final storage-policy reference correction is applied by the
-- later assets_storage_policy_reference_fix migration.
drop policy if exists asset_images_storage_insert on storage.objects;
create policy asset_images_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id='asset-images'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
  and exists (
    select 1 from public.assets a
    where a.id::text=(storage.foldername(name))[2]
      and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role])
  )
);
