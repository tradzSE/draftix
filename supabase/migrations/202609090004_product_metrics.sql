-- Extend the activity analytics introduced by 202609090001 and
-- 202609090002. This migration is intentionally additive: existing draft and
-- tournament events, counters, and admin response fields remain untouched.

alter table public.draftix_activity_events
  drop constraint if exists draftix_activity_events_event_type_check;

alter table public.draftix_activity_events
  add constraint draftix_activity_events_event_type_check check (event_type in (
    'draft_room_created',
    'draft_opponent_joined',
    'draft_started',
    'draft_room_completed',
    'tournament_created',
    'team_balance_generated',
    'team_balance_copied'
  ));

create or replace function public.draftix_record_product_event(
  p_event_type text,
  p_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_event_type not in ('team_balance_generated', 'team_balance_copied') then
    raise exception 'Unknown product event' using errcode = '22023';
  end if;
  if p_source_id is null then
    raise exception 'Event identifier required' using errcode = '22023';
  end if;

  insert into public.draftix_activity_events(event_type, source_id, occurred_at)
  values (p_event_type, p_source_id, now())
  on conflict (event_type, source_id) do nothing;
end $$;

revoke all on function public.draftix_record_product_event(text, uuid) from public;
grant execute on function public.draftix_record_product_event(text, uuid) to anon, authenticated;

-- Decorate the admin response created by the prior funnel migration. Renaming
-- once preserves that implementation and keeps this migration safe to rerun.
do $$
begin
  if to_regprocedure('public.draftix_admin_stats_product_base(text)') is null then
    alter function public.draftix_admin_stats(text) rename to draftix_admin_stats_product_base;
  end if;
end $$;

revoke all on function public.draftix_admin_stats_product_base(text) from anon, authenticated;

create or replace function public.draftix_admin_stats(p_token text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base jsonb;
begin
  base := public.draftix_admin_stats_product_base(p_token)::jsonb;

  return (base || jsonb_build_object(
    'productMetrics', jsonb_build_object(
      'teamBalancer', jsonb_build_object(
        'generatedToday', (select count(*) from draftix_activity_events where event_type = 'team_balance_generated' and occurred_at >= current_date),
        'generated7d', (select count(*) from draftix_activity_events where event_type = 'team_balance_generated' and occurred_at >= current_date - 6),
        'generated30d', (select count(*) from draftix_activity_events where event_type = 'team_balance_generated' and occurred_at >= current_date - 29),
        'allTimeGenerated', (select count(*) from draftix_activity_events where event_type = 'team_balance_generated'),
        'copied7d', (select count(*) from draftix_activity_events where event_type = 'team_balance_copied' and occurred_at >= current_date - 6),
        'allTimeCopied', (select count(*) from draftix_activity_events where event_type = 'team_balance_copied')
      ),
      'bracketMaker', jsonb_build_object(
        'visitors7d', (select count(distinct visitor) from site_pageviews where day >= current_date - 6 and path in ('/tournaments', '/tournaments/')),
        'createdToday', (select count(*) from draftix_activity_events where event_type = 'tournament_created' and occurred_at >= current_date),
        'created7d', (select count(*) from draftix_activity_events where event_type = 'tournament_created' and occurred_at >= current_date - 6),
        'created30d', (select count(*) from draftix_activity_events where event_type = 'tournament_created' and occurred_at >= current_date - 29),
        'allTimeCreated', (select count(*) from draftix_activity_events where event_type = 'tournament_created')
      )
    )
  ))::json;
end $$;

grant execute on function public.draftix_admin_stats(text) to anon;

notify pgrst, 'reload schema';
