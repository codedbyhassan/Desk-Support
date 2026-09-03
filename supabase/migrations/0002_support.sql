-- Desk-Support canonical support domain
-- Migration 0002: tickets, categories, comments, assignments, attachments and status history.
-- Tenant ownership is inherited through tickets; child records intentionally do not duplicate company_id.

create type ticket_status as enum (
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed'
);

create type ticket_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type ticket_channel as enum (
  'portal',
  'email',
  'phone',
  'chat',
  'other'
);

create type ticket_comment_type as enum (
  'public',
  'internal'
);

create table public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_categories_name_not_blank check (length(trim(name)) > 0),
  constraint ticket_categories_company_name_key unique (company_id, name),
  constraint ticket_categories_company_id_id_key unique (company_id, id)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  ticket_number bigint generated always as identity,
  subject text not null,
  description text,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  channel ticket_channel not null default 'portal',
  category_id uuid references public.ticket_categories(id) on delete set null,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  due_at timestamptz,
  photo_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_subject_not_blank check (length(trim(subject)) > 0),
  constraint tickets_ticket_number_company_key unique (company_id, ticket_number),
  constraint tickets_acceptance_consistency check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  ),
  constraint tickets_resolution_consistency check (
    (status in ('resolved', 'closed') and resolved_at is not null)
    or status not in ('resolved', 'closed')
  ),
  constraint tickets_closed_consistency check (
    (status = 'closed' and closed_at is not null)
    or (status <> 'closed' and closed_at is null)
  )
);

create table public.ticket_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  note text,
  constraint ticket_assignments_time_check check (
    unassigned_at is null or unassigned_at >= assigned_at
  )
);

create unique index ticket_assignments_one_active_idx
  on public.ticket_assignments(ticket_id)
  where unassigned_at is null;

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  comment_type ticket_comment_type not null default 'public',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ticket_comments_body_not_blank check (length(trim(body)) > 0)
);

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint ticket_attachments_storage_path_not_blank check (length(trim(storage_path)) > 0),
  constraint ticket_attachments_file_name_not_blank check (length(trim(file_name)) > 0),
  constraint ticket_attachments_file_size_check check (file_size_bytes is null or file_size_bytes >= 0)
);

create table public.ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  from_status ticket_status,
  to_status ticket_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  changed_at timestamptz not null default now(),
  constraint ticket_status_history_transition_check check (
    from_status is null or from_status <> to_status
  )
);

-- Keep category and ticket ownership aligned without duplicating company_id on tickets/categories.
alter table public.tickets
  add constraint tickets_category_same_company_fk
  foreign key (company_id, category_id)
  references public.ticket_categories(company_id, id)
  on delete set null;

create index idx_ticket_categories_company_active
  on public.ticket_categories(company_id, is_active);

create index idx_tickets_company_status
  on public.tickets(company_id, status);

create index idx_tickets_company_priority
  on public.tickets(company_id, priority);

create index idx_tickets_company_created_at
  on public.tickets(company_id, created_at desc);

create index idx_tickets_requester
  on public.tickets(requester_id, created_at desc);

create index idx_tickets_category
  on public.tickets(category_id);

create index idx_tickets_due_at
  on public.tickets(company_id, due_at)
  where due_at is not null and status not in ('resolved', 'closed');

create index idx_ticket_assignments_assignee_active
  on public.ticket_assignments(assignee_id, assigned_at desc)
  where unassigned_at is null;

create index idx_ticket_assignments_ticket_history
  on public.ticket_assignments(ticket_id, assigned_at desc);

create index idx_ticket_comments_ticket_created
  on public.ticket_comments(ticket_id, created_at);

create index idx_ticket_attachments_ticket_created
  on public.ticket_attachments(ticket_id, created_at);

create index idx_ticket_status_history_ticket_changed
  on public.ticket_status_history(ticket_id, changed_at desc);

create trigger ticket_categories_set_updated_at
  before update on public.ticket_categories
  for each row execute function public.set_updated_at();

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

create trigger ticket_comments_set_updated_at
  before update on public.ticket_comments
  for each row execute function public.set_updated_at();

alter table public.ticket_categories enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_assignments enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.ticket_status_history enable row level security;

-- Baseline read policies. Write policies are finalized in the dedicated RLS migration.
create policy ticket_categories_select_member
  on public.ticket_categories
  for select
  to authenticated
  using (company_id = any(public.current_company_ids()));

create policy tickets_select_member
  on public.tickets
  for select
  to authenticated
  using (company_id = any(public.current_company_ids()));

create policy ticket_assignments_select_member
  on public.ticket_assignments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_assignments.ticket_id
        and t.company_id = any(public.current_company_ids())
    )
  );

create policy ticket_comments_select_member
  on public.ticket_comments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_comments.ticket_id
        and t.company_id = any(public.current_company_ids())
    )
  );

create policy ticket_attachments_select_member
  on public.ticket_attachments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
        and t.company_id = any(public.current_company_ids())
    )
  );

create policy ticket_status_history_select_member
  on public.ticket_status_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_status_history.ticket_id
        and t.company_id = any(public.current_company_ids())
    )
  );

comment on table public.tickets is 'Canonical support request. Tenant ownership lives here; child records inherit it through ticket_id.';
comment on table public.ticket_assignments is 'Assignment history for tickets. At most one active assignment per ticket.';
comment on table public.ticket_comments is 'Public and internal ticket conversation entries.';
comment on table public.ticket_attachments is 'Metadata for files stored in Supabase Storage or another controlled object store.';
comment on table public.ticket_status_history is 'Immutable-style audit trail of ticket status transitions.';
