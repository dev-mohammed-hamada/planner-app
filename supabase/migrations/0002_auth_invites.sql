create table public.auth_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger auth_invites_set_updated_at
  before update on public.auth_invites
  for each row execute function public.set_updated_at();

alter table public.auth_invites enable row level security;
