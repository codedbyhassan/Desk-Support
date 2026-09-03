create type public.subscription_status as enum ('trialing','active','past_due','paused','cancelled','expired');
create type public.billing_interval as enum ('monthly','yearly','custom');
create type public.payment_status as enum ('pending','succeeded','failed','refunded','cancelled');

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan_key text not null,
  status public.subscription_status not null default 'trialing',
  billing_interval public.billing_interval not null default 'monthly',
  provider text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_plan_key_not_blank check (btrim(plan_key) <> ''),
  constraint subscriptions_period_check check (current_period_end is null or current_period_start is null or current_period_end > current_period_start),
  constraint subscriptions_cancel_check check ((cancel_at_period_end = false and cancelled_at is null) or cancel_at_period_end = true or cancelled_at is not null)
);

create unique index subscriptions_one_current_per_company_idx
  on public.subscriptions(company_id)
  where status in ('trialing','active','past_due','paused');
create unique index subscriptions_provider_id_idx
  on public.subscriptions(provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;
create index subscriptions_company_status_idx on public.subscriptions(company_id, status);
create index subscriptions_period_end_idx on public.subscriptions(current_period_end);

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint subscription_events_type_not_blank check (btrim(event_type) <> '')
);
create unique index subscription_events_provider_event_idx
  on public.subscription_events(provider_event_id)
  where provider_event_id is not null;
create index subscription_events_subscription_occurred_idx
  on public.subscription_events(subscription_id, occurred_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text,
  provider_payment_id text,
  amount numeric(14,2) not null,
  currency char(3) not null,
  status public.payment_status not null default 'pending',
  payment_method text,
  paid_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amount_nonnegative check (amount >= 0),
  constraint payments_currency_format check (currency = upper(currency) and currency ~ '^[A-Z]{3}$'),
  constraint payments_refund_check check (refunded_at is null or status = 'refunded')
);
create unique index payments_provider_id_idx
  on public.payments(provider, provider_payment_id)
  where provider is not null and provider_payment_id is not null;
create index payments_company_created_idx on public.payments(company_id, created_at desc);
create index payments_subscription_created_idx on public.payments(subscription_id, created_at desc);
create index payments_status_idx on public.payments(status);

create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.payments enable row level security;

create policy "billing_admins_select_subscriptions"
on public.subscriptions for select to authenticated
using (exists (
  select 1 from public.company_memberships m
  where m.company_id = subscriptions.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

create policy "billing_admins_insert_subscriptions"
on public.subscriptions for insert to authenticated
with check (exists (
  select 1 from public.company_memberships m
  where m.company_id = subscriptions.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

create policy "billing_admins_update_subscriptions"
on public.subscriptions for update to authenticated
using (exists (
  select 1 from public.company_memberships m
  where m.company_id = subscriptions.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
))
with check (exists (
  select 1 from public.company_memberships m
  where m.company_id = subscriptions.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

create policy "billing_admins_select_subscription_events"
on public.subscription_events for select to authenticated
using (exists (
  select 1
  from public.subscriptions s
  join public.company_memberships m on m.company_id = s.company_id
  where s.id = subscription_events.subscription_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

create policy "billing_admins_select_payments"
on public.payments for select to authenticated
using (exists (
  select 1 from public.company_memberships m
  where m.company_id = payments.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

create policy "billing_admins_insert_payments"
on public.payments for insert to authenticated
with check (exists (
  select 1 from public.company_memberships m
  where m.company_id = payments.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

create policy "billing_admins_update_payments"
on public.payments for update to authenticated
using (exists (
  select 1 from public.company_memberships m
  where m.company_id = payments.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
))
with check (exists (
  select 1 from public.company_memberships m
  where m.company_id = payments.company_id
    and m.user_id = (select auth.uid())
    and m.is_active = true
    and m.role = 'admin'
));

comment on table public.subscriptions is 'Current and historical company subscription records; billing state is not duplicated on companies.';
comment on table public.subscription_events is 'Immutable provider and lifecycle events for subscriptions.';
comment on table public.payments is 'Individual billing transactions associated with a company and, when applicable, a subscription.';
