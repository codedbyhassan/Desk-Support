-- asset_tickets already has a primary key covering (asset_id, ticket_id).
-- Keep that primary index and remove the redundant duplicate index.
drop index if exists public.idx_asset_tickets_asset_ticket_unique;
