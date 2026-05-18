-- Seed: scoring rules for the Familia Strassburger league / World Cup 2026
-- Default scoring and per-stage overrides

-- Use stable UUIDs
insert into scoring_rules (id, name, league_id, default, by_stage, dark_horse_multipliers, created_at)
values (
  '44444444-4444-4444-4444-444444444444',
  'World Cup 2026 - Familia Strassburger Default',
  '33333333-3333-3333-3333-333333333333',
  -- default (group-level) points and bonusPoints
  '{"outcomePoints":2,"goalDifferencePoints":1,"exactScorePoints":2, "bonusPoints": {"champion":12,"finalists":8,"semifinalists":6,"golden_boot":10}}',
  -- by_stage overrides
  '{
    "group": {"outcomePoints":2,"goalDifferencePoints":1,"exactScorePoints":2},
    "round_of_16": {"outcomePoints":3,"goalDifferencePoints":1,"exactScorePoints":2},
    "quarter_final": {"outcomePoints":4,"goalDifferencePoints":1,"exactScorePoints":2},
    "semi_final": {"outcomePoints":5,"goalDifferencePoints":1,"exactScorePoints":3},
    "final": {"outcomePoints":6,"goalDifferencePoints":1,"exactScorePoints":4}
  }'::jsonb,
  '{}',
  now()
)
on conflict (id) do nothing;
