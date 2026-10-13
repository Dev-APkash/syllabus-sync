#!/bin/bash
# Backs up a self-hosted Syllabus Sync. Run on the server, from this folder:
#
#   bash backup.sh
#
# Makes one archive with everything needed to restore: the database files, the uploaded PDFs,
# the database's settings volume and .env (the secrets that unlock the database). The stack is
# stopped for about a minute so the copy is consistent, then started again.
#
# Settings (optional, as environment variables):
#   BACKUP_DIR   where archives go (default: ~/syllabus-sync-backups). Copy them off this machine too.
#   KEEP         how many archives to keep (default: 7; older ones are deleted)
#
# The archive contains secrets: it is created readable only by you. Keep copies somewhere private.
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "No .env here: run this from the selfhost folder of a set-up install."; exit 1; }
dest="${BACKUP_DIR:-$HOME/syllabus-sync-backups}"
keep="${KEEP:-7}"
case "$keep" in '' | *[!0-9]* | 0) echo "KEEP must be a number of 1 or more."; exit 1 ;; esac

umask 077
mkdir -p "$dest"
dest="$(cd "$dest" && pwd)"
stamp="$(date +%Y-%m-%d-%H%M%S)"
name="syllabus-sync-$stamp.tar.gz"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

echo "Stopping Syllabus Sync for a consistent copy (about a minute)..."
docker compose stop
# Start again however this script ends, even after an error.
trap 'rm -rf "$work"; echo "Starting Syllabus Sync again..."; docker compose up -d >/dev/null' EXIT

# The database files belong to the database's own user, so copy them from inside a container.
# alpine is a tiny Linux image; nothing is installed on this machine.
docker run --rm \
  -v "$PWD/volumes:/data/volumes:ro" \
  -v syllabus-sync_db-config:/data/db-config:ro \
  -v "$work:/out" \
  alpine:3.20 sh -c 'cd /data && tar czf /out/data.tar.gz volumes db-config && chmod 644 /out/data.tar.gz'
cp .env "$work/env"

tar czf "$dest/$name" -C "$work" data.tar.gz env
chmod 600 "$dest/$name"
echo "Backup written: $dest/$name ($(du -h "$dest/$name" | cut -f1))"

# Keep the newest $keep archives.
ls -1t "$dest"/syllabus-sync-*.tar.gz 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
  rm -f -- "$old"
  echo "Removed old backup: $(basename "$old")"
done
