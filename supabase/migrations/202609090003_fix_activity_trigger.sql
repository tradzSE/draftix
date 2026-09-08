-- Hotfix for the shared activity trigger. OLD.phase must only be referenced
-- after confirming this is an UPDATE on draft_rooms; draft_players rows do
-- not have a phase column and otherwise break room creation.

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
  end if;

  if tg_table_name = 'draft_rooms' and tg_op = 'INSERT' then
    activity_type := 'draft_room_created';
    activity_source := new.id;
    event_time := new.created_at;
  elsif tg_table_name = 'draft_players' and tg_op = 'INSERT' then
    if not exists (
      select 1 from public.draft_rooms r
      where r.id = new.room_id and r.host_id <> new.user_id
    ) then
      return new;
    end if;
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

-- Keep the core room action visible to the authenticated role. PostgREST
-- reports a misleading 404 when a function exists but is absent from the
-- active role's schema cache.
grant usage on schema public to authenticated;
grant execute on function public.draftix_action(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
