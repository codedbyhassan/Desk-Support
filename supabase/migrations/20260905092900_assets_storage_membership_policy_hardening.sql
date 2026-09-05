-- Read access uses the private role helper instead of an exposed company-id
-- SECURITY DEFINER function. This keeps the Storage policy company-scoped.
drop policy if exists asset_images_storage_select on storage.objects;
create policy asset_images_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'asset-images'
  and exists (
    select 1 from public.asset_images ai
    join public.assets a on a.id = ai.asset_id
    where ai.storage_path = storage.objects.name
      and (select private.has_company_role(a.company_id, array['admin'::public.membership_role,'hr'::public.membership_role,'manager'::public.membership_role,'employee'::public.membership_role,'contractor'::public.membership_role,'viewer'::public.membership_role]))
  )
);
