-- Yappers Cup (yappers-cup/ folder). Applied to the daniel-training project on 2026-11-22.

-- Supporter / partner sign-ups (insert-only from the site)
create table if not exists public.yappers_cup_signups (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  mobile text check (char_length(mobile) <= 40),
  role text not null check (role in ('player','supporter','partner')),
  team_pref text check (team_pref in ('mudguts','pissants','either')),
  jersey_size text check (jersey_size in ('S','M','L','XL','XXL')),
  company text check (char_length(company) <= 160),
  message text check (char_length(message) <= 1000)
);
alter table public.yappers_cup_signups enable row level security;
create policy "public can sign up" on public.yappers_cup_signups for insert to anon with check (true);
grant insert on public.yappers_cup_signups to anon;
revoke select, update, delete on public.yappers_cup_signups from anon;

-- Positions on the ground. No direct access; the site uses yc_board() and yc_claim().
create table if not exists public.yc_positions (
  position_id text primary key,
  team text not null check (team in ('mudguts','pissants')),
  pos text not null,
  tier text not null check (tier in ('key','field','bench')),
  display_name text not null check (char_length(display_name) between 1 and 16),
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null,
  mobile text,
  jersey_size text check (jersey_size in ('S','M','L','XL','XXL')),
  amount integer not null check (amount between 1 and 100000),
  status text not null default 'pending' check (status in ('pending','confirmed')),
  created_at timestamptz not null default now()
);
alter table public.yc_positions enable row level security;
revoke all on public.yc_positions from anon, authenticated;

create or replace function public.yc_claim(p_position text, p_name text, p_full_name text, p_email text, p_mobile text, p_size text, p_amount integer)
returns json language plpgsql security definer set search_path = public as $$
declare
  tm text; code text; t text; mn int;
  nm text := upper(left(trim(coalesce(p_name,'')), 16));
  fn text := left(trim(coalesce(p_full_name,'')), 120);
  em text := lower(trim(coalesce(p_email,'')));
  existing text;
begin
  if p_position !~ '^(mudguts|pissants)-(FB|BPL|BPR|CHB|HBFL|HBFR|C|WL|WR|CHF|HFFL|HFFR|FF|FPL|FPR|RK|RR|R|I1|I2|I3|I4)$' then
    return json_build_object('ok', false, 'error', 'That position doesn''t exist.'); end if;
  tm := split_part(p_position, '-', 1); code := split_part(p_position, '-', 2);
  t := case when code in ('FF','CHF','RK','C','CHB','FB') then 'key' when code like 'I_' then 'bench' else 'field' end;
  mn := case t when 'key' then 100 when 'field' then 50 else 25 end;
  if fn = '' then return json_build_object('ok', false, 'error', 'Add your full name.'); end if;
  if nm = '' then return json_build_object('ok', false, 'error', 'Add the name for the back of your guernsey.'); end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('ok', false, 'error', 'Add a valid email so we can match your donation.'); end if;
  if p_size is null or p_size not in ('S','M','L','XL','XXL') then return json_build_object('ok', false, 'error', 'Pick a guernsey size.'); end if;
  if p_amount is null or p_amount < mn then return json_build_object('ok', false, 'error', 'This position starts at $' || mn || '.'); end if;
  if p_amount > 100000 then return json_build_object('ok', false, 'error', 'Check the amount.'); end if;
  delete from yc_positions where status = 'pending' and created_at <= now() - interval '7 days';
  select position_id into existing from yc_positions where email = em limit 1;
  if existing is not null then
    return json_build_object('ok', false, 'error', 'That email already has a spot on the team sheet. One position per player.'); end if;
  begin
    insert into yc_positions (position_id, team, pos, tier, display_name, full_name, email, mobile, jersey_size, amount)
    values (p_position, tm, code, t, nm, fn, em, nullif(left(trim(coalesce(p_mobile,'')),40),''), p_size, p_amount);
  exception when unique_violation then
    return json_build_object('ok', false, 'error', 'Someone just grabbed that position. Pick another one.');
  end;
  return json_build_object('ok', true, 'position', p_position, 'tier', t, 'amount', p_amount, 'name', nm);
end $$;

create or replace function public.yc_board()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'positions', coalesce((select json_agg(json_build_object('id', position_id, 'status', status, 'name', display_name))
                  from yc_positions where status = 'confirmed' or created_at > now() - interval '7 days'), '[]'::json),
    'raised', coalesce((select sum(amount) from yc_positions where status = 'confirmed'), 0),
    'pledged', coalesce((select sum(amount) from yc_positions where status = 'confirmed' or created_at > now() - interval '7 days'), 0));
$$;

revoke all on function public.yc_claim(text,text,text,text,text,text,integer) from public;
revoke all on function public.yc_board() from public;
grant execute on function public.yc_claim(text,text,text,text,text,text,integer) to anon;
grant execute on function public.yc_board() to anon;

-- 2026-11-22 (later): every position $25, no guernsey size, terms acceptance recorded
alter table public.yc_positions add column if not exists terms_accepted_at timestamptz;
alter table public.yc_positions add column if not exists terms_version text;
alter table public.yappers_cup_signups add column if not exists terms_accepted_at timestamptz;
alter table public.yappers_cup_signups add column if not exists terms_version text;

drop function if exists public.yc_claim(text,text,text,text,text,text,integer);

create or replace function public.yc_claim(p_position text, p_name text, p_full_name text, p_email text, p_mobile text, p_amount integer, p_terms boolean, p_terms_version text)
returns json language plpgsql security definer set search_path = public as $$
declare
  tm text; code text; t text; mn int := 25;
  nm text := upper(left(trim(coalesce(p_name,'')), 16));
  fn text := left(trim(coalesce(p_full_name,'')), 120);
  em text := lower(trim(coalesce(p_email,'')));
  existing text;
begin
  if p_position !~ '^(mudguts|pissants)-(FB|BPL|BPR|CHB|HBFL|HBFR|C|WL|WR|CHF|HFFL|HFFR|FF|FPL|FPR|RK|RR|R|I1|I2|I3|I4)$' then
    return json_build_object('ok', false, 'error', 'That position doesn''t exist.'); end if;
  tm := split_part(p_position, '-', 1); code := split_part(p_position, '-', 2);
  t := case when code in ('FF','CHF','RK','C','CHB','FB') then 'key' when code like 'I_' then 'bench' else 'field' end;
  if fn = '' then return json_build_object('ok', false, 'error', 'Add your full name.'); end if;
  if nm = '' then return json_build_object('ok', false, 'error', 'Add the name for the back of your guernsey.'); end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('ok', false, 'error', 'Add a valid email so we can match your donation.'); end if;
  if p_amount is null or p_amount < mn then return json_build_object('ok', false, 'error', 'Every position starts at $' || mn || '.'); end if;
  if p_amount > 100000 then return json_build_object('ok', false, 'error', 'Check the amount.'); end if;
  if p_terms is not true then return json_build_object('ok', false, 'error', 'Tick the box to accept the terms and conditions.'); end if;
  delete from yc_positions where status = 'pending' and created_at <= now() - interval '7 days';
  select position_id into existing from yc_positions where email = em limit 1;
  if existing is not null then
    return json_build_object('ok', false, 'error', 'That email already has a spot on the team sheet. One position per player.'); end if;
  begin
    insert into yc_positions (position_id, team, pos, tier, display_name, full_name, email, mobile, amount, terms_accepted_at, terms_version)
    values (p_position, tm, code, t, nm, fn, em, nullif(left(trim(coalesce(p_mobile,'')),40),''), p_amount, now(), left(coalesce(p_terms_version,''), 20));
  exception when unique_violation then
    return json_build_object('ok', false, 'error', 'Someone just grabbed that position. Pick another one.');
  end;
  return json_build_object('ok', true, 'position', p_position, 'tier', t, 'amount', p_amount, 'name', nm);
end $$;

revoke all on function public.yc_claim(text,text,text,text,text,integer,boolean,text) from public;
grant execute on function public.yc_claim(text,text,text,text,text,integer,boolean,text) to anon;
