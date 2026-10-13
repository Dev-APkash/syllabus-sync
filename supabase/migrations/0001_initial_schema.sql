-- supabase/migrations/0001_initial_schema.sql
-- Run once in Supabase Studio → SQL Editor. Creates all tables, security rules and the PDF bucket.
-- Lines marked "REVIEW:" are small safety additions to the SQL in PLAN.md section 4.

-- ========== profiles: one row per user ==========
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'UTC',
  -- secret part of the calendar feed URL: 64 random hex characters
  calendar_token text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);

-- Create a profile automatically whenever someone signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Test users created before this migration also need a profile
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ========== courses ==========
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text,
  name text not null default 'Untitled course',
  term text,
  instructor text,
  term_start_date date,
  target_grade numeric(5,2) check (target_grade between 0 and 100),
  created_at timestamptz not null default now()
);

-- ========== syllabi: one row per uploaded PDF ==========
create table public.syllabi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  file_path text not null,              -- '<user_id>/<syllabus_id>.pdf' in the 'syllabi' bucket
  original_filename text not null,
  file_sha256 text,                     -- lets us skip re-extracting an identical file
  status text not null default 'uploaded'
    check (status in ('uploaded', 'extracting', 'needs_review', 'confirmed', 'failed')),
  error_message text,
  raw_extraction jsonb,                 -- exactly what the AI returned, before any edits
  created_at timestamptz not null default now(),
  extracted_at timestamptz,
  confirmed_at timestamptz
);

-- ========== assessments: every deadline or graded item ==========
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  syllabus_id uuid references public.syllabi (id) on delete set null,
  title text not null,
  kind text not null default 'other'
    check (kind in ('assignment', 'quiz', 'test', 'midterm', 'final_exam', 'project',
                    'lab', 'presentation', 'participation', 'other')),
  due_date date,                        -- null = unknown / TBA (kept out of the calendar)
  due_time time,                        -- null = all-day
  weight_percent numeric(5,2) check (weight_percent between 0 and 100),
  score_percent numeric(5,2) check (score_percent between 0 and 150),  -- the student's mark
  date_text text,                       -- the date exactly as the syllabus wrote it
  source_quote text,                    -- the sentence the AI based this row on
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  notes text,
  include_in_calendar boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_user_status_date_idx
  on public.assessments (user_id, status, due_date);

-- REVIEW: indexes for the other columns the app looks rows up by
create index courses_user_idx on public.courses (user_id);
create index syllabi_user_sha_idx on public.syllabi (user_id, file_sha256);
create index syllabi_course_idx on public.syllabi (course_id);
create index assessments_course_idx on public.assessments (course_id);
create index assessments_syllabus_idx on public.assessments (syllabus_id);

-- Keep updated_at current on every edit
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''   -- REVIEW: fixed search_path (Supabase's Security Advisor flags functions without one)
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute procedure public.set_updated_at();

-- ========== extraction_runs: one row per Claude call (cost tracking + rate limiting) ==========
create table public.extraction_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  syllabus_id uuid references public.syllabi (id) on delete set null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(10,4),
  duration_ms integer,
  succeeded boolean not null default false,
  error_code text,
  created_at timestamptz not null default now()
);

create index extraction_runs_user_created_idx
  on public.extraction_runs (user_id, created_at);
create index extraction_runs_syllabus_idx
  on public.extraction_runs (syllabus_id);

-- ========== Row Level Security: users only ever see their own rows ==========
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.syllabi         enable row level security;
alter table public.assessments     enable row level security;
alter table public.extraction_runs enable row level security;

create policy "read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "own courses" on public.courses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own syllabi" on public.syllabi
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    -- and the course it belongs to must be yours too
    and (course_id is null or exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = (select auth.uid())))
  );

create policy "own assessments" on public.assessments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    -- and the course it belongs to must be yours too
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = (select auth.uid()))
    -- REVIEW: and so must the syllabus it came from (if any)
    and (syllabus_id is null or exists (
      select 1 from public.syllabi s
      where s.id = syllabus_id and s.user_id = (select auth.uid())))
  );

-- Runs: read and insert only, so nobody can delete rows to reset their daily limit
create policy "read own runs" on public.extraction_runs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own runs" on public.extraction_runs
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    -- REVIEW: a run can only point at one of your own syllabi
    and (syllabus_id is null or exists (
      select 1 from public.syllabi s
      where s.id = syllabus_id and s.user_id = (select auth.uid())))
  );

-- ========== Storage: private bucket for PDFs, one folder per user ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('syllabi', 'syllabi', false, 10485760, array['application/pdf']);  -- 10 MB, PDFs only

create policy "upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'syllabi'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "read own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'syllabi'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'syllabi'
         and (storage.foldername(name))[1] = (select auth.uid())::text);
