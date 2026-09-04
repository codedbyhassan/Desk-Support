drop policy if exists asset_images_insert_manager on public.asset_images;
create policy asset_images_insert_manager on public.asset_images for insert to authenticated with check (
  uploaded_by=(select auth.uid())
  and exists (select 1 from public.assets a where a.id=asset_images.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role]))
);

drop policy if exists asset_assignments_insert_manager on public.asset_assignments;
create policy asset_assignments_insert_manager on public.asset_assignments for insert to authenticated with check (
  assigned_by=(select auth.uid())
  and exists (select 1 from public.assets a where a.id=asset_assignments.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role]))
);

drop policy if exists asset_history_insert_manager on public.asset_history;
create policy asset_history_insert_manager on public.asset_history for insert to authenticated with check (
  actor_id=(select auth.uid())
  and exists (select 1 from public.assets a where a.id=asset_history.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role]))
);
