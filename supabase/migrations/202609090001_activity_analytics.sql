-- Preserve product-acquisition evidence after draft rooms expire.
--
-- Draft room rows intentionally disappear after their retention window. This
-- append-only event log keeps only an event type, timestamp, and the source
-- UUID needed for de-duplication. It contains no room content, player data,
-- names, IP addresses, or visitor identifiers.

create table if not exists public.draftix_activity_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'draft_room_created',
    'draft_room_completed',
    'tournament_created'
  )),
  source_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (event_type, source_id)
);

create index if not exists draftix_activity_events_type_time_idx
  on public.draftix_activity_events (event_type, occurred_at desc);

alter table public.draftix_activity_events enable row level security;
revoke all on table public.draftix_activity_events from anon, authenticated;

create or replace function public.draftix_track_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  activity_type text;
  event_time timestamptz;
begin
  -- Format rebuilds create a temporary bracket internally. They are not a new
  -- organizer-created tournament and must not increase acquisition totals.
  if current_setting('draftix.skip_activity', true) = 'true' then
    return new;
  end if;

  if tg_table_name = 'draft_rooms' and tg_op = 'INSERT' then
    activity_type := 'draft_room_created';
    event_time := new.created_at;
  elsif tg_table_name = 'draft_rooms' and tg_op = 'UPDATE'
    and old.phase is distinct from 'done' and new.phase = 'done' then
    activity_type := 'draft_room_completed';
    event_time := now();
  elsif tg_table_name = 'tournaments' and tg_op = 'INSERT' then
    activity_type := 'tournament_created';
    event_time := new.created_at;
  else
    return new;
  end if;

  insert into public.draftix_activity_events (event_type, source_id, occurred_at)
  values (activity_type, new.id, coalesce(event_time, now()))
  on conflict (event_type, source_id) do nothing;

  return new;
end $$;

drop trigger if exists draftix_track_room_created on public.draft_rooms;
create trigger draftix_track_room_created
after insert on public.draft_rooms
for each row execute function public.draftix_track_activity();

drop trigger if exists draftix_track_room_completed on public.draft_rooms;
create trigger draftix_track_room_completed
after update of phase on public.draft_rooms
for each row execute function public.draftix_track_activity();

drop trigger if exists draftix_track_tournament_created on public.tournaments;
create trigger draftix_track_tournament_created
after insert on public.tournaments
for each row execute function public.draftix_track_activity();

-- Seed activity for records that still exist. Expired rooms are deliberately
-- not reconstructed: their content has already been deleted by design.
insert into public.draftix_activity_events (event_type, source_id, occurred_at)
select 'draft_room_created', id, created_at from public.draft_rooms
on conflict (event_type, source_id) do nothing;

insert into public.draftix_activity_events (event_type, source_id, occurred_at)
select 'draft_room_completed', id, updated_at
from public.draft_rooms
where phase = 'done'
on conflict (event_type, source_id) do nothing;

insert into public.draftix_activity_events (event_type, source_id, occurred_at)
select 'tournament_created', id, created_at from public.tournaments
on conflict (event_type, source_id) do nothing;

create or replace function public.draftix_admin_stats(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stored text;
  v_result json;
begin
  select admin_token into v_stored from draftix_admin_config where id = 1;
  if v_stored is null
     or v_stored = 'CHANGE_ME_replace_with_a_long_random_secret'
     or p_token is null
     or p_token <> v_stored then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select json_build_object(
    'today', json_build_object(
      'views', (select count(*) from site_pageviews where day = current_date),
      'visitors', (select count(distinct visitor) from site_pageviews where day = current_date)
    ),
    'last7', json_build_object(
      'views', (select count(*) from site_pageviews where day >= current_date - 6),
      'visitors', (select count(distinct visitor) from site_pageviews where day >= current_date - 6)
    ),
    'allTime', json_build_object(
      'views', (select count(*) from site_pageviews),
      'visitors', (select count(distinct visitor) from site_pageviews)
    ),
    'visitors', json_build_object(
      'returningToday', (
        select count(distinct today.visitor)
        from site_pageviews today
        where today.day = current_date
          and exists (select 1 from site_pageviews prior where prior.visitor = today.visitor and prior.day < current_date)
      ),
      'returning7d', (
        select count(distinct recent.visitor)
        from site_pageviews recent
        where recent.day >= current_date - 6
          and exists (select 1 from site_pageviews prior where prior.visitor = recent.visitor and prior.day < current_date - 6)
      )
    ),
    'daily', coalesce((
      select json_agg(json_build_object('date', d.day, 'views', coalesce(p.c, 0), 'visitors', coalesce(p.v, 0)) order by d.day)
      from (select (current_date - offs) as day from generate_series(0, 13) as offs) d
      left join (select day, count(*) c, count(distinct visitor) v from site_pageviews group by day) p on p.day = d.day
    ), '[]'::json),
    'topPages', coalesce((
      select json_agg(json_build_array(t.path, t.c))
      from (select path, count(*) c from site_pageviews group by path order by count(*) desc limit 8) t
    ), '[]'::json),
    'topReferrers', coalesce((
      select json_agg(json_build_array(t.ref_host, t.c))
      from (
        select ref_host, count(*) c from site_pageviews
        where ref_host is not null and ref_host <> ''
        group by ref_host order by count(*) desc limit 8
      ) t
    ), '[]'::json),
    'rooms', json_build_object(
      'allTimeCreated', (select count(*) from draftix_activity_events where event_type = 'draft_room_created'),
      'createdToday', (select count(*) from draftix_activity_events where event_type = 'draft_room_created' and occurred_at >= current_date),
      'created7d', (select count(*) from draftix_activity_events where event_type = 'draft_room_created' and occurred_at >= current_date - 6),
      'created30d', (select count(*) from draftix_activity_events where event_type = 'draft_room_created' and occurred_at >= current_date - 29),
      'completed', (select count(*) from draftix_activity_events where event_type = 'draft_room_completed'),
      'active', (select count(*) from draft_rooms where expires_at > now())
    ),
    'tournaments', json_build_object(
      'allTimeCreated', (select count(*) from draftix_activity_events where event_type = 'tournament_created'),
      'createdToday', (select count(*) from draftix_activity_events where event_type = 'tournament_created' and occurred_at >= current_date),
      'created7d', (select count(*) from draftix_activity_events where event_type = 'tournament_created' and occurred_at >= current_date - 6)
    )
  ) into v_result;

  return v_result;
end $$;

grant execute on function public.draftix_admin_stats(text) to anon;

-- A format edit uses the bracket generator internally. Keep that temporary
-- insert out of the tournament-created lifetime metric.
create or replace function public.draftix_update_tournament_format(
  p_slug text,
  p_token text,
  p_format text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target public.tournaments;
  generated public.tournaments;
  generated_result jsonb;
  entrant_names text[];
  requested_format text := lower(trim(coalesce(p_format, '')));
  prior_attempts timestamptz[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if requested_format not in ('single_elimination', 'double_elimination', 'round_robin', 'swiss') then
    raise exception 'Unknown tournament format';
  end if;

  select * into target from public.tournaments where slug = lower(trim(p_slug)) for update;
  if not found then raise exception 'Tournament not found'; end if;
  if not public.draftix_tournament_token_valid(target, p_token) then raise exception 'Organizer access required'; end if;
  if target.format = requested_format then return jsonb_build_object('ok', true, 'format', target.format); end if;

  select array_agg(name order by seed) into entrant_names from public.tournament_teams where tournament_id = target.id;
  select array_agg(created_at) into prior_attempts from private.draftix_tournament_create_limits where user_id = auth.uid();
  delete from private.draftix_tournament_create_limits where user_id = auth.uid();
  perform set_config('draftix.skip_activity', 'true', true);
  generated_result := public.draftix_create_tournament(target.name, entrant_names, target.best_of, requested_format);

  select * into generated from public.tournaments where slug = generated_result->>'slug' for update;
  if not found then raise exception 'Could not rebuild tournament format'; end if;

  delete from public.tournament_matches where tournament_id = target.id;
  delete from public.tournament_teams where tournament_id = target.id;
  update public.tournament_teams set tournament_id = target.id where tournament_id = generated.id;
  update public.tournament_matches set tournament_id = target.id where tournament_id = generated.id;
  update public.tournaments set format = generated.format, total_rounds = generated.total_rounds, status = 'live', updated_at = now() where id = target.id;
  delete from public.tournaments where id = generated.id;

  delete from private.draftix_tournament_create_limits where user_id = auth.uid();
  insert into private.draftix_tournament_create_limits(user_id, created_at)
  select auth.uid(), previous_time from unnest(coalesce(prior_attempts, array[]::timestamptz[])) previous_time;

  return jsonb_build_object('ok', true, 'slug', target.slug, 'format', requested_format);
end $$;

grant execute on function public.draftix_update_tournament_format(text, text, text) to authenticated;

notify pgrst, 'reload schema';
