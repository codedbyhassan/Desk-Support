create type asset_status as enum ('active','assigned','maintenance','retired','lost');
create type asset_condition as enum ('new','good','fair','poor','damaged');

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_tag text not null,
  name text not null,
  description text,
  category text,
  manufacturer text,
  model text,
  serial_number text,
  status asset_status not null default 'active',
  condition asset_condition not null default 'new',
  purchase_date date,
  purchase_cost numeric(14,2),
  warranty_expires_at date,
  location text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_tag_not_blank check (length(trim(asset_tag)) > 0),
  constraint assets_name_not_blank check (length(trim(name)) > 0),
  constraint assets_purchase_cost_check check (purchase_cost is null or purchase_cost >= 0),
  constraint assets_warranty_check check (warranty_expires_at is null or purchase_date is null or warranty_expires_at >= purchase_date),
  unique (company_id, asset_tag)
);

create table public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  condition_at_assignment asset_condition,
  condition_at_return asset_condition,
  notes text,
  constraint asset_assignments_return_check check (returned_at is null or returned_at >= assigned_at)
);

create table public.asset_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  description text,
  previous_status asset_status,
  new_status asset_status,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint asset_history_event_not_blank check (length(trim(event_type)) > 0)
);

create table public.asset_tickets (
  asset_id uuid not null references public.assets(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  primary key (asset_id,ticket_id)
);

create unique index uq_assets_company_serial on public.assets(company_id,serial_number) where serial_number is not null;
create unique index uq_asset_active_assignment on public.asset_assignments(asset_id) where returned_at is null;
create index idx_assets_company_status on public.assets(company_id,status);
create index idx_assets_company_category on public.assets(company_id,category);
create index idx_assets_company_location on public.assets(company_id,location);
create index idx_assets_serial on public.assets(company_id,serial_number) where serial_number is not null;
create index idx_asset_assignments_assignee on public.asset_assignments(assigned_to,assigned_at desc);
create index idx_asset_assignments_asset on public.asset_assignments(asset_id,assigned_at desc);
create index idx_asset_history_asset on public.asset_history(asset_id,created_at desc);
create index idx_asset_tickets_ticket on public.asset_tickets(ticket_id);

create trigger assets_set_updated_at before update on public.assets for each row execute function public.set_updated_at();

alter table public.assets enable row level security;
alter table public.asset_assignments enable row level security;
alter table public.asset_history enable row level security;
alter table public.asset_tickets enable row level security;

create policy assets_select_member on public.assets for select to authenticated using (company_id = any(public.current_company_id_array()));
create policy asset_assignments_select_member on public.asset_assignments for select to authenticated using (exists (select 1 from public.assets a where a.id=asset_assignments.asset_id and a.company_id = any(public.current_company_id_array())));
create policy asset_history_select_member on public.asset_history for select to authenticated using (exists (select 1 from public.assets a where a.id=asset_history.asset_id and a.company_id = any(public.current_company_id_array())));
create policy asset_tickets_select_member on public.asset_tickets for select to authenticated using (exists (select 1 from public.assets a where a.id=asset_tickets.asset_id and a.company_id = any(public.current_company_id_array())));

comment on table public.assets is 'Canonical company asset registry.';
comment on table public.asset_assignments is 'Assignment history; one active assignment per asset.';
comment on table public.asset_history is 'Immutable operational history for assets.';
comment on table public.asset_tickets is 'Normalized asset-to-ticket relationship.';