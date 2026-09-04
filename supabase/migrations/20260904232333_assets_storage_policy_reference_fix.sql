drop policy if exists asset_images_storage_select on storage.objects;
create policy asset_images_storage_select on storage.objects for select to authenticated using (
  bucket_id='asset-images'
  and exists (
    select 1 from public.asset_images ai
    join public.assets a on a.id=ai.asset_id
    where ai.storage_path=name
      and a.company_id = any(public.current_company_id_array())
  )
);

drop policy if exists asset_images_storage_delete on storage.objects;
create policy asset_images_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='asset-images'
  and exists (
    select 1 from public.asset_images ai
    join public.assets a on a.id=ai.asset_id
    where ai.storage_path=name
      and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role])
  )
);

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
