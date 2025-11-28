-- ============================================================================
-- VIDEO CALL SYSTEM MIGRATION - SUPABASE REALTIME SIGNALING
-- ============================================================================
-- Clean version - no errors, runs seamlessly
-- ============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. VIDEO CALLS TABLE (Main call metadata)
-- ============================================================================
create table if not exists public.video_calls (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  room_name text unique not null,
  initiated_by uuid references public.users(id) on delete cascade not null,
  initiated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  status text not null check (status in ('pending', 'active', 'ended', 'cancelled')) default 'pending',
  mode text not null check (mode in ('video', 'lecture', 'audio')) default 'video',
  max_participants int default 50,
  recording_enabled boolean default false,
  recording_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- 2. CALL PARTICIPANTS TABLE (Track who's in the call)
-- ============================================================================
create table if not exists public.call_participants (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references public.video_calls(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  peer_id text,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  left_at timestamp with time zone,
  muted_audio boolean default false,
  muted_video boolean default false,
  is_screen_sharing boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(call_id, user_id)
);

-- ============================================================================
-- 3. SIGNALING MESSAGES TABLE (WebRTC offers, answers, ICE candidates)
-- ============================================================================
create table if not exists public.signaling_messages (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references public.video_calls(id) on delete cascade not null,
  from_user_id uuid references public.users(id) on delete cascade not null,
  to_user_id uuid references public.users(id) on delete cascade not null,
  message_type text not null check (message_type in ('offer', 'answer', 'ice-candidate', 'mute', 'unmute', 'screen-share')),
  payload jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '1 hour')
);

-- ============================================================================
-- 4. CALL RECORDINGS TABLE (Optional - for recording metadata)
-- ============================================================================
create table if not exists public.call_recordings (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references public.video_calls(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  recording_url text,
  duration_seconds int,
  file_size_bytes bigint,
  video_codec text,
  audio_codec text,
  storage_path text,
  status text not null check (status in ('recording', 'processing', 'ready', 'failed')) default 'recording',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- 5. CALL ACTIVITY LOGS TABLE (For analytics & troubleshooting)
-- ============================================================================
create table if not exists public.call_activity_logs (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references public.video_calls(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade,
  action text not null check (action in ('joined', 'left', 'muted_audio', 'unmuted_audio', 'muted_video', 'unmuted_video', 'screen_share_start', 'screen_share_end', 'connection_error', 'connection_restored')),
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- 6. CALL STATISTICS TABLE (Performance metrics)
-- ============================================================================
create table if not exists public.call_statistics (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references public.video_calls(id) on delete cascade not null,
  participant_id uuid references public.call_participants(id) on delete cascade not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  audio_bitrate_kbps int,
  video_bitrate_kbps int,
  packet_loss_percent numeric(5,2),
  latency_ms int,
  video_resolution text,
  frames_per_second int,
  cpu_usage_percent numeric(5,2),
  memory_usage_mb int
);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

create index if not exists idx_video_calls_team_id_status 
  on public.video_calls(team_id, status);

create index if not exists idx_video_calls_company_id_status 
  on public.video_calls(company_id, status);

create index if not exists idx_call_participants_call_id_left_at 
  on public.call_participants(call_id, left_at);

create index if not exists idx_signaling_messages_to_user_id 
  on public.signaling_messages(to_user_id, created_at);

create index if not exists idx_call_activity_logs_call_id 
  on public.call_activity_logs(call_id, created_at);

create index if not exists idx_call_statistics_call_id 
  on public.call_statistics(call_id, timestamp);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table public.video_calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.signaling_messages enable row level security;
alter table public.call_recordings enable row level security;
alter table public.call_activity_logs enable row level security;
alter table public.call_statistics enable row level security;

-- VIDEO_CALLS Policies
create policy "Users can view video calls in their teams"
  on public.video_calls for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = video_calls.team_id
        and tm.user_id = auth.uid()
        and tm.company_id = video_calls.company_id
    )
  );

create policy "Authenticated users can view calls by room_name for joining"
  on public.video_calls for select
  using (
    auth.role() = 'authenticated'
  );

create policy "Team members can create video calls"
  on public.video_calls for insert
  with check (
    auth.uid() = initiated_by and
    exists (
      select 1 from public.team_members tm
      where tm.team_id = video_calls.team_id
        and tm.user_id = auth.uid()
        and tm.company_id = video_calls.company_id
    )
  );

create policy "Users can update their own calls"
  on public.video_calls for update
  using (
    initiated_by = auth.uid() or
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- CALL_PARTICIPANTS Policies
create policy "Users can view participants in their calls"
  on public.call_participants for select
  using (
    exists (
      select 1 from public.video_calls vc
      join public.team_members tm on tm.team_id = vc.team_id
      where vc.id = call_participants.call_id
        and tm.user_id = auth.uid()
        and tm.company_id = vc.company_id
    )
  );

create policy "Users can insert themselves as participants"
  on public.call_participants for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.video_calls vc
      where vc.id = call_participants.call_id
        and vc.status in ('active', 'pending')
    )
  );

create policy "Users can update their own participant status"
  on public.call_participants for update
  using (user_id = auth.uid());

-- SIGNALING_MESSAGES Policies
create policy "Users can view their signaling messages"
  on public.signaling_messages for select
  using (
    from_user_id = auth.uid() or to_user_id = auth.uid()
  );

create policy "Users can send signaling messages"
  on public.signaling_messages for insert
  with check (
    from_user_id = auth.uid() and
    exists (
      select 1 from public.call_participants cp
      where cp.call_id = signaling_messages.call_id
        and cp.user_id = auth.uid()
    )
  );

-- CALL_RECORDINGS Policies
create policy "Users can view recordings from their company"
  on public.call_recordings for select
  using (
    company_id in (
      select company_id from public.users where id = auth.uid()
    )
  );

-- CALL_ACTIVITY_LOGS Policies
create policy "Users can view logs from their calls"
  on public.call_activity_logs for select
  using (
    exists (
      select 1 from public.video_calls vc
      join public.team_members tm on tm.team_id = vc.team_id
      where vc.id = call_activity_logs.call_id
        and tm.user_id = auth.uid()
    )
  );

create policy "System can insert activity logs"
  on public.call_activity_logs for insert
  with check (true);

-- CALL_STATISTICS Policies
create policy "Users can view their call statistics"
  on public.call_statistics for select
  using (
    exists (
      select 1 from public.call_participants cp
      where cp.id = call_statistics.participant_id
        and cp.user_id = auth.uid()
    ) or
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- ============================================================================
-- 9. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger on_video_calls_updated
  before update on public.video_calls
  for each row execute function public.handle_updated_at();

create trigger on_call_participants_updated
  before update on public.call_participants
  for each row execute function public.handle_updated_at();

create trigger on_call_recordings_updated
  before update on public.call_recordings
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

create or replace function public.end_video_call(p_call_id uuid)
returns void as $$
begin
  update public.call_participants
  set left_at = timezone('utc'::text, now())
  where call_id = p_call_id and left_at is null;

  update public.video_calls
  set status = 'ended',
      ended_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  where id = p_call_id;

  insert into public.call_activity_logs (call_id, action, details)
  values (p_call_id, 'left', jsonb_build_object('event', 'call_ended'));
end;
$$ language plpgsql security definer;

create or replace function public.get_active_team_calls(p_team_id uuid)
returns table(
  id uuid,
  room_name text,
  initiated_by uuid,
  initiated_at timestamp with time zone,
  mode text,
  participant_count bigint
) as $$
begin
  return query
  select 
    vc.id,
    vc.room_name,
    vc.initiated_by,
    vc.initiated_at,
    vc.mode,
    count(cp.id) filter (where cp.left_at is null)
  from public.video_calls vc
  left join public.call_participants cp on cp.call_id = vc.id
  where vc.team_id = p_team_id
    and vc.status = 'active'
  group by vc.id;
end;
$$ language plpgsql;

create or replace function public.log_call_action(
  p_call_id uuid,
  p_user_id uuid,
  p_action text,
  p_details jsonb default null
)
returns void as $$
begin
  insert into public.call_activity_logs (call_id, user_id, action, details)
  values (p_call_id, p_user_id, p_action, p_details);
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 11. VIEWS FOR COMMON QUERIES
-- ============================================================================

create or replace view public.active_calls_with_participants as
select 
  vc.id,
  vc.room_name,
  vc.team_id,
  vc.company_id,
  vc.initiated_by,
  vc.mode,
  vc.status,
  vc.initiated_at,
  count(distinct cp.id) filter (where cp.left_at is null) as active_participant_count
from public.video_calls vc
left join public.call_participants cp on cp.call_id = vc.id
where vc.status = 'active'
group by vc.id;

create or replace view public.call_stats_summary as
select 
  cs.call_id,
  count(*) as measurement_count,
  round(avg(cs.audio_bitrate_kbps)::numeric, 2) as avg_audio_bitrate_kbps,
  round(avg(cs.video_bitrate_kbps)::numeric, 2) as avg_video_bitrate_kbps,
  round(avg(cs.latency_ms)::numeric, 2) as avg_latency_ms,
  round(max(cs.packet_loss_percent)::numeric, 2) as max_packet_loss_percent,
  round(avg(cs.cpu_usage_percent)::numeric, 2) as avg_cpu_usage_percent
from public.call_statistics cs
group by cs.call_id;

-- ============================================================================
-- 12. STORAGE BUCKET FOR RECORDINGS
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('call-recordings', 'call-recordings', false)
on conflict (id) do nothing;

create policy "Users can view call recordings from their company"
  on storage.objects for select
  using (
    bucket_id = 'call-recordings' and
    exists (
      select 1 from public.call_recordings cr
      where cr.storage_path = storage.objects.name
        and cr.company_id in (
          select company_id from public.users where id = auth.uid()
        )
    )
  );

create policy "Admins can upload call recordings"
  on storage.objects for insert
  with check (
    bucket_id = 'call-recordings' and
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Enable Realtime for signaling_messages table in Supabase dashboard
-- 2. Update your client code to use Supabase instead of WebSocket
-- 3. Test with a simple call between two users