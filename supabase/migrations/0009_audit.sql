create type public.audit_action as enum (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'access',
  'export',
  'invite',
  'approve',
  'reject'
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  description text,
  changes jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint audit_logs_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint audit_logs_description_not_blank check (description is null or btrim(description) <> '')
);

create index audit_logs_company_occurred_idx
  on public.audit_logs(company_id, occurred_at desc);
create index audit_logs_company_entity_idx
  on public.audit_logs(company_id, entity_type, entity_id, occurred_at desc);
create index audit_logs_actor_occurred_idx
  on public.audit_logs(actor_id, occurred_at desc)
  where actor_id is not null;
create index audit_logs_action_idx
  on public.audit_logs(company_id, action, occurred_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_admins_select_logs"
on public.audit_logs for select to authenticated
using (exists (
  select 1
  from public.company_memberships m
  where m.company_id = audit_logs.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

comment on table public.audit_logs is 'Append-only tenant audit trail. Entity IDs are informational; relationships to arbitrary entity tables are intentionally not polymorphic foreign keys.';
comment on column public.audit_logs.changes is 'Structured before/after or field-level change data supplied by trusted application/database code.';
comment on column public.audit_logs.metadata is 'Request and contextual metadata that is not part of the audited entity state.';
comment on column public.audit_logs.entity_id is 'Identifier of the audited record when applicable; entity_type + entity_id is intentionally not a foreign key.';

revoke insert, update, delete on public.audit_logs from authenticated;
