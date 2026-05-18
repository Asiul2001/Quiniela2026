-- Master seed runner for Quiniela Platform (run from project root):
-- psql -f db/seed.sql
-- This file executes individual seed files in the correct order.

\echo 'Seeding tournaments...'
\i 'db/seed/tournaments.sql'

\echo 'Seeding leagues (profiles + league + members)...'
\i 'db/seed/leagues.sql'

\echo 'Seeding teams...'
\i 'db/seed/teams.sql'

\echo 'Seeding scoring rules...'
\i 'db/seed/scoring_rules.sql'

\echo 'Seeding initial data...'
\i 'db/seed/initial_data.sql'

\echo 'Seeding sample matches...'
\i 'db/seed/sample_matches.sql'

\echo 'Seeding complete.'
