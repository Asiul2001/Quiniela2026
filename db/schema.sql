create extension if not exists "pgcrypto";

create type league_role as enum ('member', 'manager', 'owner');
create type platform_role as enum ('platform_admin');
create type match_stage as enum ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final');
create type match_status as enum ('scheduled', 'live', 'completed', 'cancelled');
create type team_tier as enum ('favorite', 'strong_outsider', 'dark_horse', 'big_surprise');
create type bonus_prediction_type as enum ('champion', 'finalists', 'semifinalists', 'golden_boot', 'dark_horse');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  display_name text,
  platform_role platform_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  owner_user_id uuid not null references public.profiles (id),
  is_public boolean not null default false,
  support_prompt_enabled boolean not null default true,
  suggested_support_amount_cents integer not null default 500,
  default_currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role league_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create index if not exists idx_league_members_user_id on public.league_members (user_id);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  year integer,
  host_country text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  name text not null,
  code text,
  tier team_tier not null default 'favorite',
  created_at timestamptz not null default now(),
  unique (tournament_id, name),
  unique (tournament_id, code)
);

create table if not exists public.league_tournaments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  predictions_open_at timestamptz,
  created_at timestamptz not null default now(),
  unique (league_id, tournament_id)
);

create table if not exists public.stage_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  league_tournament_id uuid not null references public.league_tournaments (id) on delete cascade,
  stage match_stage not null,
  outcome_points integer not null,
  goal_difference_points integer not null default 1,
  exact_score_points integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_tournament_id, stage)
);

create table if not exists public.phase_deadlines (
  id uuid primary key default gen_random_uuid(),
  league_tournament_id uuid not null references public.league_tournaments (id) on delete cascade,
  stage match_stage not null,
  deadline_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_tournament_id, stage)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  stage match_stage not null,
  round_number integer,
  match_number integer,
  home_team_id uuid not null references public.teams (id),
  away_team_id uuid not null references public.teams (id),
  venue text,
  kickoff_at timestamptz not null,
  status match_status not null default 'scheduled',
  home_score integer,
  away_score integer,
  home_penalty_score integer,
  away_penalty_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id),
  check (
    (home_score is null and away_score is null)
    or (home_score is not null and away_score is not null)
  )
);

create index if not exists idx_matches_tournament_kickoff on public.matches (tournament_id, kickoff_at);
create index if not exists idx_matches_stage on public.matches (stage);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  member_id uuid not null references public.league_members (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  predicted_home_score integer not null,
  predicted_away_score integer not null,
  predicted_penalty_winner text check (predicted_penalty_winner in ('home', 'away')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, match_id),
  check (predicted_home_score >= 0),
  check (predicted_away_score >= 0)
);

create index if not exists idx_predictions_league_match on public.predictions (league_id, match_id);

create table if not exists public.prediction_scores (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null unique references public.predictions (id) on delete cascade,
  outcome_points integer not null default 0,
  goal_difference_points integer not null default 0,
  exact_score_points integer not null default 0,
  bonus_points integer not null default 0,
  total_points integer not null default 0,
  calculated_at timestamptz not null default now()
);

create table if not exists public.bonus_prediction_rules (
  id uuid primary key default gen_random_uuid(),
  league_tournament_id uuid not null references public.league_tournaments (id) on delete cascade,
  type bonus_prediction_type not null,
  is_enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_tournament_id, type)
);

create table if not exists public.bonus_predictions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  member_id uuid not null references public.league_members (id) on delete cascade,
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  type bonus_prediction_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, tournament_id, type)
);

create index if not exists idx_bonus_predictions_lookup
  on public.bonus_predictions (league_id, tournament_id, member_id, type);

create table if not exists public.support_intents (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  amount_cents integer,
  currency text not null default 'EUR',
  status text not null default 'pending',
  selected_option text,
  notes text,
  created_at timestamptz not null default now()
);
