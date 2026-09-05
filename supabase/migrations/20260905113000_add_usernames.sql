alter table public.profiles add column if not exists username text;

create or replace function public.normalize_username(value text)
returns text
language sql
immutable
as $$
  select nullif(trim(both '_' from regexp_replace(lower(coalesce(value,'')), '[^a-z0-9_]+', '_', 'g')), '');
$$;

create or replace function public.generate_profile_username()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
begin
  if new.username is null or btrim(new.username) = '' then
    base := public.normalize_username(new.full_name);
    if base is null then base := 'user'; end if;
    candidate := left(base, 24);
    while exists (select 1 from public.profiles p where p.username = candidate and p.id <> new.id) loop
      suffix := suffix + 1;
      candidate := left(base, greatest(1, 24 - length(suffix::text) - 1)) || '_' || suffix::text;
    end loop;
    new.username := candidate;
  else
    new.username := public.normalize_username(new.username);
  end if;
  if new.username is null or new.username !~ '^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])?$' then
    raise exception 'Username must be 3-30 characters and contain only lowercase letters, numbers, and underscores';
  end if;
  return new;
end;
$$;

update public.profiles set username = public.normalize_username(full_name) where username is null;

with duplicates as (
  select id, username, row_number() over (partition by username order by created_at, id) as rn
  from public.profiles where username is not null
)
update public.profiles p
set username = left(d.username, greatest(1, 24 - length(d.rn::text) - 1)) || '_' || d.rn::text
from duplicates d where p.id = d.id and d.rn > 1;

create unique index if not exists profiles_username_unique on public.profiles (lower(username));
create index if not exists profiles_username_idx on public.profiles (lower(username));

drop trigger if exists profiles_username_normalize on public.profiles;
create trigger profiles_username_normalize
before insert or update of username, full_name on public.profiles
for each row execute function public.generate_profile_username();

alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])?$');
