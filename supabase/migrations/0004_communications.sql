-- Desk-Support canonical database redesign
-- Migration 0004: team messaging and calls.

create type public.message_visibility as enum ('team','private');
create type public.call_status as enum ('scheduled','waiting','active','ended','cancelled');
create type public.call_participant_status as enum ('invited','joined','left','declined');

create table public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) > 0),
  visibility public.message_visibility not null default 'team',
  reply_to_id uuid references public.team_messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.message_reactions (
  message_id uuid not null references public.team_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (length(trim(reaction)) > 0),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

create table public.message_reads (
  message_id uuid not null references public.team_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.video_calls (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  status public.call_status not null default 'scheduled',
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  meeting_url text,
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.call_participants (
  call_id uuid not null references public.video_calls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.call_participant_status not null default 'invited',
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (call_id, user_id),
  check (left_at is null or joined_at is not null),
  check (left_at is null or left_at >= joined_at)
);

create table public.call_recordings (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.video_calls(id) on delete cascade,
  storage_path text not null,
  file_name text,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create trigger team_messages_set_updated_at before update on public.team_messages for each row execute function public.set_updated_at();
create trigger video_calls_set_updated_at before update on public.video_calls for each row execute function public.set_updated_at();

create index team_messages_team_created_idx on public.team_messages (team_id, created_at desc);
create index team_messages_author_idx on public.team_messages (author_id);
create index team_messages_reply_idx on public.team_messages (reply_to_id);
create index message_reactions_user_idx on public.message_reactions (user_id);
create index message_reads_user_idx on public.message_reads (user_id);
create index video_calls_company_status_idx on public.video_calls (company_id, status);
create index video_calls_team_idx on public.video_calls (team_id);
create index call_participants_user_idx on public.call_participants (user_id);
create index call_recordings_call_idx on public.call_recordings (call_id);

alter table public.team_messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reads enable row level security;
alter table public.video_calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_recordings enable row level security;

-- Baseline policies are intentionally narrow. Migration 0010 hardens and normalizes the complete policy set.
create policy team_messages_select_team_member on public.team_messages for select to authenticated using (exists (select 1 from public.team_members tm where tm.team_id = team_messages.team_id and tm.user_id = (select auth.uid())));
create policy team_messages_insert_team_member on public.team_messages for insert to authenticated with check (author_id = (select auth.uid()) and exists (select 1 from public.team_members tm where tm.team_id = team_messages.team_id and tm.user_id = (select auth.uid())));
create policy team_messages_update_author on public.team_messages for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy team_messages_delete_author on public.team_messages for delete to authenticated using (author_id = (select auth.uid()));

create policy message_reactions_select_team_member on public.message_reactions for select to authenticated using (exists (select 1 from public.team_messages m join public.team_members tm on tm.team_id=m.team_id where m.id=message_reactions.message_id and tm.user_id=(select auth.uid())));
create policy message_reactions_insert_self on public.message_reactions for insert to authenticated with check (user_id=(select auth.uid()));
create policy message_reactions_delete_self on public.message_reactions for delete to authenticated using (user_id=(select auth.uid()));

create policy message_reads_select_self on public.message_reads for select to authenticated using (user_id=(select auth.uid()));
create policy message_reads_insert_self on public.message_reads for insert to authenticated with check (user_id=(select auth.uid()));
create policy message_reads_update_self on public.message_reads for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create policy video_calls_select_member on public.video_calls for select to authenticated using (company_id = any (public.current_company_id_array()));
create policy video_calls_insert_member on public.video_calls for insert to authenticated with check (created_by=(select auth.uid()) and company_id = any (public.current_company_id_array()));
create policy video_calls_update_member on public.video_calls for update to authenticated using (company_id = any (public.current_company_id_array())) with check (company_id = any (public.current_company_id_array()));

create policy call_participants_select_member on public.call_participants for select to authenticated using (exists (select 1 from public.video_calls c where c.id=call_participants.call_id and c.company_id=any(public.current_company_id_array())));
create policy call_participants_insert_member on public.call_participants for insert to authenticated with check (exists (select 1 from public.video_calls c where c.id=call_participants.call_id and c.company_id=any(public.current_company_id_array())));
create policy call_participants_update_self on public.call_participants for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create policy call_recordings_select_member on public.call_recordings for select to authenticated using (exists (select 1 from public.video_calls c where c.id=call_recordings.call_id and c.company_id=any(public.current_company_id_array())));
