-- Add company support
create table if not exists public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_at timestamp with time zone
);

-- Add company_id to users
alter table public.users add column if not exists company_id uuid references public.companies(id) on delete restrict;
create index if not exists users_company_id_idx on public.users(company_id);

-- Create stored procedure for company and user creation
create or replace function public.create_company_and_user(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_company_name text,
  p_role text
) returns void
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
begin
  -- Create company
  insert into public.companies (name, created_by)
  values (p_company_name, p_user_id)
  returning id into v_company_id;

  -- Create user profile
  insert into public.users (id, email, full_name, role, company_id)
  values (p_user_id, p_email, p_full_name, p_role, v_company_id);
end;
$$;