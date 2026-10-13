-- supabase/migrations/0003_begin_extraction.sql
-- Run in Supabase Studio → SQL Editor after 0001 and 0002.
--
-- Makes the extraction cost limits race-proof. Before this, /api/extract counted past
-- runs and then called Claude; runs are only logged AFTER Claude answers, so 20
-- requests sent at the same moment could all pass the check. This function does the
-- check and marks the syllabus "extracting" in one step, holding a lock per student,
-- so parallel requests from one student are handled one at a time.

alter table public.syllabi add column extraction_started_at timestamptz;

create function public.begin_extraction(p_syllabus_id uuid, p_max_per_day integer)
returns text   -- 'ok' | 'not_found' | 'already_done' | 'busy' | 'syllabus_limit' | 'daily_limit'
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_status text;
  v_started timestamptz;
  v_runs_for_syllabus integer;
  v_runs_today integer;
  v_in_flight integer;
  -- Clamp the limit, so calling this function directly can't raise your own limit.
  v_max integer := least(greatest(coalesce(p_max_per_day, 10), 1), 100);
begin
  if v_user is null then
    return 'not_found';
  end if;

  -- One student at a time: parallel requests from the same student wait here
  -- until the previous one has finished this function.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  select status, extraction_started_at into v_status, v_started
  from public.syllabi
  where id = p_syllabus_id and user_id = v_user
  for update;
  if not found then
    return 'not_found';
  end if;

  if v_status in ('needs_review', 'confirmed') then
    return 'already_done';
  end if;
  -- Being read right now? (A reading takes at most ~5 minutes; older ones are stuck.)
  if v_status = 'extracting' and v_started > now() - interval '6 minutes' then
    return 'busy';
  end if;

  -- At most 3 readings per syllabus (MAX_RUNS_PER_SYLLABUS in lib/constants.ts).
  select count(*) into v_runs_for_syllabus
  from public.extraction_runs
  where syllabus_id = p_syllabus_id;
  if v_runs_for_syllabus >= 3 then
    return 'syllabus_limit';
  end if;

  -- Daily limit: finished runs in the last 24 hours plus readings still in progress.
  select count(*) into v_runs_today
  from public.extraction_runs
  where user_id = v_user and created_at > now() - interval '24 hours';
  select count(*) into v_in_flight
  from public.syllabi
  where user_id = v_user
    and id <> p_syllabus_id
    and status = 'extracting'
    and extraction_started_at > now() - interval '6 minutes';
  if v_runs_today + v_in_flight >= v_max then
    return 'daily_limit';
  end if;

  update public.syllabi
  set status = 'extracting', extraction_started_at = now(), error_message = null
  where id = p_syllabus_id;
  return 'ok';
end;
$$;

-- Only logged-in students may call it (and it only ever touches their own rows).
revoke all on function public.begin_extraction(uuid, integer) from public, anon;
grant execute on function public.begin_extraction(uuid, integer) to authenticated;
