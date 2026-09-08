-- Add durable, room-level funnel milestones without retaining room content.

alter table public.draftix_activity_events
  drop constraint if exists draftix_activity_events_event_type_check;

alter table public.draftix_activity_events
  add constraint draftix_activity_events_event_type_check check (event_type in (
    'draft_room_created',
    'draft_opponent_joined',
    'draft_started',
    'draft_room_completed',
    'tournament_created'
  ));

create table if not exists public.draftix_public_stats_daily (
  day date not null,
  patch text not null,
  metric text not null check (metric in ('draft_completed', 'agent_banned', 'map_banned', 'map_selected')),
  item_id text not null,
  item_name text not null,
  total bigint not null default 0 check (total >= 0),
  primary key (day, patch, metric, item_id)
);

create table if not exists public.draftix_public_stats_processed (
  source_id uuid primary key,
  processed_at timestamptz not null default now()
);

create index if not exists draftix_public_stats_metric_day_idx
  on public.draftix_public_stats_daily (metric, day desc);

alter table public.draftix_public_stats_daily enable row level security;
alter table public.draftix_public_stats_processed enable row level security;
revoke all on table public.draftix_public_stats_daily from anon, authenticated;
revoke all on table public.draftix_public_stats_processed from anon, authenticated;

create or replace function public.draftix_record_completed_aggregate(p_room public.draft_rooms)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  accepted uuid;
  patch_name text := left(coalesce(nullif(p_room.catalog->>'patch', ''), 'unknown'), 80);
begin
  insert into public.draftix_public_stats_processed(source_id)
  values (p_room.id)
  on conflict (source_id) do nothing
  returning source_id into accepted;

  if accepted is null then return; end if;

  insert into public.draftix_public_stats_daily(day, patch, metric, item_id, item_name, total)
  values (current_date, patch_name, 'draft_completed', 'all', 'Completed drafts', 1)
  on conflict (day, patch, metric, item_id)
  do update set total = draftix_public_stats_daily.total + 1;

  insert into public.draftix_public_stats_daily(day, patch, metric, item_id, item_name, total)
  select current_date, patch_name, 'agent_banned', ban_id,
    coalesce((select agent->>'name' from jsonb_array_elements(coalesce(p_room.catalog->'agents', '[]'::jsonb)) agent where agent->>'uuid' = ban_id limit 1), 'Unknown agent'), 1
  from unnest(p_room.agent_bans) ban_id
  on conflict (day, patch, metric, item_id)
  do update set total = draftix_public_stats_daily.total + 1;

  insert into public.draftix_public_stats_daily(day, patch, metric, item_id, item_name, total)
  select current_date, patch_name, 'map_banned', ban_id,
    coalesce((select map->>'name' from jsonb_array_elements(coalesce(p_room.catalog->'maps', '[]'::jsonb)) map where map->>'uuid' = ban_id limit 1), 'Unknown map'), 1
  from unnest(p_room.map_bans) ban_id
  on conflict (day, patch, metric, item_id)
  do update set total = draftix_public_stats_daily.total + 1;

  if p_room.selected_map is not null and coalesce(p_room.selected_map->>'uuid', '') <> '' then
    insert into public.draftix_public_stats_daily(day, patch, metric, item_id, item_name, total)
    values (current_date, patch_name, 'map_selected', p_room.selected_map->>'uuid', coalesce(p_room.selected_map->>'name', 'Unknown map'), 1)
    on conflict (day, patch, metric, item_id)
    do update set total = draftix_public_stats_daily.total + 1;
  end if;
end $$;

revoke all on function public.draftix_record_completed_aggregate(public.draft_rooms) from public, anon, authenticated;

create or replace function public.draftix_track_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  activity_type text;
  activity_source uuid;
  event_time timestamptz;
begin
  if current_setting('draftix.skip_activity', true) = 'true' then
    return new;
  end if;

  if tg_table_name = 'draft_rooms' and tg_op = 'UPDATE' then
    if old.phase = 'lobby' and new.phase <> 'lobby' then
      insert into public.draftix_activity_events (event_type, source_id, occurred_at)
      values ('draft_started', new.id, now())
      on conflict (event_type, source_id) do nothing;
    end if;

    if old.phase is distinct from 'done' and new.phase = 'done' then
      insert into public.draftix_activity_events (event_type, source_id, occurred_at)
      values ('draft_room_completed', new.id, now())
      on conflict (event_type, source_id) do nothing;
      perform public.draftix_record_completed_aggregate(new);
    end if;

    return new;
  elsif tg_table_name = 'draft_rooms' and tg_op = 'INSERT' then
    activity_type := 'draft_room_created';
    activity_source := new.id;
    event_time := new.created_at;
  elsif tg_table_name = 'draft_players' and tg_op = 'INSERT'
    and exists (
      select 1 from public.draft_rooms r
      where r.id = new.room_id and r.host_id <> new.user_id
    ) then
    activity_type := 'draft_opponent_joined';
    activity_source := new.room_id;
    event_time := new.joined_at;
  elsif tg_table_name = 'tournaments' and tg_op = 'INSERT' then
    activity_type := 'tournament_created';
    activity_source := new.id;
    event_time := new.created_at;
  else
    return new;
  end if;

  insert into public.draftix_activity_events (event_type, source_id, occurred_at)
  values (activity_type, activity_source, coalesce(event_time, now()))
  on conflict (event_type, source_id) do nothing;

  return new;
end $$;

drop trigger if exists draftix_track_opponent_joined on public.draft_players;
create trigger draftix_track_opponent_joined
after insert on public.draft_players
for each row execute function public.draftix_track_activity();

drop trigger if exists draftix_track_room_completed on public.draft_rooms;
drop trigger if exists draftix_track_room_started on public.draft_rooms;
drop trigger if exists draftix_track_room_lifecycle on public.draft_rooms;
create trigger draftix_track_room_lifecycle
after update of phase on public.draft_rooms
for each row execute function public.draftix_track_activity();

-- Best-effort backfill for rooms that still exist. Historical timestamps for
-- already-started rooms use updated_at because the schema did not retain the
-- original transition time before this migration.
insert into public.draftix_activity_events (event_type, source_id, occurred_at)
select 'draft_opponent_joined', r.id, min(p.joined_at)
from public.draft_rooms r
join public.draft_players p on p.room_id = r.id and p.user_id <> r.host_id
group by r.id
on conflict (event_type, source_id) do nothing;

-- Aggregate any completed rooms still present when this migration is applied.
select public.draftix_record_completed_aggregate(r)
from public.draft_rooms r
where r.phase = 'done';

insert into public.draftix_activity_events (event_type, source_id, occurred_at)
select 'draft_started', id, updated_at
from public.draft_rooms
where phase <> 'lobby'
on conflict (event_type, source_id) do nothing;

-- Preserve the already-deployed stats implementation and decorate its result
-- with funnel windows. This keeps the existing dashboard contract intact.
do $$
begin
  if to_regprocedure('public.draftix_admin_stats_base(text)') is null then
    alter function public.draftix_admin_stats(text) rename to draftix_admin_stats_base;
  end if;
end $$;

revoke all on function public.draftix_admin_stats_base(text) from anon, authenticated;

create or replace function public.draftix_admin_stats(p_token text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base jsonb;
begin
  base := public.draftix_admin_stats_base(p_token)::jsonb;

  base := jsonb_set(
    base,
    '{rooms}',
    coalesce(base->'rooms', '{}'::jsonb) || jsonb_build_object(
      'completed30d', (select count(*) from draftix_activity_events where event_type = 'draft_room_completed' and occurred_at >= current_date - 29)
    )
  );

  return (base || jsonb_build_object(
    'funnel', jsonb_build_object(
      'today', jsonb_build_object(
        'homepage', (select count(distinct visitor) from site_pageviews where day = current_date and path = '/'),
        'createDraft', (select count(distinct visitor) from site_pageviews where day = current_date and path in ('/draft', '/draft/')),
        'roomCreated', (select count(*) from draftix_activity_events where event_type = 'draft_room_created' and occurred_at >= current_date),
        'opponentJoined', (select count(*) from draftix_activity_events where event_type = 'draft_opponent_joined' and occurred_at >= current_date),
        'draftStarted', (select count(*) from draftix_activity_events where event_type = 'draft_started' and occurred_at >= current_date),
        'draftCompleted', (select count(*) from draftix_activity_events where event_type = 'draft_room_completed' and occurred_at >= current_date)
      ),
      'last7', jsonb_build_object(
        'homepage', (select count(distinct visitor) from site_pageviews where day >= current_date - 6 and path = '/'),
        'createDraft', (select count(distinct visitor) from site_pageviews where day >= current_date - 6 and path in ('/draft', '/draft/')),
        'roomCreated', (select count(*) from draftix_activity_events where event_type = 'draft_room_created' and occurred_at >= current_date - 6),
        'opponentJoined', (select count(*) from draftix_activity_events where event_type = 'draft_opponent_joined' and occurred_at >= current_date - 6),
        'draftStarted', (select count(*) from draftix_activity_events where event_type = 'draft_started' and occurred_at >= current_date - 6),
        'draftCompleted', (select count(*) from draftix_activity_events where event_type = 'draft_room_completed' and occurred_at >= current_date - 6)
      ),
      'last30', jsonb_build_object(
        'homepage', (select count(distinct visitor) from site_pageviews where day >= current_date - 29 and path = '/'),
        'createDraft', (select count(distinct visitor) from site_pageviews where day >= current_date - 29 and path in ('/draft', '/draft/')),
        'roomCreated', (select count(*) from draftix_activity_events where event_type = 'draft_room_created' and occurred_at >= current_date - 29),
        'opponentJoined', (select count(*) from draftix_activity_events where event_type = 'draft_opponent_joined' and occurred_at >= current_date - 29),
        'draftStarted', (select count(*) from draftix_activity_events where event_type = 'draft_started' and occurred_at >= current_date - 29),
        'draftCompleted', (select count(*) from draftix_activity_events where event_type = 'draft_room_completed' and occurred_at >= current_date - 29)
      ),
      'allTime', jsonb_build_object(
        'homepage', (select count(distinct visitor) from site_pageviews where path = '/'),
        'createDraft', (select count(distinct visitor) from site_pageviews where path in ('/draft', '/draft/')),
        'roomCreated', (select count(*) from draftix_activity_events where event_type = 'draft_room_created'),
        'opponentJoined', (select count(*) from draftix_activity_events where event_type = 'draft_opponent_joined'),
        'draftStarted', (select count(*) from draftix_activity_events where event_type = 'draft_started'),
        'draftCompleted', (select count(*) from draftix_activity_events where event_type = 'draft_room_completed')
      )
    )
  ))::json;
end $$;

grant execute on function public.draftix_admin_stats(text) to anon;

create or replace function public.draftix_public_draft_stats(p_days integer default 30)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  days_count integer := least(365, greatest(1, coalesce(p_days, 30)));
  completed bigint;
  aggregate_sample bigint;
begin
  select count(*) into completed
  from draftix_activity_events
  where event_type = 'draft_room_completed' and occurred_at >= current_date - (days_count - 1);

  select coalesce(sum(total), 0) into aggregate_sample
  from draftix_public_stats_daily
  where metric = 'draft_completed' and day >= current_date - (days_count - 1);

  return json_build_object(
    'days', days_count,
    'completedDrafts', completed,
    'aggregateSample', aggregate_sample,
    'topBannedAgents', coalesce((
      select json_agg(json_build_object(
        'id', ranked.item_id,
        'name', ranked.item_name,
        'bans', ranked.total,
        'banRate', case when aggregate_sample > 0 then round((ranked.total::numeric / aggregate_sample) * 100, 1) else 0 end
      ) order by ranked.total desc)
      from (
        select item_id, max(item_name) item_name, sum(total) total
        from draftix_public_stats_daily
        where metric = 'agent_banned' and day >= current_date - (days_count - 1)
        group by item_id
        order by sum(total) desc
        limit 20
      ) ranked
    ), '[]'::json),
    'topBannedMaps', coalesce((
      select json_agg(json_build_object('id', ranked.item_id, 'name', ranked.item_name, 'bans', ranked.total) order by ranked.total desc)
      from (
        select item_id, max(item_name) item_name, sum(total) total
        from draftix_public_stats_daily
        where metric = 'map_banned' and day >= current_date - (days_count - 1)
        group by item_id
        order by sum(total) desc
        limit 20
      ) ranked
    ), '[]'::json),
    'topSelectedMaps', coalesce((
      select json_agg(json_build_object('id', ranked.item_id, 'name', ranked.item_name, 'picks', ranked.total) order by ranked.total desc)
      from (
        select item_id, max(item_name) item_name, sum(total) total
        from draftix_public_stats_daily
        where metric = 'map_selected' and day >= current_date - (days_count - 1)
        group by item_id
        order by sum(total) desc
        limit 20
      ) ranked
    ), '[]'::json),
    'patches', coalesce((
      select json_agg(json_build_object('patch', patch, 'completedDrafts', total) order by latest_day desc)
      from (
        select patch, sum(total) total, max(day) latest_day
        from draftix_public_stats_daily
        where metric = 'draft_completed' and day >= current_date - (days_count - 1)
        group by patch
      ) patch_totals
    ), '[]'::json),
    'generatedAt', now()
  );
end $$;

grant execute on function public.draftix_public_draft_stats(integer) to anon, authenticated;

notify pgrst, 'reload schema';
