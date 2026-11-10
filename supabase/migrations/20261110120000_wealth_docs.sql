-- Wealth documents, separate from public.dt_docs.
-- Do not change dt_docs policies. Health keeps its current access.
--
-- Before applying:
-- 1. Create Daniel's Supabase Auth user (no public sign-up).
-- 2. Replace every <DANIEL_USER_ID> below with that user's auth.users id.
-- 3. In Authentication settings, turn off public sign-ups.
-- This file is not applied by the app.

do $guard$
begin
  if '<DANIEL_USER_ID>' like '%DANIEL_USER_ID%' then
    raise exception 'Replace <DANIEL_USER_ID> with Daniel''s auth.users id before applying this migration';
  end if;
end
$guard$;

create table if not exists public.wealth_docs (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.wealth_docs is
  'Private wealth docs. ids: budget, goals, networth, bills, investments, insurance, expenses. Same id+data shape as dt_docs, without a collection column.';

alter table public.wealth_docs enable row level security;

revoke all on table public.wealth_docs from public;
revoke all on table public.wealth_docs from anon;
grant select, insert, update, delete on table public.wealth_docs to authenticated;

drop policy if exists wealth_docs_select on public.wealth_docs;
drop policy if exists wealth_docs_insert on public.wealth_docs;
drop policy if exists wealth_docs_update on public.wealth_docs;
drop policy if exists wealth_docs_delete on public.wealth_docs;

create policy wealth_docs_select on public.wealth_docs
  for select to authenticated
  using (auth.uid() = '<DANIEL_USER_ID>'::uuid);

create policy wealth_docs_insert on public.wealth_docs
  for insert to authenticated
  with check (auth.uid() = '<DANIEL_USER_ID>'::uuid);

create policy wealth_docs_update on public.wealth_docs
  for update to authenticated
  using (auth.uid() = '<DANIEL_USER_ID>'::uuid)
  with check (auth.uid() = '<DANIEL_USER_ID>'::uuid);

create policy wealth_docs_delete on public.wealth_docs
  for delete to authenticated
  using (auth.uid() = '<DANIEL_USER_ID>'::uuid);
