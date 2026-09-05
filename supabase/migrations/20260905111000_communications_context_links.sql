alter table public.calls add column if not exists ticket_id uuid references public.tickets(id) on delete set null;
alter table public.calls add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.calls add column if not exists team_id uuid references public.teams(id) on delete set null;
create index if not exists calls_ticket_idx on public.calls(ticket_id);
create index if not exists calls_asset_idx on public.calls(asset_id);
create index if not exists calls_team_idx on public.calls(team_id);
