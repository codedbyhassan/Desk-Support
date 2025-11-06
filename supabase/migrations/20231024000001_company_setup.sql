-- Create enum types for common constraints
create type subscription_plan_type as enum ('basic', 'pro', 'enterprise');
create type company_status_type as enum ('active', 'inactive', 'suspended');
create type theme_type as enum ('light', 'dark', 'system');
create type user_role_type as enum ('admin', 'employee');
create type time_format_type as enum ('12h', '24h');
create type ticket_status_type as enum ('open', 'in_progress', 'resolved', 'closed');
create type ticket_priority_type as enum ('low', 'medium', 'high', 'urgent');
create type asset_status_type as enum ('available', 'assigned', 'maintenance', 'retired');

-- Create companies table with subscription defaults
create table if not exists public.companies (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text,
  phone text,
  address text,
  website text,
  logo_url text,
  subscription_plan subscription_plan_type default 'basic',
  max_users integer default 10,
  max_assets integer default 100,
  status company_status_type default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create company settings table
create table if not exists public.company_settings (
  id uuid default gen_random_uuid() primary key,
  company_id uuid unique references public.companies(id) on delete cascade,
  primary_color text default '#3b82f6',
  secondary_color text default '#8b5cf6',
  accent_color text default '#10b981',
  dark_primary_color text default '#60a5fa',
  dark_secondary_color text default '#a78bfa',
  dark_accent_color text default '#34d399',
  company_name text,
  company_logo_url text,
  favicon_url text,
  default_theme theme_type default 'light',
  date_format text default 'MM/DD/YYYY',
  time_format time_format_type default '12h',
  currency text default 'USD',
  timezone text default 'UTC',
  enable_email_notifications boolean default true,
  enable_push_notifications boolean default true,
  enable_asset_qr_codes boolean default true,
  enable_ticket_attachments boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create users table (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role_type not null,
  avatar_url text,
  phone text,
  company_id uuid not null references public.companies(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Function to setup new company
create or replace function public.setup_new_company(
  p_company_name text,
  p_user_id uuid,
  p_user_email text,
  p_user_full_name text,
  p_user_role user_role_type
) returns void
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
  v_company_settings_id uuid;
begin
  -- Create company
  insert into public.companies (
    name,
    subscription_plan,
    status
  )
  values (
    p_company_name,
    'basic',
    'active'
  )
  returning id into v_company_id;

  -- Create company settings
  insert into public.company_settings (
    company_id,
    company_name
  )
  values (
    v_company_id,
    p_company_name
  )
  returning id into v_company_settings_id;

  -- Create user profile
  insert into public.users (
    id,
    email,
    full_name,
    role,
    company_id
  )
  values (
    p_user_id,
    p_user_email,
    p_user_full_name,
    p_user_role,
    v_company_id
  );

  -- Create audit log
  insert into public.audit_logs (
    user_id,
    company_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    p_user_id,
    v_company_id,
    'company_created',
    'company',
    v_company_id,
    jsonb_build_object(
      'company_name', p_company_name,
      'created_by', p_user_full_name,
      'role', p_user_role
    )
  );
end;
$$;