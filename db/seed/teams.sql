-- Seed: teams for FIFA World Cup 2026 (development groups provided)
-- Adds helpful columns if they don't exist and inserts team rows.

-- Ensure schema has requested columns (safe to run multiple times)
-- Schema now includes `group_name` and `confederation` columns in db/schema.sql

-- Using the tournament UUID from tournaments.sql
-- Team UUIDs are stable so sample_matches.sql can reference them
insert into teams (id, tournament_id, name, short_name, code, country, confederation, group_name, logo_url, created_at)
values
  ('a1a1a1a1-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Argentina','Argentina','ARG','Argentina','CONMEBOL','A', NULL, now()),
  ('a1a1a1a1-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Japan','Japan','JPN','Japan','AFC','A', NULL, now()),
  ('a1a1a1a1-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Canada','Canada','CAN','Canada','CONCACAF','A', NULL, now()),
  ('a1a1a1a1-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Ghana','Ghana','GHA','Ghana','CAF','A', NULL, now()),

  ('b1b1b1b1-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Germany','Germany','GER','Germany','UEFA','B', NULL, now()),
  ('b1b1b1b1-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Mexico','Mexico','MEX','Mexico','CONCACAF','B', NULL, now()),
  ('b1b1b1b1-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','South Korea','S.Korea','KOR','Korea Republic','AFC','B', NULL, now()),
  ('b1b1b1b1-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','Tunisia','Tunisia','TUN','Tunisia','CAF','B', NULL, now()),

  ('c1c1c1c1-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111','France','France','FRA','France','UEFA','C', NULL, now()),
  ('c1c1c1c1-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','Morocco','Morocco','MAR','Morocco','CAF','C', NULL, now()),
  ('c1c1c1c1-0000-0000-0000-000000000011','11111111-1111-1111-1111-111111111111','United States','USA','USA','United States','CONCACAF','C', NULL, now()),
  ('c1c1c1c1-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','Australia','Australia','AUS','Australia','AFC','C', NULL, now()),

  ('d1d1d1d1-0000-0000-0000-000000000013','11111111-1111-1111-1111-111111111111','Brazil','Brazil','BRA','Brazil','CONMEBOL','D', NULL, now()),
  ('d1d1d1d1-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','Portugal','Portugal','POR','Portugal','UEFA','D', NULL, now()),
  ('d1d1d1d1-0000-0000-0000-000000000015','11111111-1111-1111-1111-111111111111','Switzerland','Switzerland','SUI','Switzerland','UEFA','D', NULL, now()),
  ('d1d1d1d1-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','Placeholder United','Placeholder','PLU','Unknown','UNK','D', NULL, now()),

  ('e1e1e1e1-0000-0000-0000-000000000017','11111111-1111-1111-1111-111111111111','Spain','Spain','ESP','Spain','UEFA','E', NULL, now()),
  ('e1e1e1e1-0000-0000-0000-000000000018','11111111-1111-1111-1111-111111111111','England','England','ENG','England','UEFA','E', NULL, now()),
  ('e1e1e1e1-0000-0000-0000-000000000019','11111111-1111-1111-1111-111111111111','Croatia','Croatia','CRO','Croatia','UEFA','E', NULL, now()),
  ('e1e1e1e1-0000-0000-0000-000000000020','11111111-1111-1111-1111-111111111111','Egypt','Egypt','EGY','Egypt','CAF','E', NULL, now()),

  ('f1f1f1f1-0000-0000-0000-000000000021','11111111-1111-1111-1111-111111111111','Netherlands','Netherlands','NED','Netherlands','UEFA','F', NULL, now()),
  ('f1f1f1f1-0000-0000-0000-000000000022','11111111-1111-1111-1111-111111111111','Uruguay','Uruguay','URU','Uruguay','CONMEBOL','F', NULL, now()),
  ('f1f1f1f1-0000-0000-0000-000000000023','11111111-1111-1111-1111-111111111111','Senegal','Senegal','SEN','Senegal','CAF','F', NULL, now()),
  ('f1f1f1f1-0000-0000-0000-000000000024','11111111-1111-1111-1111-111111111111','Saudi Arabia','Saudi Arabia','KSA','Saudi Arabia','AFC','F', NULL, now()),

  ('g1g1g1g1-0000-0000-0000-000000000025','11111111-1111-1111-1111-111111111111','Belgium','Belgium','BEL','Belgium','UEFA','G', NULL, now()),
  ('g1g1g1g1-0000-0000-0000-000000000026','11111111-1111-1111-1111-111111111111','Colombia','Colombia','COL','Colombia','CONMEBOL','G', NULL, now()),
  ('g1g1g1g1-0000-0000-0000-000000000027','11111111-1111-1111-1111-111111111111','Iran','Iran','IRN','Iran','AFC','G', NULL, now()),
  ('g1g1g1g1-0000-0000-0000-000000000028','11111111-1111-1111-1111-111111111111','New Zealand','New Zealand','NZL','New Zealand','OFC','G', NULL, now()),

  ('h1h1h1h1-0000-0000-0000-000000000029','11111111-1111-1111-1111-111111111111','Italy','Italy','ITA','Italy','UEFA','H', NULL, now()),
  ('h1h1h1h1-0000-0000-0000-000000000030','11111111-1111-1111-1111-111111111111','Denmark','Denmark','DEN','Denmark','UEFA','H', NULL, now()),
  ('h1h1h1h1-0000-0000-0000-000000000031','11111111-1111-1111-1111-111111111111','Poland','Poland','POL','Poland','UEFA','H', NULL, now()),
  ('h1h1h1h1-0000-0000-0000-000000000032','11111111-1111-1111-1111-111111111111','Nigeria','Nigeria','NGA','Nigeria','CAF','H', NULL, now())
on conflict (id) do nothing;
