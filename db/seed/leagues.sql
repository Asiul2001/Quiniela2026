-- Seed: leagues and initial profile (Luisa)
-- Create profile for Luisa and the 'Familia Strassburger' league

-- Stable UUIDs used so other seeds can reference them
insert into profiles (id, email, username, display_name, created_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'luisa@example.com',
  'luisa',
  'Luisa',
  now()
)
on conflict (id) do update set email = excluded.email;

-- League
insert into leagues (id, name, slug, description, owner_user_id, visibility, created_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'Familia Strassburger',
  'familia-strassburger',
  'Private family league for Quiniela MVP testing',
  '22222222-2222-2222-2222-222222222222',
  'private',
  now()
)
on conflict (id) do nothing;

-- League member record for Luisa as owner
insert into league_members (id, league_id, user_id, role, display_name, joined_at, is_active)
values (
  '33333333-3333-3333-3333-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'owner',
  'Luisa',
  now(),
  true
)
on conflict (league_id, user_id) do nothing;
