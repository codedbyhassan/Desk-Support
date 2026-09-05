-- Keep the primary-image helper SECURITY INVOKER so normal asset-image RLS
-- policies remain the authorization boundary instead of exposing a SECURITY
-- DEFINER RPC to authenticated users.
create or replace function public.set_primary_asset_image(p_asset_id uuid, p_image_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from public.asset_images ai where ai.id = p_image_id and ai.asset_id = p_asset_id) then
    raise exception 'Image does not belong to this asset';
  end if;
  update public.asset_images set is_primary = false where asset_id = p_asset_id and is_primary;
  update public.asset_images set is_primary = true where id = p_image_id and asset_id = p_asset_id;
end;
$$;
revoke all on function public.set_primary_asset_image(uuid,uuid) from public, anon;
grant execute on function public.set_primary_asset_image(uuid,uuid) to authenticated;
