drop policy if exists asset_maintenance_insert_manager on public.asset_maintenance;
create policy asset_maintenance_insert_manager on public.asset_maintenance for insert to authenticated with check (
  (created_by=(select auth.uid()) or created_by is null)
  and exists (select 1 from public.assets a where a.id=asset_maintenance.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role]))
);
