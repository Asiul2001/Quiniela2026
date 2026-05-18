-- Seed: initial data that belongs with schema setup but is not schema creation
-- This file is intentionally separate from db/schema.sql.

insert into public.stage_scoring_rules (
  league_tournament_id,
  stage,
  outcome_points,
  goal_difference_points,
  exact_score_points
)
select
  lt.id,
  rules.stage::match_stage,
  rules.outcome_points,
  1,
  rules.exact_score_points
from public.league_tournaments lt
cross join (
  values
    ('group', 2, 2),
    ('round_of_16', 3, 2),
    ('quarter_final', 4, 2),
    ('semi_final', 5, 3),
    ('final', 6, 4)
) as rules(stage, outcome_points, exact_score_points)
on conflict (league_tournament_id, stage) do nothing;
