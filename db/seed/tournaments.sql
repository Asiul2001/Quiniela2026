-- Seed: tournaments
-- FIFA World Cup 2026 tournament record

-- Using a fixed UUID for stable seeds
insert into tournaments (id, name, slug, year, start_at, end_at, created_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'FIFA World Cup 2026',
  'fifa-world-cup-2026',
  2026,
  '2026-06-11T16:00:00Z',
  '2026-07-11T23:59:59Z',
  now()
)
on conflict (id) do nothing;
