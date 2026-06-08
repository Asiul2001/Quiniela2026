-- Compatibility wrapper for local seeding.
-- Canonical seed source: db/seed.supabase.sql
-- Usage:
--   psql -f db/seed.sql

\echo 'Running canonical Supabase seed...'
\i 'db/seed.supabase.sql'
\echo 'Seed complete.'
