-- Desk-Support canonical database redesign
-- Migration 0001: tenancy, identity, organisation foundation
-- This migration is intentionally additive and does not drop legacy objects.
-- Apply only after reviewing the migration plan against the target Supabase project.

create extension if not exists pgcrypto;

create type public.membership_role as enum (
  'admin',
  'hr',
  'manager',
  'employee',
  'contractor',
  'viewer'
);

create type public.company_status as enum (
  'active',
  'suspended',
  'archived'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  email text,
  phone text,
  address text,
  website text,
  logo_url text,
  status public.company_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) > 0),
  avatar_url text,
  phone text,
  last_seen_at timestamptz,
  is_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.membership_role not null default 'employee',
  department_id uuid,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  primary_color text,
  secondary_color text,
  accent_color text,
  default_theme text not null default 'system' check (default_theme in ('light', 'dark', 'system')),
  date_format text not null default 'DD/MM/YYYY',
  time_format text not null default '24h' check (time_format in ('12h', '24h')),
  currency_code char(3) not null default 'GHS',
  timezone text not null default 'Africa/Accra',
  enable_email_notifications boolean not null default true,
  enable_push_notifications boolean not null default true,
  enable_asset_qr_codes boolean not null default true,
  enable_ticket_attachments boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

alter table public.company_memberships
  add constraint company_memberships_department_fk
  foreign key (department_id) references public.departments(id) on delete set null;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  description text,
  team_lead_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('lead', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  last_seen_at timestamptz,
  primary key (team_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists company_memberships_set_updated_at on public.company_memberships;
create trigger company_memberships_set_updated_at
before update on public.company_memberships
for each row execute function public.set_updated_at();

drop trigger if exists company_settings_set_updated_at on public.company_settings;
create trigger company_settings_set_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create index company_memberships_user_idx on public.company_memberships (user_id) where is_active;
create index company_memberships_company_role_idx on public.company_memberships (company_id, role) where is_active;
create index company_memberships_department_idx on public.company_memberships (department_id) where is_active;
create index departments_company_idx on public.departments (company_id);
create index teams_company_idx on public.teams (company_id);
create index teams_department_idx on public.teams (department_id);
create index team_members_user_idx on public.team_members (user_id);

-- Tenant helper. It returns the companies for which the current JWT user has an active membership.
create or replace function public.current_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.company_memberships
  where user_id = auth.uid()
    and is_active = true;
$$;

revoke all on function public.current_company_ids() from public;
grant execute on function public.current_company_ids() to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_settings enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

create policy companies_select_member on public.companies
for select to authenticated
using (id in (select public.current_company_ids()));

create policy profiles_select_member on public.profiles
for select to authenticated
using (id = auth.uid() or exists (
  select 1 from public.company_memberships cm
  where cm.user_id = profiles.id
    and cm.is_active
    and cm.company_id in (select public.current_company_ids())
));

create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy memberships_select_member on public.company_memberships
for select to authenticated
using (company_id in (select public.current_company_ids()));

create policy settings_select_member on public.company_settings
for select to authenticated
using (company_id in (select public.current_company_ids()));

create policy departments_select_member on public.departments
for select to authenticated
using (company_id in (select public.current_company_ids()));

create policy teams_select_member on public.teams
for select to authenticated
using (company_id in (select public.current_company_ids()));

create policy team_members_select_member on public.team_members
for select to authenticated
using (exists (
  select 1 from public.teams t
  where t.id = team_members.team_id
    and t.company_id in (select public.current_company_ids())
));

comment on table public.profiles is 'Application profile linked 1:1 to Supabase auth.users. Authentication credentials remain in auth.users.';
comment on table public.company_memberships is 'Authoritative user-to-company relationship and company-scoped role. Do not duplicate company_id on child records solely for convenience.';
comment on table public.company_settings is 'One settings row per company. Subscription state is intentionally not stored here or on companies.';
