create table if not exists public.site_pageviews (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  day date not null default current_date,
  path text not null,
  ref_host text,
  visitor uuid not null
);

create index if not exists site_pageviews_day_idx
  on public.site_pageviews (day);

create index if not exists site_pageviews_visitor_idx
  on public.site_pageviews (visitor);

alter table public.site_pageviews enable row level security;

drop policy if exists "anon can record pageviews" on public.site_pageviews;
create policy "anon can record pageviews"
  on public.site_pageviews for insert
  to anon
  with check (true);

revoke all on table public.site_pageviews from public, anon, authenticated;
grant insert on table public.site_pageviews to anon;

notify pgrst, 'reload schema';
