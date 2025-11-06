-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create users table (extends Supabase auth.users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'employee')),
  avatar_url text,
  phone text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tickets table
create table if not exists public.tickets (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  photo_url text not null,
  status text not null check (status in ('open', 'in_progress', 'resolved', 'closed')) default 'open',
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  category text,
  created_by uuid references public.users(id) on delete cascade not null,
  assigned_to uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);

-- Create assets table
create table if not exists public.assets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text not null,
  photo_url text not null,
  serial_number text,
  category text,
  status text not null check (status in ('available', 'assigned', 'maintenance', 'retired')) default 'available',
  assigned_to uuid references public.users(id) on delete set null,
  assigned_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create asset history table
create table if not exists public.asset_history (
  id uuid default uuid_generate_v4() primary key,
  asset_id uuid references public.assets(id) on delete cascade not null,
  action text not null check (action in ('created', 'assigned', 'unassigned', 'updated', 'maintenance', 'retired')),
  performed_by uuid references public.users(id) on delete set null not null,
  assigned_to uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create storage bucket for photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict do nothing;

-- Set up Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.tickets enable row level security;
alter table public.assets enable row level security;
alter table public.asset_history enable row level security;

-- Users policies
create policy "Users can view all users"
  on public.users for select
  using (true);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Tickets policies
create policy "Employees can view their own tickets"
  on public.tickets for select
  using (
    created_by = auth.uid() or
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

create policy "Employees can create tickets"
  on public.tickets for insert
  with check (created_by = auth.uid());

create policy "Admins can update any ticket"
  on public.tickets for update
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Assets policies
create policy "Employees can view their assigned assets"
  on public.assets for select
  using (
    assigned_to = auth.uid() or
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

create policy "Admins can manage assets"
  on public.assets for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Asset history policies
create policy "Users can view asset history"
  on public.asset_history for select
  using (
    exists (
      select 1 from public.assets
      where assets.id = asset_history.asset_id
      and (
        assets.assigned_to = auth.uid() or
        exists (
          select 1 from public.users
          where users.id = auth.uid() and users.role = 'admin'
        )
      )
    )
  );

create policy "Admins can create asset history"
  on public.asset_history for insert
  with check (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Storage policies
create policy "Anyone can view photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos' and
    auth.role() = 'authenticated'
  );

-- Functions to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger on_user_updated
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger on_ticket_updated
  before update on public.tickets
  for each row execute procedure public.handle_updated_at();

create trigger on_asset_updated
  before update on public.assets
  for each row execute procedure public.handle_updated_at();
