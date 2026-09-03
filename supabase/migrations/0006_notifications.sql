create type notification_channel as enum ('in_app','push','email','sms');
create type notification_delivery_status as enum ('pending','sent','delivered','failed','read');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null,
  entity_type text,
  entity_id uuid,
  action_url text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_not_blank check (length(trim(title)) > 0),
  constraint notifications_body_not_blank check (length(trim(body)) > 0),
  constraint notifications_type_not_blank check (length(trim(type)) > 0)
);

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel notification_channel not null,
  notification_type text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id,channel,notification_type),
  constraint notification_preferences_type_not_blank check (length(trim(notification_type)) > 0)
);

create table public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null,
  token text not null,
  app_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_devices_platform_not_blank check (length(trim(platform)) > 0),
  constraint notification_devices_token_not_blank check (length(trim(token)) > 0),
  unique (platform,token)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel notification_channel not null,
  device_id uuid references public.notification_devices(id) on delete set null,
  status notification_delivery_status not null default 'pending',
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_message text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_attempts_check check (attempts >= 0),
  constraint notification_deliveries_timing_check check (delivered_at is null or sent_at is null or delivered_at >= sent_at)
);

create index idx_notifications_recipient_created on public.notifications(recipient_id,created_at desc);
create index idx_notifications_company_created on public.notifications(company_id,created_at desc);
create index idx_notifications_unread on public.notifications(recipient_id,created_at desc) where read_at is null;
create index idx_notification_preferences_user on public.notification_preferences(user_id);
create index idx_notification_devices_user on public.notification_devices(user_id,last_seen_at desc);
create index idx_notification_deliveries_notification on public.notification_deliveries(notification_id,created_at desc);
create index idx_notification_deliveries_pending on public.notification_deliveries(status,created_at) where status='pending';

create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();
create trigger notification_devices_set_updated_at before update on public.notification_devices for each row execute function public.set_updated_at();
create trigger notification_deliveries_set_updated_at before update on public.notification_deliveries for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_devices enable row level security;
alter table public.notification_deliveries enable row level security;

create policy notifications_select_own on public.notifications for select to authenticated using (recipient_id=auth.uid() and company_id = any(public.current_company_id_array()));
create policy notification_preferences_select_own on public.notification_preferences for select to authenticated using (user_id=auth.uid());
create policy notification_devices_select_own on public.notification_devices for select to authenticated using (user_id=auth.uid());
create policy notification_deliveries_select_recipient on public.notification_deliveries for select to authenticated using (exists (select 1 from public.notifications n where n.id=notification_deliveries.notification_id and n.recipient_id=auth.uid()));

comment on table public.notifications is 'Canonical in-app notification records owned by a recipient.';
comment on table public.notification_preferences is 'Per-user notification channel and type preferences.';
comment on table public.notification_devices is 'Registered web, desktop, and mobile push endpoints.';
comment on table public.notification_deliveries is 'Per-channel delivery lifecycle and provider tracking.';