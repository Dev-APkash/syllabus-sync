#!/bin/bash
# Restores an archive made by backup.sh. Run on the server, from this folder:
#
#   bash restore.sh ~/syllabus-sync-backups/syllabus-sync-2026-10-11-030000.tar.gz
#
# Replaces the current data (database, uploaded PDFs, .env) with the backup's. Nothing is
# deleted: the current data is moved to volumes.before-restore-<time> (and .env to
# .env.before-restore-<time> if it differs) until you remove it yourself.
# Add --yes after the file name to skip the question (used by the automatic tests).
set -euo pipefail
cd "$(dirname "$0")"

archive="${1:-}"
if [ -z "$archive" ] || [ ! -f "$archive" ]; then
  echo "Usage: bash restore.sh <backup archive> [--yes]"
  exit 1
fi
archive="$(cd "$(dirname "$archive")" && pwd)/$(basename "$archive")"

umask 077
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tar xzf "$archive" -C "$work"
if [ ! -f "$work/data.tar.gz" ] || [ ! -f "$work/env" ]; then
  echo "That file isn't a Syllabus Sync backup (made by backup.sh)."
  exit 1
fi

if [ "${2:-}" != "--yes" ]; then
  echo "This replaces ALL current Syllabus Sync data on this machine with the backup:"
  echo "  $(basename "$archive")"
  echo "The current data is kept aside, not deleted."
  read -rp "Type RESTORE to continue: " answer
  [ "$answer" = "RESTORE" ] || { echo "Nothing changed."; exit 1; }
fi

stamp="$(date +%Y-%m-%d-%H%M%S)"
echo "Stopping Syllabus Sync..."
if [ -f .env ]; then
  docker compose down
else
  # A new machine (no .env yet): Compose can't load the project without one, so stop any
  # leftover containers of this project directly.
  leftovers="$(docker ps -aq --filter label=com.docker.compose.project=syllabus-sync)"
  [ -z "$leftovers" ] || docker rm -f $leftovers >/dev/null
fi

# Keep the current data aside instead of deleting it.
if [ -d volumes ]; then
  mv volumes "volumes.before-restore-$stamp"
  echo "Current data kept in volumes.before-restore-$stamp"
fi
if [ -f .env ] && ! cmp -s .env "$work/env"; then
  cp .env ".env.before-restore-$stamp"
  echo "Current .env kept as .env.before-restore-$stamp"
fi
cp "$work/env" .env
chmod 600 .env

# Create the stack's containers and volumes without starting them, so the settings volume
# exists the way Docker Compose expects, then unpack the backup into it (as root, in a container).
mkdir -p volumes
# With a published app image (APP_IMAGE set), download it rather than building from source.
if grep -q '^APP_IMAGE=.' .env; then docker compose pull --quiet app || true; fi
docker compose up --no-start >/dev/null
docker run --rm \
  -v "$PWD/volumes:/data/volumes" \
  -v syllabus-sync_db-config:/data/db-config \
  -v "$work:/in:ro" \
  alpine:3.20 sh -c 'find /data/db-config -mindepth 1 -delete && cd /data && tar xzf /in/data.tar.gz'

echo "Starting Syllabus Sync..."
docker compose up -d
echo "Restored from $(basename "$archive"). Check it in the browser, then delete the kept-aside copies when happy."
