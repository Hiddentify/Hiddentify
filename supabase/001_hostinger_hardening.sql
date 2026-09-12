begin;

create unique index if not exists idx_players_session_name_ci
  on public.players (session_id, lower(name));

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

commit;
