-- Support Brahs public site. Does not alter dt_docs or wealth_docs.

create table if not exists public.brahs_players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  number text,
  number_placeholder text,
  number_is_placeholder boolean not null default false,
  profile_id text,
  source text not null default 'manual',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists brahs_players_name_lower on public.brahs_players (lower(name));
create unique index if not exists brahs_players_number_unique
  on public.brahs_players (coalesce(number, number_placeholder))
  where coalesce(number, number_placeholder) is not null;

create table if not exists public.brahs_votes (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  game_date date,
  round text,
  opponent text,
  voter text not null,
  three text not null,
  two text not null,
  one text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists brahs_votes_game_voter
  on public.brahs_votes (game_id, lower(voter));

create table if not exists public.brahs_games (
  id text primary key,
  round text,
  round_number int,
  is_finals boolean not null default false,
  game_date date,
  tip_time text,
  starts_at timestamptz,
  venue text,
  court text,
  opponent text,
  side text,
  status text,
  outcome text,
  score_for int,
  score_against int,
  periods jsonb not null default '[]'::jsonb,
  lineup jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.brahs_player_stats (
  game_id text not null,
  player_name text not null,
  kind text not null default 'roster',
  number text,
  profile_id text,
  pts int,
  p1 int,
  p2 int,
  p3 int,
  primary key (game_id, player_name)
);

create table if not exists public.brahs_ladder (
  team_id text primary key,
  team_name text not null,
  position int,
  played int,
  won int,
  lost int,
  drawn int,
  byes int,
  forfeits int,
  points_for int,
  points_against int,
  percentage numeric,
  competition_points int,
  points_average numeric,
  updated_at timestamptz not null default now()
);

create table if not exists public.brahs_meta (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.brahs_recaps (
  game_id text primary key,
  summary text not null,
  callouts jsonb not null default '[]'::jsonb,
  author text not null default 'LeBrot',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.brahs_gallery (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  caption text,
  campaign text,
  year int,
  sort int not null default 0
);

create table if not exists public.brahs_settings (
  id text primary key,
  results_revealed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.brahs_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  organisation text,
  enquiry_type text not null,
  message text not null,
  honey text,
  created_at timestamptz not null default now()
);

insert into public.brahs_settings (id, results_revealed)
values ('reveal', false)
on conflict (id) do nothing;

alter table public.brahs_players enable row level security;
alter table public.brahs_votes enable row level security;
alter table public.brahs_games enable row level security;
alter table public.brahs_player_stats enable row level security;
alter table public.brahs_ladder enable row level security;
alter table public.brahs_meta enable row level security;
alter table public.brahs_recaps enable row level security;
alter table public.brahs_gallery enable row level security;
alter table public.brahs_settings enable row level security;
alter table public.brahs_enquiries enable row level security;

revoke all on public.brahs_players, public.brahs_votes, public.brahs_games, public.brahs_player_stats,
  public.brahs_ladder, public.brahs_meta, public.brahs_recaps, public.brahs_gallery,
  public.brahs_settings, public.brahs_enquiries from public, anon, authenticated;

grant select on public.brahs_players, public.brahs_games, public.brahs_player_stats,
  public.brahs_ladder, public.brahs_meta, public.brahs_gallery to anon, authenticated;
grant select on public.brahs_recaps to anon, authenticated;
grant insert on public.brahs_players, public.brahs_votes, public.brahs_enquiries to anon, authenticated;

drop policy if exists brahs_players_select on public.brahs_players;
drop policy if exists brahs_players_insert on public.brahs_players;
create policy brahs_players_select on public.brahs_players for select to anon, authenticated using (true);
create policy brahs_players_insert on public.brahs_players for insert to anon, authenticated
  with check (char_length(btrim(name)) between 2 and 48);

drop policy if exists brahs_votes_insert on public.brahs_votes;
create policy brahs_votes_insert on public.brahs_votes for insert to anon, authenticated
  with check (
    char_length(btrim(game_id)) between 4 and 64
    and char_length(btrim(voter)) between 2 and 48
    and char_length(btrim(three)) between 2 and 48
    and char_length(btrim(two)) between 2 and 48
    and char_length(btrim(one)) between 2 and 48
  );

drop policy if exists brahs_games_select on public.brahs_games;
drop policy if exists brahs_stats_select on public.brahs_player_stats;
drop policy if exists brahs_ladder_select on public.brahs_ladder;
drop policy if exists brahs_meta_select on public.brahs_meta;
drop policy if exists brahs_gallery_select on public.brahs_gallery;
create policy brahs_games_select on public.brahs_games for select to anon, authenticated using (true);
create policy brahs_stats_select on public.brahs_player_stats for select to anon, authenticated using (true);
create policy brahs_ladder_select on public.brahs_ladder for select to anon, authenticated using (true);
create policy brahs_meta_select on public.brahs_meta for select to anon, authenticated using (true);
create policy brahs_gallery_select on public.brahs_gallery for select to anon, authenticated using (true);

drop policy if exists brahs_recaps_select on public.brahs_recaps;
create policy brahs_recaps_select on public.brahs_recaps for select to anon, authenticated
  using (published = true);

drop policy if exists brahs_enquiries_insert on public.brahs_enquiries;
create policy brahs_enquiries_insert on public.brahs_enquiries for insert to anon, authenticated
  with check (honey is null and char_length(btrim(name)) between 2 and 80 and char_length(btrim(message)) between 2 and 2000);

create or replace function public.brahs_votes_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.voter := btrim(new.voter);
  new.three := btrim(new.three);
  new.two := btrim(new.two);
  new.one := btrim(new.one);
  new.game_id := btrim(new.game_id);
  if lower(new.voter) in (lower(new.three), lower(new.two), lower(new.one)) then
    raise exception 'cannot vote for yourself';
  end if;
  if lower(new.three) = lower(new.two) or lower(new.three) = lower(new.one) or lower(new.two) = lower(new.one) then
    raise exception 'pick three different players';
  end if;
  return new;
end;
$$;

drop trigger if exists brahs_votes_guard on public.brahs_votes;
create trigger brahs_votes_guard before insert on public.brahs_votes
  for each row execute function public.brahs_votes_guard();

create or replace function public.brahs_enquiries_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  if new.honey is not null and length(btrim(new.honey)) > 0 then
    raise exception 'rejected';
  end if;
  new.honey := null;
  new.name := btrim(new.name);
  new.email := lower(btrim(new.email));
  new.message := btrim(new.message);
  new.enquiry_type := btrim(new.enquiry_type);
  if new.email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'email';
  end if;
  if new.enquiry_type not in ('Event sponsor', 'Jersey or merch', '3x3 tournament', 'Fundraising', 'Something else') then
    raise exception 'type';
  end if;
  select count(*) into recent from public.brahs_enquiries
    where lower(email) = new.email and created_at > now() - interval '60 seconds';
  if recent >= 1 then
    raise exception 'rate';
  end if;
  select count(*) into recent from public.brahs_enquiries
    where lower(email) = new.email and created_at > now() - interval '1 hour';
  if recent >= 3 then
    raise exception 'rate';
  end if;
  return new;
end;
$$;

drop trigger if exists brahs_enquiries_guard on public.brahs_enquiries;
create trigger brahs_enquiries_guard before insert on public.brahs_enquiries
  for each row execute function public.brahs_enquiries_guard();

revoke all on function public.brahs_enquiries_guard() from public, anon, authenticated;

create or replace function public.brahs_ballot_counts()
returns table (game_id text, ballots bigint)
language sql
security definer
set search_path = public
as $$
  select v.game_id, count(*)::bigint
  from public.brahs_votes v
  group by v.game_id
$$;

create or replace function public.brahs_public_board()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  revealed boolean;
begin
  select s.results_revealed into revealed from public.brahs_settings s where s.id = 'reveal';
  if coalesce(revealed, false) is not true then
    return jsonb_build_object('revealed', false);
  end if;
  return jsonb_build_object(
    'revealed', true,
    'players', coalesce((
      with pts as (
        select three as player, 3 as pts, 1 as firsts, 0 as seconds, 0 as thirds, game_id from public.brahs_votes
        union all
        select two, 2, 0, 1, 0, game_id from public.brahs_votes
        union all
        select one, 1, 0, 0, 1, game_id from public.brahs_votes
      )
      select jsonb_agg(jsonb_build_object(
        'player', player, 'points', points, 'firsts', firsts, 'seconds', seconds, 'thirds', thirds, 'games', games
      ) order by points desc, firsts desc, player)
      from (
        select player, sum(pts)::int as points, sum(firsts)::int as firsts, sum(seconds)::int as seconds,
               sum(thirds)::int as thirds, count(distinct game_id)::int as games
        from pts group by player
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.brahs_ballot_counts() from public;
revoke all on function public.brahs_public_board() from public;
grant execute on function public.brahs_ballot_counts() to anon, authenticated;
grant execute on function public.brahs_public_board() to anon, authenticated;

-- Cache of the Movember team page total. The page is the source. The site reads this, it does not hardcode the figure.
alter table public.brahs_settings add column if not exists movember_raised_cents integer;
alter table public.brahs_settings add column if not exists movember_as_of text;
update public.brahs_settings
set movember_raised_cents = 8955900, movember_as_of = 'as of Nov 2026', updated_at = now()
where id = 'reveal';

create or replace function public.brahs_movember()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('cents', s.movember_raised_cents, 'asOf', s.movember_as_of)
  from public.brahs_settings s
  where s.id = 'reveal'
$$;
revoke all on function public.brahs_movember() from public;
grant execute on function public.brahs_movember() to anon, authenticated;

alter table public.brahs_settings add column if not exists movember_target_cents integer;
update public.brahs_settings
set movember_target_cents = 1100000, updated_at = now()
where id = 'reveal';

create or replace function public.brahs_movember()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'cents', s.movember_raised_cents,
    'asOf', s.movember_as_of,
    'targetCents', s.movember_target_cents
  )
  from public.brahs_settings s
  where s.id = 'reveal'
$$;
revoke all on function public.brahs_movember() from public;
grant execute on function public.brahs_movember() to anon, authenticated;
