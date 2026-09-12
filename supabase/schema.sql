begin;

create table if not exists public.game_sessions (
  id text primary key,
  code text not null unique,
  status text not null default 'lobby',
  phase integer not null default 0,
  case_json text,
  killer_count integer not null default 1,
  game_mode text not null default 'detective',
  host_player_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.case_history (
  id text primary key,
  fingerprint text not null,
  setting text not null,
  method text not null,
  twist text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_case_history_created_at
  on public.case_history (created_at);

create table if not exists public.accounts (
  id text primary key,
  platform_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null,
  username_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_accounts_platform_user_id
  on public.accounts (platform_user_id);

create table if not exists public.players (
  id text primary key,
  session_id text not null references public.game_sessions(id) on delete cascade,
  account_id text references public.accounts(id) on delete set null,
  name text not null,
  token_hash text not null unique,
  is_host integer not null default 0,
  role_index integer,
  accusation text,
  created_at timestamptz not null default now()
);

create index if not exists idx_players_session_id
  on public.players (session_id);
create unique index if not exists idx_players_session_name_ci
  on public.players (session_id, lower(name));
create unique index if not exists idx_players_session_account
  on public.players (session_id, account_id);

create or replace function public.enforce_hiddentify_room_join()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  room_status text;
  player_total integer;
begin
  select status into room_status
  from public.game_sessions
  where id = new.session_id
  for update;

  if room_status is null then
    raise exception 'hiddentify_room_not_found';
  end if;
  if room_status <> 'lobby' then
    raise exception 'hiddentify_room_already_started';
  end if;

  select count(*) into player_total
  from public.players
  where session_id = new.session_id;

  if player_total >= 10 then
    raise exception 'hiddentify_room_capacity_reached';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_hiddentify_room_join on public.players;
create trigger enforce_hiddentify_room_join
before insert on public.players
for each row execute function public.enforce_hiddentify_room_join();

alter table public.game_sessions
  drop constraint if exists game_sessions_host_player_id_fkey;
alter table public.game_sessions
  add constraint game_sessions_host_player_id_fkey
  foreign key (host_player_id) references public.players(id) on delete set null
  deferrable initially deferred;

create table if not exists public.player_actions (
  id text primary key,
  session_id text not null references public.game_sessions(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  phase integer not null,
  action_type text not null,
  target_player_id text references public.players(id) on delete set null,
  result text not null,
  public_effect text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_player_actions_round
  on public.player_actions (session_id, player_id, phase);
create index if not exists idx_player_actions_session_phase
  on public.player_actions (session_id, phase);

create table if not exists public.ability_uses (
  id text primary key,
  session_id text not null references public.game_sessions(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  ability_id text not null,
  target_player_id text references public.players(id) on delete set null,
  result text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ability_uses_session_player
  on public.ability_uses (session_id, player_id);

create table if not exists public.interrogations (
  id text primary key,
  session_id text not null references public.game_sessions(id) on delete cascade,
  initiator_player_id text not null references public.players(id) on delete cascade,
  invitee_player_id text not null references public.players(id) on delete cascade,
  status text not null default 'pending',
  invite_expires_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_interrogations_session_initiator
  on public.interrogations (session_id, initiator_player_id);
create index if not exists idx_interrogations_session_status
  on public.interrogations (session_id, status);

create table if not exists public.interrogation_messages (
  id text primary key,
  interrogation_id text not null references public.interrogations(id) on delete cascade,
  sender_player_id text not null references public.players(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_interrogation_messages_channel_time
  on public.interrogation_messages (interrogation_id, created_at);

alter table public.game_sessions enable row level security;
alter table public.case_history enable row level security;
alter table public.accounts enable row level security;
alter table public.players enable row level security;
alter table public.player_actions enable row level security;
alter table public.ability_uses enable row level security;
alter table public.interrogations enable row level security;
alter table public.interrogation_messages enable row level security;

commit;
