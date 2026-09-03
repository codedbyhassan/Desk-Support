create type attendance_status as enum ('present','late','absent','excused');
create type qr_code_status as enum ('active','disabled','expired');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  status attendance_status not null default 'present',
  check_in timestamptz,
  check_out timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_time_check check (check_out is null or check_in is null or check_out >= check_in),
  unique (company_id,user_id,attendance_date)
);

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text not null,
  status qr_code_status not null default 'active',
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_codes_name_not_blank check (length(trim(name)) > 0),
  constraint qr_codes_code_not_blank check (length(trim(code)) > 0),
  unique (company_id,code)
);

create table public.qr_restrictions (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  restriction_type text not null,
  value text not null,
  created_at timestamptz not null default now(),
  constraint qr_restrictions_type_not_blank check (length(trim(restriction_type)) > 0),
  constraint qr_restrictions_value_not_blank check (length(trim(value)) > 0),
  unique (qr_code_id,restriction_type,value)
);

create table public.qr_scan_logs (
  id uuid primary key default gen_random_uuid(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  scanned_at timestamptz not null default now(),
  result text not null,
  ip_address inet,
  user_agent text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  metadata jsonb not null default '{}'::jsonb,
  constraint qr_scan_logs_result_not_blank check (length(trim(result)) > 0),
  constraint qr_scan_logs_latitude_check check (latitude is null or latitude between -90 and 90),
  constraint qr_scan_logs_longitude_check check (longitude is null or longitude between -180 and 180)
);

create index idx_attendance_company_date on public.attendance(company_id,attendance_date desc);
create index idx_attendance_user_date on public.attendance(user_id,attendance_date desc);
create index idx_qr_codes_company_status on public.qr_codes(company_id,status);
create index idx_qr_codes_expiry on public.qr_codes(expires_at) where expires_at is not null;
create index idx_qr_restrictions_qr on public.qr_restrictions(qr_code_id);
create index idx_qr_scan_logs_qr_time on public.qr_scan_logs(qr_code_id,scanned_at desc);
create index idx_qr_scan_logs_user_time on public.qr_scan_logs(user_id,scanned_at desc);

create trigger attendance_set_updated_at before update on public.attendance for each row execute function public.set_updated_at();
create trigger qr_codes_set_updated_at before update on public.qr_codes for each row execute function public.set_updated_at();

alter table public.attendance enable row level security;
alter table public.qr_codes enable row level security;
alter table public.qr_restrictions enable row level security;
alter table public.qr_scan_logs enable row level security;

create policy attendance_select_member on public.attendance for select to authenticated using (company_id = any(public.current_company_id_array()));
create policy qr_codes_select_member on public.qr_codes for select to authenticated using (company_id = any(public.current_company_id_array()));
create policy qr_restrictions_select_member on public.qr_restrictions for select to authenticated using (exists (select 1 from public.qr_codes q where q.id=qr_restrictions.qr_code_id and q.company_id = any(public.current_company_id_array())));
create policy qr_scan_logs_select_member on public.qr_scan_logs for select to authenticated using (exists (select 1 from public.qr_codes q where q.id=qr_scan_logs.qr_code_id and q.company_id = any(public.current_company_id_array())));

comment on table public.attendance is 'Canonical daily attendance record; one record per company member per date.';
comment on table public.qr_codes is 'Tenant-scoped QR definitions used for controlled scans.';
comment on table public.qr_restrictions is 'Explicit restrictions attached to a QR code.';
comment on table public.qr_scan_logs is 'Immutable QR scan audit records.';