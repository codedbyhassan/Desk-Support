-- API clients only need CRUD operations. Schema-level capabilities such as
-- TRUNCATE, REFERENCES, TRIGGER and MAINTAIN are not application operations.
revoke references, trigger, truncate, maintain on table public.assets from authenticated;
revoke references, trigger, truncate, maintain on table public.asset_assignments from authenticated;
revoke references, trigger, truncate, maintain on table public.asset_images from authenticated;
revoke references, trigger, truncate, maintain on table public.asset_maintenance from authenticated;
revoke references, trigger, truncate, maintain on table public.asset_history from authenticated;
revoke references, trigger, truncate, maintain on table public.asset_tickets from authenticated;
