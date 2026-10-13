# Changelog

All notable changes to the self-hosted edition. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

The first public version (v0.1.0) is being prepared; see RELEASE_PLAN.md.

### Added

- Upload a syllabus PDF and have Claude find every deadline, exam and grade weight, with a review screen beside
  the original PDF before anything is saved.
- Calendar feed (iCalendar) of confirmed deadlines, with time zones handled and edits updating existing events.
- Course list with "This week" (all courses, next 7 days), an Exams panel (midterms, tests and finals per course),
  course colours, and past terms folded away.
- Course pages with "Next up", deadlines by month, mark as done, and delete course.
- Grade calculator: what you need on the final, with marks you type or fill in from Canvas.
- Canvas linking with a personal access token (stored encrypted, read-only): current grade, due soon, missing and
  graded work on each course page, and Canvas statuses and Canvas-only work in "This week".
- Self-hosting with Docker Compose: the app plus a trimmed Supabase (Postgres, Auth, Storage) behind one Caddy
  front door, with `setup.sh` generating all secrets.
- `backup.sh` / `restore.sh` (one archive with everything; restore keeps the current data aside),
  `install-backup-timer.sh` for nightly backups, and `reset-password.sh` for installs without email.
- Cost controls: one attempt per syllabus reading, at most 3 readings per syllabus and a daily limit per student,
  enforced in the database.
- One image for every install: the site address and Supabase key are read when the container starts, so changing
  `SITE_URL` needs only `docker compose up -d`. Published images for amd64 and arm64 (`APP_IMAGE`), or build from
  source.
- Guides in `docs/`: install (Tailscale, your own domain behind a reverse proxy, local network), configuration,
  backups, upgrading, security and an FAQ.
- Tested on every change: unit tests, a smoke test of the whole stack, a real-browser test of the account journey,
  backup → restore (including onto an empty machine), and password reset.
