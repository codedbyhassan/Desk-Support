create or replace function private.sync_asset_maintenance_state()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  has_active_assignment boolean;
begin
  if new.status in ('open','in_progress') then
    update public.assets set status='maintenance' where id=new.asset_id and status not in ('retired','lost');
  elsif new.status in ('completed','cancelled') then
    select exists(select 1 from public.asset_assignments aa where aa.asset_id=new.asset_id and aa.returned_at is null) into has_active_assignment;
    update public.assets
      set status=case when has_active_assignment then 'assigned'::asset_status else 'active'::asset_status end
      where id=new.asset_id and status='maintenance';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_asset_maintenance_state on public.asset_maintenance;
create trigger trg_asset_maintenance_state
after insert or update of status on public.asset_maintenance
for each row execute function private.sync_asset_maintenance_state();
