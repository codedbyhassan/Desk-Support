create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean;
begin
  if p_limit < 1 or p_window_seconds < 1 then return false; end if;
  insert into public.rate_limit_buckets(bucket_key, window_started_at, request_count, updated_at)
  values (p_key, now(), 1, now())
  on conflict (bucket_key) do update
    set request_count = case when now() - rate_limit_buckets.window_started_at >= make_interval(secs => p_window_seconds) then 1 else rate_limit_buckets.request_count + 1 end,
        window_started_at = case when now() - rate_limit_buckets.window_started_at >= make_interval(secs => p_window_seconds) then now() else rate_limit_buckets.window_started_at end,
        updated_at = now()
  returning request_count <= p_limit into ok;
  return ok;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
create index if not exists rate_limit_buckets_updated_at_idx on public.rate_limit_buckets(updated_at);

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  company_id uuid,
  success boolean not null,
  latency_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists operational_events_type_created_idx on public.operational_events(event_type, created_at desc);
create index if not exists operational_events_company_created_idx on public.operational_events(company_id, created_at desc);
revoke all on public.rate_limit_buckets, public.operational_events from anon, authenticated;
