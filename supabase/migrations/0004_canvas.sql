-- supabase/migrations/0004_canvas.sql
-- Self-hosted installs apply this automatically (the migrate container). Elsewhere, run it after 0003.
--
-- Linking Canvas with a personal access token (Settings → Canvas). The token is stored
-- ENCRYPTED (AES-256-GCM, lib/canvas/crypto.ts) with a key that only the app server has
-- (CANVAS_TOKEN_KEY), so even its owner reading this row sees only scrambled text.
-- Grades and assignments are fetched live from Canvas and never stored here.

create table public.canvas_connections (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  base_url text not null check (base_url ~ '^https://[a-z0-9.-]+$'),  -- e.g. https://canvas.example.edu
  token_encrypted text not null check (char_length(token_encrypted) < 1000),
  canvas_user_name text check (char_length(canvas_user_name) <= 200),
  created_at timestamptz not null default now()
);

alter table public.canvas_connections enable row level security;

create policy "own canvas connection" on public.canvas_connections
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Which Canvas course a Syllabus Sync course is linked to (chosen on the course page).
alter table public.courses add column canvas_course_id bigint check (canvas_course_id > 0);
