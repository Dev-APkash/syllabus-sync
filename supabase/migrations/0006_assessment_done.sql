-- supabase/migrations/0006_assessment_done.sql
-- Self-hosted installs apply this automatically (the migrate container). Elsewhere, run it after 0005.
--
-- "Mark as done": when the student ticked a deadline off. Done items drop out of "This week",
-- "Next up" and the Exams panel. The existing "own assessments" RLS policy already covers it.

alter table public.assessments add column completed_at timestamptz;
