create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Gaza',
  week_start_day integer not null default 6 check (week_start_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  telegram_chat_id bigint unique,
  telegram_user_id bigint unique,
  status text not null default 'pending' check (status in ('pending', 'linked', 'revoked')),
  code_hash text,
  code_expires_at timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.planner_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  original_text text,
  item_type text not null check (item_type in ('task', 'appointment', 'note')),
  item_date date,
  item_time time,
  block text not null default 'unsorted' check (block in ('morning', 'afternoon', 'evening', 'unsorted', 'none')),
  bucket text not null default 'inbox' check (bucket in ('weekly_spread', 'inbox', 'future_notes')),
  status text not null default 'active' check (status in ('active', 'completed', 'deleted')),
  source text not null default 'web' check (source in ('web', 'telegram')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  note_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create table public.reminder_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('evening_planning', 'morning_check_in', 'weekly_reset')),
  local_time time not null,
  day_of_week integer check (day_of_week between 0 and 6),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reminder_type)
);

create table public.reminder_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  reminder_definition_id uuid not null references public.reminder_definitions(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reminder_definition_id, scheduled_for)
);

create index planner_items_user_date_status_idx
  on public.planner_items (user_id, item_date, status);

create index planner_items_user_bucket_status_idx
  on public.planner_items (user_id, bucket, status);

create index reminder_definitions_enabled_local_time_idx
  on public.reminder_definitions (enabled, local_time);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger telegram_links_set_updated_at
  before update on public.telegram_links
  for each row execute function public.set_updated_at();

create trigger planner_items_set_updated_at
  before update on public.planner_items
  for each row execute function public.set_updated_at();

create trigger weekly_notes_set_updated_at
  before update on public.weekly_notes
  for each row execute function public.set_updated_at();

create trigger reminder_definitions_set_updated_at
  before update on public.reminder_definitions
  for each row execute function public.set_updated_at();

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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.telegram_links enable row level security;
alter table public.planner_items enable row level security;
alter table public.weekly_notes enable row level security;
alter table public.reminder_definitions enable row level security;
alter table public.reminder_delivery_logs enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "telegram_links_manage_own"
  on public.telegram_links for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "planner_items_manage_own"
  on public.planner_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "weekly_notes_manage_own"
  on public.weekly_notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reminder_definitions_manage_own"
  on public.reminder_definitions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reminder_delivery_logs_select_own"
  on public.reminder_delivery_logs for select
  using (
    exists (
      select 1
      from public.reminder_definitions
      where reminder_definitions.id = reminder_delivery_logs.reminder_definition_id
        and reminder_definitions.user_id = auth.uid()
    )
  );
