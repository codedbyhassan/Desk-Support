alter table public.assets add column if not exists archived_at timestamptz;

create table if not exists public.asset_images (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  width integer,
  height integer,
  alt_text text,
  is_primary boolean not null default false,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint asset_images_size_check check (file_size_bytes is null or file_size_bytes > 0),
  constraint asset_images_dimensions_check check ((width is null and height is null) or (width > 0 and height > 0))
);
create index if not exists idx_asset_images_asset_created on public.asset_images(asset_id, created_at desc);
create unique index if not exists idx_asset_images_one_primary on public.asset_images(asset_id) where is_primary;

create table if not exists public.asset_maintenance (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  maintenance_type text not null default 'repair',
  status text not null default 'open',
  description text not null,
  performed_by uuid references public.profiles(id) on delete set null,
  vendor_name text,
  cost numeric,
  started_at timestamptz,
  completed_at timestamptz,
  next_due_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_maintenance_type_check check (maintenance_type in ('repair','preventive','inspection','cleaning','upgrade','other')),
  constraint asset_maintenance_status_check check (status in ('open','in_progress','completed','cancelled')),
  constraint asset_maintenance_cost_check check (cost is null or cost >= 0),
  constraint asset_maintenance_dates_check check (completed_at is null or started_at is null or completed_at >= started_at)
);
create index if not exists idx_asset_maintenance_asset_date on public.asset_maintenance(asset_id, created_at desc);

alter table public.assets drop constraint if exists assets_purchase_cost_check;
alter table public.assets add constraint assets_purchase_cost_check check (purchase_cost is null or purchase_cost >= 0);
create unique index if not exists idx_assets_company_asset_tag_unique on public.assets(company_id, lower(asset_tag));
create unique index if not exists idx_assets_company_serial_unique on public.assets(company_id, lower(serial_number)) where serial_number is not null and btrim(serial_number) <> '';
create index if not exists idx_assets_company_status_created on public.assets(company_id,status,created_at desc);
create index if not exists idx_assets_company_category on public.assets(company_id,category);
create index if not exists idx_assets_company_warranty on public.assets(company_id,warranty_expires_at) where warranty_expires_at is not null;
create index if not exists idx_assets_company_location on public.assets(company_id,location) where location is not null;
create unique index if not exists idx_asset_assignments_one_active on public.asset_assignments(asset_id) where returned_at is null;
create index if not exists idx_asset_assignments_user_active on public.asset_assignments(assigned_to,assigned_at desc) where returned_at is null;
create index if not exists idx_asset_history_asset_created on public.asset_history(asset_id,created_at desc);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('asset-images','asset-images',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

alter table public.asset_images enable row level security;
alter table public.asset_maintenance enable row level security;

drop policy if exists asset_images_select_member on public.asset_images;
drop policy if exists asset_images_insert_manager on public.asset_images;
drop policy if exists asset_images_delete_manager on public.asset_images;
create policy asset_images_select_member on public.asset_images for select to authenticated using (exists(select 1 from public.assets a where a.id=asset_images.asset_id and a.company_id = any(public.current_company_id_array())));
create policy asset_images_insert_manager on public.asset_images for insert to authenticated with check (uploaded_by=auth.uid() and exists(select 1 from public.assets a where a.id=asset_images.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role])));
create policy asset_images_delete_manager on public.asset_images for delete to authenticated using (exists(select 1 from public.assets a where a.id=asset_images.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role])));

drop policy if exists asset_maintenance_select_member on public.asset_maintenance;
drop policy if exists asset_maintenance_insert_manager on public.asset_maintenance;
drop policy if exists asset_maintenance_update_manager on public.asset_maintenance;
drop policy if exists asset_maintenance_delete_manager on public.asset_maintenance;
create policy asset_maintenance_select_member on public.asset_maintenance for select to authenticated using (exists(select 1 from public.assets a where a.id=asset_maintenance.asset_id and a.company_id = any(public.current_company_id_array())));
create policy asset_maintenance_insert_manager on public.asset_maintenance for insert to authenticated with check ((created_by=auth.uid() or created_by is null) and exists(select 1 from public.assets a where a.id=asset_maintenance.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role])));
create policy asset_maintenance_update_manager on public.asset_maintenance for update to authenticated using (exists(select 1 from public.assets a where a.id=asset_maintenance.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role]))) with check (exists(select 1 from public.assets a where a.id=asset_maintenance.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role])));
create policy asset_maintenance_delete_manager on public.asset_maintenance for delete to authenticated using (exists(select 1 from public.assets a where a.id=asset_maintenance.asset_id and private.has_company_role(a.company_id,array['admin'::membership_role,'hr'::membership_role,'manager'::membership_role])));

drop policy if exists asset_images_storage_select on storage.objects;
drop policy if exists asset_images_storage_insert on storage.objects;
drop policy if exists asset_images_storage_delete on storage.objects;
create policy asset_images_storage_select on storage.objects for select to authenticated using (bucket_id='asset-images' and exists(select 1 from public.asset_images ai join public.assets a on a.id=ai.asset_id where ai.storage_path=name and a.company_id=any(public.current_company_id_array())));
create policy asset_images_storage_insert on storage.objects for insert to authenticated with check (bucket_id='asset-images' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy asset_images_storage_delete on storage.objects for delete to authenticated using (bucket_id='asset-images' and (storage.foldername(name))[1]=(select auth.uid()::text));

create or replace function private.touch_asset_updated_at() returns trigger language plpgsql security invoker set search_path=public,pg_catalog as $$ begin new.updated_at=now(); return new; end; $$;
drop trigger if exists trg_asset_maintenance_updated_at on public.asset_maintenance;
create trigger trg_asset_maintenance_updated_at before update on public.asset_maintenance for each row execute function private.touch_asset_updated_at();
