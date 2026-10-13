#!/bin/bash
# Applies the app's database migrations (supabase/migrations/*.sql) in order, once each.
# Runs as the one-off "migrate" container on every `docker compose up`; already-applied
# files are skipped. Each file and its "done" record are saved in one transaction, so a
# failed migration leaves nothing half-applied.
set -euo pipefail

psql -v ON_ERROR_STOP=1 -q <<'SQL'
-- A private schema the REST API never exposes, to remember which migrations have run.
create schema if not exists app_private;
create table if not exists app_private.applied_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
SQL

shopt -s nullglob
files=(/migrations/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No migration files found in /migrations." >&2
  exit 1
fi

for file in "${files[@]}"; do
  name=$(basename "$file")
  done_already=$(psql -tAc "select 1 from app_private.applied_migrations where name = '${name}'")
  if [ "$done_already" = "1" ]; then
    echo "already applied: ${name}"
    continue
  fi
  echo "applying: ${name}"
  psql -v ON_ERROR_STOP=1 --single-transaction \
    -f "$file" \
    -c "insert into app_private.applied_migrations (name) values ('${name}')"
done

echo "Database is up to date."
