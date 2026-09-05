/* Phase 3: asset constraint hygiene only. */
alter table public.assets drop constraint if exists assets_name_not_blank;
alter table public.assets drop constraint if exists assets_name_nonblank_check;
alter table public.assets drop constraint if exists assets_tag_not_blank;
alter table public.assets drop constraint if exists assets_asset_tag_nonblank_check;
alter table public.assets drop constraint if exists assets_warranty_check;
alter table public.assets drop constraint if exists assets_warranty_after_purchase_check;
alter table public.assets add constraint assets_name_nonblank check(length(trim(name))>0);
alter table public.assets add constraint assets_asset_tag_nonblank check(length(trim(asset_tag))>0);
alter table public.assets add constraint assets_warranty_after_purchase check(warranty_expires_at is null or purchase_date is null or warranty_expires_at>=purchase_date);
