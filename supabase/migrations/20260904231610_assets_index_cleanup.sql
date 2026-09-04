create index if not exists idx_asset_images_uploaded_by on public.asset_images(uploaded_by,created_at desc);
create index if not exists idx_asset_maintenance_created_by on public.asset_maintenance(created_by,created_at desc);
create index if not exists idx_asset_maintenance_performed_by on public.asset_maintenance(performed_by,created_at desc);
drop index if exists public.idx_asset_assignments_user_active;
drop index if exists public.asset_assignments_one_active_idx;
