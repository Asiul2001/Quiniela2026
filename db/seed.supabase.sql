-- Supabase-compatible initial data seed for Quiniela Platform
-- Inserts profile, league, tournament, league_tournament link, teams, stage scoring rules, and sample matches.

insert into profiles (id, full_name, display_name, created_at, updated_at)
values
  ('9e9abc0a-a725-45ed-9fd7-18948be3f819', 'Luisa', 'Luisa', now(), now())
on conflict (id) do nothing;

insert into leagues (id, name, slug, description, owner_user_id, is_public, support_prompt_enabled, suggested_support_amount_cents, default_currency, created_at, updated_at)
values
  ('33333333-3333-3333-3333-333333333333', 'Familia Strassburger', 'familia-strassburger', 'Private family league for Quiniela MVP testing', '9e9abc0a-a725-45ed-9fd7-18948be3f819', false, true, 500, 'EUR', now(), now())
on conflict (id) do nothing;

insert into tournaments (id, name, slug, year, host_country, starts_at, ends_at, created_at)
values
  ('11111111-1111-1111-1111-111111111111', 'FIFA World Cup 2026', 'fifa-world-cup-2026', 2026, null, '2026-06-11T16:00:00Z', '2026-07-11T23:59:59Z', now())
on conflict (id) do nothing;

insert into league_tournaments (id, league_id, tournament_id, predictions_open_at, created_at)
values
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', null, now())
on conflict (id) do nothing;

insert into teams (id, tournament_id, name, code, tier, created_at)
values
  ('a1a1a1a1-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Argentina','ARG','favorite',now()),
  ('a1a1a1a1-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Japan','JPN','favorite',now()),
  ('a1a1a1a1-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Canada','CAN','favorite',now()),
  ('a1a1a1a1-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Ghana','GHA','favorite',now()),
  ('b1b1b1b1-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Germany','GER','favorite',now()),
  ('b1b1b1b1-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Mexico','MEX','favorite',now()),
  ('b1b1b1b1-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','South Korea','KOR','favorite',now()),
  ('b1b1b1b1-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','Tunisia','TUN','favorite',now()),
  ('c1c1c1c1-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','France','FRA','favorite',now()),
  ('c1c1c1c1-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','Morocco','MAR','favorite',now()),
  ('c1c1c1c1-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','United States','USA','favorite',now()),
  ('c1c1c1c1-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','Australia','AUS','favorite',now()),
  ('d1d1d1d1-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','Brazil','BRA','favorite',now()),
  ('d1d1d1d1-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','Portugal','POR','favorite',now()),
  ('d1d1d1d1-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','Switzerland','SUI','favorite',now()),
  ('d1d1d1d1-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','Placeholder United','PLU','favorite',now()),
  ('e1e1e1e1-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111','Spain','ESP','favorite',now()),
  ('e1e1e1e1-0000-0000-0000-000000000018','11111111-1111-1111-1111-111111111111','England','ENG','favorite',now()),
  ('e1e1e1e1-0000-0000-0000-000000000019','11111111-1111-1111-1111-111111111111','Croatia','CRO','favorite',now()),
  ('e1e1e1e1-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','Egypt','EGY','favorite',now()),
  ('f1f1f1f1-0000-0000-0000-000000000021','11111111-1111-1111-1111-111111111111','Netherlands','NED','favorite',now()),
  ('f1f1f1f1-0000-0000-0000-000000000022','11111111-1111-1111-1111-111111111111','Uruguay','URU','favorite',now()),
  ('f1f1f1f1-0000-0000-0000-000000000023','11111111-1111-1111-1111-111111111111','Senegal','SEN','favorite',now()),
  ('f1f1f1f1-0000-0000-0000-000000000024','11111111-1111-1111-1111-111111111111','Saudi Arabia','KSA','favorite',now()),
  ('e2e2e2e2-0000-0000-0000-000000000025','11111111-1111-1111-1111-111111111111','Belgium','BEL','favorite',now()),
  ('e2e2e2e2-0000-0000-0000-000000000026','11111111-1111-1111-1111-111111111111','Colombia','COL','favorite',now()),
  ('e2e2e2e2-0000-0000-0000-000000000027','11111111-1111-1111-1111-111111111111','Iran','IRN','favorite',now()),
  ('e2e2e2e2-0000-0000-0000-000000000028','11111111-1111-1111-1111-111111111111','New Zealand','NZL','favorite',now()),
  ('e3e3e3e3-0000-0000-0000-000000000029','11111111-1111-1111-1111-111111111111','Italy','ITA','favorite',now()),
  ('e3e3e3e3-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','Denmark','DEN','favorite',now()),
  ('e3e3e3e3-0000-0000-0000-000000000031','11111111-1111-1111-1111-111111111111','Poland','POL','favorite',now()),
  ('e3e3e3e3-0000-0000-0000-000000000032','11111111-1111-1111-1111-111111111111','Nigeria','NGA','favorite',now())
on conflict (id) do nothing;

insert into stage_scoring_rules (id, league_tournament_id, stage, outcome_points, goal_difference_points, exact_score_points, created_at, updated_at)
values
  ('66666666-6666-6666-6666-666666666661','55555555-5555-5555-5555-555555555555','group',2,1,2,now(),now()),
  ('66666666-6666-6666-6666-666666666662','55555555-5555-5555-5555-555555555555','round_of_16',3,1,2,now(),now()),
  ('66666666-6666-6666-6666-666666666663','55555555-5555-5555-5555-555555555555','quarter_final',4,1,2,now(),now()),
  ('66666666-6666-6666-6666-666666666664','55555555-5555-5555-5555-555555555555','semi_final',5,1,3,now(),now()),
  ('66666666-6666-6666-6666-666666666665','55555555-5555-5555-5555-555555555555','final',6,1,4,now(),now())
on conflict (id) do nothing;

insert into matches (id, tournament_id, stage, round_number, match_number, home_team_id, away_team_id, kickoff_at, status, created_at, updated_at)
values
  ('a0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','group',1,1,'a1a1a1a1-0000-0000-0000-000000000001','a1a1a1a1-0000-0000-0000-000000000002','2026-06-12T18:00:00Z','scheduled',now(),now()),
  ('a0000002-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','group',1,2,'b1b1b1b1-0000-0000-0000-000000000005','b1b1b1b1-0000-0000-0000-000000000006','2026-06-13T18:00:00Z','scheduled',now(),now()),
  ('a0000003-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','group',1,3,'c1c1c1c1-0000-0000-0000-000000000009','c1c1c1c1-0000-0000-0000-000000000010','2026-06-14T18:00:00Z','scheduled',now(),now()),
  ('a0000004-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','quarter_final',1,1,'d1d1d1d1-0000-0000-0000-000000000013','d1d1d1d1-0000-0000-0000-000000000014','2026-07-03T20:00:00Z','scheduled',now(),now()),
  ('a0000005-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','semi_final',1,1,'e1e1e1e1-0000-0000-0000-000000000017','e1e1e1e1-0000-0000-0000-000000000018','2026-07-07T20:00:00Z','scheduled',now(),now())
on conflict (id) do nothing;
