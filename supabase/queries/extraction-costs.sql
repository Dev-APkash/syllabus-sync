-- supabase/queries/extraction-costs.sql  (PLAN.md Task 7.2)
-- Paste into Supabase Studio → SQL Editor to see Claude API spending per day.
-- Read-only: this changes nothing. (Studio runs as an admin, so it sees every student's runs.)

select
  date_trunc('day', created_at)::date                               as day,
  count(*)                                                          as extractions,
  count(*) filter (where not succeeded)                             as failures,
  round(sum(cost_usd), 4)                                           as total_cost_usd,
  round(avg(cost_usd) filter (where succeeded), 4)                  as avg_cost_per_syllabus_usd,
  round(avg(duration_ms) filter (where succeeded) / 1000.0, 1)      as avg_seconds
from public.extraction_runs
group by 1
order by 1 desc;

-- Spending so far, all time:
-- select round(sum(cost_usd), 2) as total_usd, count(*) as runs from public.extraction_runs;
