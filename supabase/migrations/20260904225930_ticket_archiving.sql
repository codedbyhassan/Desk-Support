alter table public.tickets add column if not exists archived_at timestamptz;
create index if not exists idx_tickets_active_company on public.tickets(company_id,created_at desc) where archived_at is null;
create index if not exists idx_tickets_archived_company on public.tickets(company_id,archived_at desc) where archived_at is not null;
