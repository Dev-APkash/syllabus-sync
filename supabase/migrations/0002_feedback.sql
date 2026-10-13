-- supabase/migrations/0002_feedback.sql  (PLAN.md Task 7.6)
-- Run in Supabase Studio → SQL Editor after 0001. Stores "Something wrong? Tell us" messages.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  syllabus_id uuid references public.syllabi (id) on delete set null,  -- only if the student ticked "include this syllabus"
  page text,                                                           -- which page the feedback was sent from
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Students can send feedback, but not read, edit or delete it. You read it in Studio.
create policy "insert own feedback" on public.feedback
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (syllabus_id is null or exists (
      select 1 from public.syllabi s
      where s.id = syllabus_id and s.user_id = (select auth.uid())))
  );
