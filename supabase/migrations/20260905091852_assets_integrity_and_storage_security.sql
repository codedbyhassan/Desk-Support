-- Asset integrity and storage security hardening
alter table public.assets drop constraint if exists assets_asset_tag_nonblank_check;
alter table public.assets add constraint assets_asset_tag_nonblank_check check (btrim(asset_tag) <> '');
alter table public.assets drop constraint if exists assets_name_nonblank_check;
alter table public.assets add constraint assets_name_nonblank_check check (btrim(name) <> '');
alter table public.assets drop constraint if exists assets_warranty_after_purchase_check;
alter table public.assets add constraint assets_warranty_after_purchase_check check (purchase_date is null or warranty_expires_at is null or warranty_expires_at >= purchase_date);

alter table public.asset_images drop constraint if exists asset_images_file_name_nonblank_check;
alter table public.asset_images add constraint asset_images_file_name_nonblank_check check (btrim(file_name) <> '');
alter table public.asset_images drop constraint if exists asset_images_mime_type_check;
alter table public.asset_images add constraint asset_images_mime_type_check check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp'));
alter table public.asset_images drop constraint if exists asset_images_size_limit_check;
alter table public.asset_images add constraint asset_images_size_limit_check check (file_size_bytes is null or file_size_bytes <= 10485760);
create unique index if not exists idx_asset_images_storage_path_unique on public.asset_images(storage_path);
create unique index if not exists idx_asset_tickets_asset_ticket_unique on public.asset_tickets(asset_id,ticket_id);
create index if not exists idx_asset_maintenance_next_due on public.asset_maintenance(asset_id,next_due_at) where next_due_at is not null;

-- Asset records are authenticated-only. RLS remains the row-level authorization layer.
revoke all on table public.asset_images from anon;
revoke all on table public.asset_maintenance from anon;
revoke all on table public.asset_assignments from anon;
revoke all on table public.asset_history from anon;
revoke all on table public.asset_tickets from anon;
revoke all on table public.assets from anon;

-- The bucket stays private. Object authorization derives from the asset id in
-- the object path so managers can remove the object even after its metadata row
-- is deleted.
drop policy if exists asset_images_storage_select on storage.objects;
create policy asset_images_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'asset-images'
  and exists (
    select 1 from public.asset_images ai
    join public.assets a on a.id = ai.asset_id
    where ai.storage_path = storage.objects.name
      and a.company_id = any(public.current_company_id_array())
  )
);

drop policy if exists asset_images_storage_insert on storage.objects;
create policy asset_images_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'asset-images'
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid()::text)
  and exists (
    select 1 from public.assets a
    where a.id::text = (storage.foldername(storage.objects.name))[2]
      and (select private.has_company_role(a.company_id, array['admin'::public.membership_role,'hr'::public.membership_role,'manager'::public.membership_role]))
  )
);

drop policy if exists asset_images_storage_delete on storage.objects;
create policy asset_images_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'asset-images'
  and exists (
    select 1 from public.assets a
    where a.id::text = (storage.foldername(storage.objects.name))[2]
      and (select private.has_company_role(a.company_id, array['admin'::public.membership_role,'hr'::public.membership_role,'manager'::public.membership_role]))
  )
);

-- Prevent impossible lifecycle states when status is changed directly.
create or replace function private.prevent_invalid_asset_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'assigned'::public.asset_status
     and not exists (select 1 from public.asset_assignments aa where aa.asset_id = new.id and aa.returned_at is null) then
    raise exception 'An asset can only be marked assigned when it has an active assignment';
  end if;

  if new.status in ('active'::public.asset_status,'assigned'::public.asset_status)
     and exists (select 1 from public.asset_maintenance am where am.asset_id = new.id and am.status in ('open','in_progress')) then
    raise exception 'Complete or cancel active maintenance before returning the asset to active or assigned state';
  end if;

  if new.status in ('retired'::public.asset_status,'lost'::public.asset_status)
     and exists (select 1 from public.asset_assignments aa where aa.asset_id = new.id and aa.returned_at is null) then
    raise exception 'Return the asset before marking it retired or lost';
  end if;

  return new;
end;
$$;
revoke all on function private.prevent_invalid_asset_status() from public;
drop trigger if exists trg_asset_status_validation on public.assets;
create trigger trg_asset_status_validation before update of status on public.assets for each row execute function private.prevent_invalid_asset_status();

-- Atomic primary-image switching. The partial unique index guarantees that an
-- asset can have at most one primary image.
create or replace function public.set_primary_asset_image(p_asset_id uuid, p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select a.company_id into v_company_id from public.assets a where a.id = p_asset_id;
  if v_company_id is null then raise exception 'Asset not found'; end if;
  if not (select private.has_company_role(v_company_id, array['admin'::public.membership_role,'hr'::public.membership_role,'manager'::public.membership_role])) then raise exception 'You do not have permission to manage asset images'; end if;
  if not exists (select 1 from public.asset_images ai where ai.id = p_image_id and ai.asset_id = p_asset_id) then raise exception 'Image does not belong to this asset'; end if;
  update public.asset_images set is_primary = false where asset_id = p_asset_id and is_primary;
  update public.asset_images set is_primary = true where id = p_image_id;
end;
$$;
revoke all on function public.set_primary_asset_image(uuid,uuid) from public, anon;
grant execute on function public.set_primary_asset_image(uuid,uuid) to authenticated;
