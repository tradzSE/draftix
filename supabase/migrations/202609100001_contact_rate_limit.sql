-- Limit contact delivery attempts by client IP: one per minute and
-- five per 24 hours. Attempts are recorded before delivery to prevent
-- retries against a failed provider from bypassing the limit.

create schema if not exists private;

create table if not exists private.draftix_contact_rate_limits (
  ip inet not null,
  submitted_at timestamptz not null default clock_timestamp()
);

create index if not exists draftix_contact_rate_limits_lookup_idx
  on private.draftix_contact_rate_limits (ip, submitted_at desc);

revoke all on table private.draftix_contact_rate_limits from public, anon, authenticated;

create or replace function public.draftix_consume_contact_rate_limit(p_ip inet)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  daily_count integer;
  oldest_daily_submission timestamptz;
  latest_submission timestamptz;
  retry_after integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if p_ip is null then
    raise exception 'Client IP required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('contact:' || p_ip::text, 0)
  );

  select count(*), min(submitted_at), max(submitted_at)
  into daily_count, oldest_daily_submission, latest_submission
  from private.draftix_contact_rate_limits
  where ip = p_ip
    and submitted_at >= v_now - interval '24 hours';

  if daily_count >= 5 then
    retry_after := greatest(
      1,
      ceil(extract(epoch from (oldest_daily_submission + interval '24 hours' - v_now))::numeric)::integer
    );
    return jsonb_build_object('allowed', false, 'retryAfter', retry_after);
  end if;

  if latest_submission is not null
    and latest_submission >= v_now - interval '1 minute' then
    retry_after := greatest(
      1,
      ceil(extract(epoch from (latest_submission + interval '1 minute' - v_now))::numeric)::integer
    );
    return jsonb_build_object('allowed', false, 'retryAfter', retry_after);
  end if;

  insert into private.draftix_contact_rate_limits (ip, submitted_at)
  values (p_ip, v_now);

  if random() < 0.02 then
    delete from private.draftix_contact_rate_limits
        where submitted_at < v_now - interval '48 hours';
  end if;

  return jsonb_build_object('allowed', true);
end;
$$;

revoke all on function public.draftix_consume_contact_rate_limit(inet) from public, anon, authenticated;
grant execute on function public.draftix_consume_contact_rate_limit(inet) to service_role;
