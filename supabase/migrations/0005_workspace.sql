create type workspace_file_kind as enum ('file','folder');
create type workspace_share_role as enum ('viewer','editor');

create table public.workspace_folders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  parent_id uuid references public.workspace_folders(id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_folders_name_not_blank check (length(trim(name)) > 0),
  unique (company_id,id)
);

create table public.workspace_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  folder_id uuid references public.workspace_folders(id) on delete set null,
  name text not null,
  kind workspace_file_kind not null default 'file',
  storage_path text,
  mime_type text,
  size_bytes bigint,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_files_name_not_blank check (length(trim(name)) > 0),
  constraint workspace_files_size_check check (size_bytes is null or size_bytes >= 0),
  constraint workspace_files_kind_storage_check check ((kind='file' and storage_path is not null) or (kind='folder' and storage_path is null)),
  unique (company_id,id)
);

alter table public.workspace_folders add constraint workspace_folders_parent_company_fk foreign key (company_id,parent_id) references public.workspace_folders(company_id,id) on delete cascade;
alter table public.workspace_files add constraint workspace_files_folder_company_fk foreign key (company_id,folder_id) references public.workspace_folders(company_id,id) on delete set null;

create table public.workspace_file_versions (
  id uuid primary key default gen_random_uuid(), file_id uuid not null references public.workspace_files(id) on delete cascade,
  version_number integer not null, storage_path text not null, size_bytes bigint, checksum text,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint workspace_file_versions_number_check check (version_number > 0),
  constraint workspace_file_versions_size_check check (size_bytes is null or size_bytes >= 0),
  constraint workspace_file_versions_path_not_blank check (length(trim(storage_path)) > 0),
  unique (file_id,version_number)
);

create table public.workspace_shares (
  id uuid primary key default gen_random_uuid(), file_id uuid not null references public.workspace_files(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade, role workspace_share_role not null default 'viewer', expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  constraint workspace_shares_target_check check (user_id is not null), unique (file_id,user_id)
);

create table public.workspace_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_id uuid not null references public.workspace_files(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id,file_id)
);

create index idx_workspace_folders_company_parent on public.workspace_folders(company_id,parent_id,name);
create index idx_workspace_files_company_folder on public.workspace_files(company_id,folder_id,name);
create index idx_workspace_files_company_kind on public.workspace_files(company_id,kind);
create index idx_workspace_file_versions_file on public.workspace_file_versions(file_id,version_number desc);
create index idx_workspace_shares_user on public.workspace_shares(user_id,created_at desc);
create index idx_workspace_shares_file on public.workspace_shares(file_id);
create index idx_workspace_favorites_user on public.workspace_favorites(user_id,created_at desc);

create trigger workspace_folders_set_updated_at before update on public.workspace_folders for each row execute function public.set_updated_at();
create trigger workspace_files_set_updated_at before update on public.workspace_files for each row execute function public.set_updated_at();

alter table public.workspace_folders enable row level security;
alter table public.workspace_files enable row level security;
alter table public.workspace_file_versions enable row level security;
alter table public.workspace_shares enable row level security;
alter table public.workspace_favorites enable row level security;

create policy workspace_folders_select_member on public.workspace_folders for select to authenticated using (company_id = any(public.current_company_id_array()));
create policy workspace_files_select_member on public.workspace_files for select to authenticated using (company_id = any(public.current_company_id_array()));
create policy workspace_file_versions_select_member on public.workspace_file_versions for select to authenticated using (exists (select 1 from public.workspace_files f where f.id=workspace_file_versions.file_id and f.company_id = any(public.current_company_id_array())));
create policy workspace_shares_select_member on public.workspace_shares for select to authenticated using (exists (select 1 from public.workspace_files f where f.id=workspace_shares.file_id and f.company_id = any(public.current_company_id_array())));
create policy workspace_favorites_select_own on public.workspace_favorites for select to authenticated using (user_id=auth.uid() and exists (select 1 from public.workspace_files f where f.id=workspace_favorites.file_id and f.company_id = any(public.current_company_id_array())));

comment on table public.workspace_folders is 'Tenant-scoped folder hierarchy with real parent foreign keys.';
comment on table public.workspace_files is 'Canonical workspace file metadata and storage pointer.';
comment on table public.workspace_file_versions is 'Immutable file version records.';
comment on table public.workspace_shares is 'Explicit user-to-file sharing permissions; no polymorphic target IDs.';
comment on table public.workspace_favorites is 'User favorites for workspace files.';