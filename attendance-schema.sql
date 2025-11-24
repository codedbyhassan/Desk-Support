-- Attendance System SQL Schema
-- This file contains the SQL for the user attendance tracking system

-- Create attendance_records table
create table if not exists public.attendance_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  check_in_time timestamp with time zone default timezone('utc'::text, now()) not null,
  check_out_time timestamp with time zone,
  status text not null check (status in ('present', 'absent', 'late', 'half_day', 'leave')) default 'present',
  notes text,
  location text, -- Optional: GPS location or office location
  qr_code_id uuid, -- Reference to the QR code used for check-in
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create attendance_qr_codes table for generating and tracking QR codes
create table if not exists public.attendance_qr_codes (
  id uuid default uuid_generate_v4() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  qr_code_data text not null, -- The actual QR code data/string
  generated_by uuid references public.users(id) on delete set null not null,
  expires_at timestamp with time zone, -- Optional: QR code expiration
  is_active boolean default true,
  location text, -- Optional: Where this QR code is valid (e.g., "Main Office", "Branch A")
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster queries
create index if not exists idx_attendance_records_user_id on public.attendance_records(user_id);
create index if not exists idx_attendance_records_company_id on public.attendance_records(company_id);
create index if not exists idx_attendance_records_check_in_time on public.attendance_records(check_in_time);
create index if not exists idx_attendance_records_date on public.attendance_records(date(check_in_time));
create index if not exists idx_attendance_qr_codes_company_id on public.attendance_qr_codes(company_id);
create index if not exists idx_attendance_qr_codes_active on public.attendance_qr_codes(is_active) where is_active = true;

-- Enable Row Level Security (RLS)
alter table public.attendance_records enable row level security;
alter table public.attendance_qr_codes enable row level security;

-- RLS Policies for attendance_records
-- Users can view their own attendance records
create policy "Users can view their own attendance"
  on public.attendance_records for select
  using (user_id = auth.uid());

-- Admins can view all attendance records in their company
create policy "Admins can view company attendance"
  on public.attendance_records for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() 
      and users.role = 'admin'
      and users.company_id = attendance_records.company_id
    )
  );

-- Users can create their own attendance records (check-in)
create policy "Users can check in"
  on public.attendance_records for insert
  with check (user_id = auth.uid());

-- Users can update their own attendance records (check-out)
create policy "Users can update their own attendance"
  on public.attendance_records for update
  using (user_id = auth.uid());

-- Admins can update any attendance record in their company
create policy "Admins can update company attendance"
  on public.attendance_records for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() 
      and users.role = 'admin'
      and users.company_id = attendance_records.company_id
    )
  );

-- RLS Policies for attendance_qr_codes
-- Admins can view QR codes for their company
create policy "Admins can view company QR codes"
  on public.attendance_qr_codes for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() 
      and users.role = 'admin'
      and users.company_id = attendance_qr_codes.company_id
    )
  );

-- Admins can create QR codes for their company
create policy "Admins can create QR codes"
  on public.attendance_qr_codes for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() 
      and users.role = 'admin'
      and users.company_id = attendance_qr_codes.company_id
    )
  );

-- Admins can update QR codes for their company
create policy "Admins can update QR codes"
  on public.attendance_qr_codes for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() 
      and users.role = 'admin'
      and users.company_id = attendance_qr_codes.company_id
    )
  );

-- Admins can delete QR codes for their company
create policy "Admins can delete QR codes"
  on public.attendance_qr_codes for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() 
      and users.role = 'admin'
      and users.company_id = attendance_qr_codes.company_id
    )
  );

-- Trigger for updated_at on attendance_records
create trigger on_attendance_record_updated
  before update on public.attendance_records
  for each row execute procedure public.handle_updated_at();

-- Trigger for updated_at on attendance_qr_codes
create trigger on_attendance_qr_code_updated
  before update on public.attendance_qr_codes
  for each row execute procedure public.handle_updated_at();

-- Function to check if user has already checked in today
create or replace function public.check_user_checked_in_today(p_user_id uuid)
returns boolean as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.attendance_records
  where user_id = p_user_id
    and date(check_in_time) = current_date
    and check_out_time is null;
  
  return v_count > 0;
end;
$$ language plpgsql security definer;

-- Function to get user's attendance summary for a date range
create or replace function public.get_user_attendance_summary(
  p_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  total_days integer,
  present_days integer,
  absent_days integer,
  late_days integer,
  half_days integer
) as $$
begin
  return query
  select 
    count(distinct date(check_in_time))::integer as total_days,
    count(*) filter (where status = 'present')::integer as present_days,
    count(*) filter (where status = 'absent')::integer as absent_days,
    count(*) filter (where status = 'late')::integer as late_days,
    count(*) filter (where status = 'half_day')::integer as half_days
  from public.attendance_records
  where user_id = p_user_id
    and date(check_in_time) >= p_start_date
    and date(check_in_time) <= p_end_date;
end;
$$ language plpgsql security definer;

