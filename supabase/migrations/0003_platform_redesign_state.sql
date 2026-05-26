create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_calendar_view text not null default 'day' check (default_calendar_view in ('day')),
  quick_add_default_bucket text not null default 'weekly_spread' check (quick_add_default_bucket in ('weekly_spread', 'inbox', 'future_notes')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google')),
  status text not null default 'not_connected' check (status in ('not_connected', 'connected', 'error', 'revoked')),
  provider_account_email text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table public.note_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  collection_id uuid references public.note_collections(id) on delete set null,
  title text not null,
  content text not null default '',
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_status_updated_idx
  on public.notes (user_id, status, updated_at desc);

create index note_collections_user_sort_idx
  on public.note_collections (user_id, sort_order, name);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

create trigger calendar_connections_set_updated_at
  before update on public.calendar_connections
  for each row execute function public.set_updated_at();

create trigger note_collections_set_updated_at
  before update on public.note_collections
  for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.note_collections enable row level security;
alter table public.notes enable row level security;

create policy "user_preferences_manage_own"
  on public.user_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "calendar_connections_manage_own"
  on public.calendar_connections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "note_collections_manage_own"
  on public.note_collections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notes_manage_own"
  on public.notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.reminder_definitions (user_id, reminder_type, local_time, day_of_week)
  values
    (new.id, 'evening_planning', time '22:00', null),
    (new.id, 'morning_check_in', time '09:00', null),
    (new.id, 'weekly_reset', time '22:15', 5)
  on conflict (user_id, reminder_type) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.note_collections (user_id, name, sort_order)
  values (new.id, 'Future notes', 0)
  on conflict (user_id, name) do nothing;

  return new;
end;
$$;
