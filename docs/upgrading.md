# Upgrading

An upgrade replaces the app and, when a release changes them, the Supabase images and the database structure. Your
data stays in place. The steps below take a few minutes; the app is unavailable for part of that time.

## Before you upgrade

1. **Find your current version.** In the repository folder, `git describe --tags` prints it, for example `v0.1.0`.
   Write it down: you need it to roll back.

2. **Read the changelog** between your version and the new one: `CHANGELOG.md` in the repository, or the release
   notes on GitHub. See [Reading the changelog](#reading-the-changelog) below.

3. **Back up**, from the `selfhost` folder:

   ```bash
   bash backup.sh
   ```

   Note the archive's name. Keep it until you're sure the new version works. See [backups.md](backups.md).

## Upgrade

Update the repository first, then the images. The release's files decide which image version runs and which database
changes are applied, so pulling a new image on its own isn't enough.

```bash
cd ~/syllabus-sync                 # wherever you cloned the repository
git fetch --tags
git checkout <new-version>         # for example v0.2.0; or `git pull` if you follow a branch
cd selfhost
```

With a published image (`APP_IMAGE` is set in `.env`, the default): a bug-fix release (0.1.x) arrives by itself
with `:0.1`. For a bigger release, change the version, for example `APP_IMAGE=ghcr.io/dev-apkash/syllabus-sync:0.2`,
then:

```bash
docker compose pull
docker compose up -d
```

Building from source instead (`APP_IMAGE` is empty):

```bash
docker compose up -d --build
```

## What happens during the upgrade

Compose recreates the containers whose image or settings changed. Before the app starts, the one-shot `migrate`
container applies any new database changes:

- It runs on every `docker compose up` and goes through the SQL files in `supabase/migrations/` in name order.
- Files it has already applied are skipped. It records each one in the table `app_private.applied_migrations`, which
  the public APIs can't see.
- Each file is applied in a single transaction together with its record, so a failed migration leaves nothing
  half-applied.
- The app only starts after `migrate` has finished successfully. If a migration fails, `docker compose up` stops with
  an error and the new version of the app isn't started.

Skipping versions is fine as far as the database goes: every missing migration is applied in order. Still read the
changelog for every version you skip.

## Check the result

```bash
docker compose logs migrate        # "applying: <file>" for each new file, then "Database is up to date."
docker compose ps                  # every service up; those with health checks show (healthy)
```

To see every database change applied so far:

```bash
docker compose exec db psql -U postgres -c "select name, applied_at from app_private.applied_migrations order by name;"
```

Then open the app: sign in, open a course, and check that your calendar feed link still loads.

## If a migration fails

`docker compose logs migrate` names the file and the database's error message. Because of the single transaction, the
database is exactly as it was before that file. You can fix the cause (the release notes or an issue may explain it)
and run `docker compose up -d` again, or roll back.

## Roll back

Database changes only go forward: there are no "undo" migrations, and an older version can't be trusted to run on a
database a newer one has changed. Rolling back therefore means going back to the old version **and** restoring the
backup you made before upgrading.

Switch the code back first, then restore. `restore.sh` starts whichever version is checked out; if that's still the
new one, its migrations run again on the restored data.

1. Go back to the previous version:

   ```bash
   cd ~/syllabus-sync
   git checkout <previous-version>
   cd selfhost
   ```

2. Make sure that version's app image is the one Docker will start. With a published image, set `APP_IMAGE` in
   `.env` back to the previous version and run `docker compose pull`. If you build from source, run
   `docker compose build` (otherwise the image you built for the new version would be reused).

3. Restore the backup you made before upgrading:

   ```bash
   bash restore.sh ~/syllabus-sync-backups/syllabus-sync-<date>.tar.gz
   ```

Anything done in the app after the backup (new uploads, ticked deadlines) is gone after the restore; it's still in
`volumes.before-restore-<time>` if you need to dig something out. Please report what went wrong in an issue, with the
output of `docker compose logs migrate` or `docker compose logs app` (check it for anything private first).

## Reading the changelog

`CHANGELOG.md` follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:

- Each version has a heading with its number and date. **Unreleased** at the top lists changes that aren't in a
  release yet.
- Entries are grouped under Added, Changed, Deprecated, Removed, Fixed and Security. Read **Changed**, **Removed** and
  **Security** most carefully, along with any upgrade notes.

Versions follow [Semantic Versioning](https://semver.org/). Before 1.0, a new minor version (0.1 to 0.2) may change how
things work or need an extra step; a new patch version (0.1.0 to 0.1.1) is for fixes.

## Keep the host up to date too

Upgrading Syllabus Sync doesn't update the machine it runs on. On Debian or Ubuntu, install automatic security updates
with `sudo apt install unattended-upgrades`. Docker Engine, installed from Docker's repository, updates when you run
`sudo apt upgrade`; the Syllabus Sync containers start again on their own afterwards.
