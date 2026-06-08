-- Row Level Security policies for the Supabase-auth-backed Quiniela flow.
-- Apply after db/schema.sql.

grant usage on schema public to anon, authenticated;
grant usage on schema public to service_role;

grant select on public.leagues to anon, authenticated;
grant select on public.league_tournaments to anon, authenticated;
grant select on public.tournaments to anon, authenticated;
grant select on public.teams to anon, authenticated;
grant select on public.matches to anon, authenticated;
grant select on public.phase_deadlines to anon, authenticated;
grant select on public.stage_scoring_rules to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.league_members to anon, authenticated;
grant select on public.predictions to anon, authenticated;
grant select on public.prediction_scores to anon, authenticated;

grant insert, update on public.profiles to authenticated;
grant insert, update on public.leagues to authenticated;
grant insert on public.league_members to authenticated;
grant insert, update on public.league_tournaments to authenticated;
grant insert, update on public.stage_scoring_rules to authenticated;
grant insert, update on public.phase_deadlines to authenticated;
grant insert, update, delete on public.predictions to authenticated;

grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_tournaments enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.phase_deadlines enable row level security;
alter table public.stage_scoring_rules enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_scores enable row level security;

drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles"
on public.profiles
for select
using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Public can read leagues" on public.leagues;
create policy "Public can read leagues"
on public.leagues
for select
using (true);

drop policy if exists "Owners can create leagues" on public.leagues;
create policy "Owners can create leagues"
on public.leagues
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "Owners can update leagues" on public.leagues;
create policy "Owners can update leagues"
on public.leagues
for update
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "Public can read league tournaments" on public.league_tournaments;
create policy "Public can read league tournaments"
on public.league_tournaments
for select
using (true);

drop policy if exists "League owners can manage league tournaments" on public.league_tournaments;
create policy "League owners can manage league tournaments"
on public.league_tournaments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.leagues
    where leagues.id = league_tournaments.league_id
      and leagues.owner_user_id = auth.uid()
  )
);

drop policy if exists "League owners can update league tournaments" on public.league_tournaments;
create policy "League owners can update league tournaments"
on public.league_tournaments
for update
to authenticated
using (
  exists (
    select 1
    from public.leagues
    where leagues.id = league_tournaments.league_id
      and leagues.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.leagues
    where leagues.id = league_tournaments.league_id
      and leagues.owner_user_id = auth.uid()
  )
);

drop policy if exists "Public can read tournaments" on public.tournaments;
create policy "Public can read tournaments"
on public.tournaments
for select
using (true);

drop policy if exists "Public can read teams" on public.teams;
create policy "Public can read teams"
on public.teams
for select
using (true);

drop policy if exists "Public can read matches" on public.matches;
create policy "Public can read matches"
on public.matches
for select
using (true);

drop policy if exists "Public can read phase deadlines" on public.phase_deadlines;
create policy "Public can read phase deadlines"
on public.phase_deadlines
for select
using (true);

drop policy if exists "League owners can manage phase deadlines" on public.phase_deadlines;
create policy "League owners can manage phase deadlines"
on public.phase_deadlines
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_tournaments
    inner join public.leagues on leagues.id = league_tournaments.league_id
    where league_tournaments.id = phase_deadlines.league_tournament_id
      and leagues.owner_user_id = auth.uid()
  )
);

drop policy if exists "League owners can update phase deadlines" on public.phase_deadlines;
create policy "League owners can update phase deadlines"
on public.phase_deadlines
for update
to authenticated
using (
  exists (
    select 1
    from public.league_tournaments
    inner join public.leagues on leagues.id = league_tournaments.league_id
    where league_tournaments.id = phase_deadlines.league_tournament_id
      and leagues.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.league_tournaments
    inner join public.leagues on leagues.id = league_tournaments.league_id
    where league_tournaments.id = phase_deadlines.league_tournament_id
      and leagues.owner_user_id = auth.uid()
  )
);

drop policy if exists "Public can read scoring rules" on public.stage_scoring_rules;
create policy "Public can read scoring rules"
on public.stage_scoring_rules
for select
using (true);

drop policy if exists "League owners can manage scoring rules" on public.stage_scoring_rules;
create policy "League owners can manage scoring rules"
on public.stage_scoring_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_tournaments
    inner join public.leagues on leagues.id = league_tournaments.league_id
    where league_tournaments.id = stage_scoring_rules.league_tournament_id
      and leagues.owner_user_id = auth.uid()
  )
);

drop policy if exists "League owners can update scoring rules" on public.stage_scoring_rules;
create policy "League owners can update scoring rules"
on public.stage_scoring_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.league_tournaments
    inner join public.leagues on leagues.id = league_tournaments.league_id
    where league_tournaments.id = stage_scoring_rules.league_tournament_id
      and leagues.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.league_tournaments
    inner join public.leagues on leagues.id = league_tournaments.league_id
    where league_tournaments.id = stage_scoring_rules.league_tournament_id
      and leagues.owner_user_id = auth.uid()
  )
);

drop policy if exists "Public can read league members" on public.league_members;
create policy "Public can read league members"
on public.league_members
for select
using (true);

drop policy if exists "Users can join leagues as themselves" on public.league_members;
create policy "Users can join leagues as themselves"
on public.league_members
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    role = 'member'
    or exists (
      select 1
      from public.leagues
      where leagues.id = league_members.league_id
        and leagues.owner_user_id = auth.uid()
        and league_members.role = 'owner'
    )
  )
);

drop policy if exists "Public can read predictions" on public.predictions;
create policy "Public can read predictions"
on public.predictions
for select
using (true);

drop policy if exists "Members can insert their own predictions" on public.predictions;
create policy "Members can insert their own predictions"
on public.predictions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.league_members
    where league_members.id = predictions.member_id
      and league_members.league_id = predictions.league_id
      and league_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can update their own predictions" on public.predictions;
create policy "Members can update their own predictions"
on public.predictions
for update
to authenticated
using (
  exists (
    select 1
    from public.league_members
    where league_members.id = predictions.member_id
      and league_members.league_id = predictions.league_id
      and league_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.league_members
    where league_members.id = predictions.member_id
      and league_members.league_id = predictions.league_id
      and league_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can delete their own predictions" on public.predictions;
create policy "Members can delete their own predictions"
on public.predictions
for delete
to authenticated
using (
  exists (
    select 1
    from public.league_members
    where league_members.id = predictions.member_id
      and league_members.league_id = predictions.league_id
      and league_members.user_id = auth.uid()
  )
);

drop policy if exists "Public can read prediction scores" on public.prediction_scores;
create policy "Public can read prediction scores"
on public.prediction_scores
for select
using (true);
