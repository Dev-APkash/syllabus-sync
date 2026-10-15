# Backups

Three scripts in the `selfhost` folder cover backups: `backup.sh` makes one archive with everything needed to restore,
`restore.sh` puts an archive back, and `install-backup-timer.sh` runs `backup.sh` every night. Run all of them from the
`selfhost` folder, as the user that runs Syllabus Sync (a member of the `docker` group).

## What's in an archive

Each backup is one file, `syllabus-sync-<YYYY-MM-DD-HHMMSS>.tar.gz`, containing:

- `data.tar.gz`, which holds:
  - `volumes/db/data`: the database (accounts, courses, deadlines, marks, feedback, encrypted Canvas links).
  - `volumes/storage`: the uploaded syllabus PDFs.
  - `db-config`: the database's small settings volume (the Docker volume `syllabus-sync_db-config`).
- `env`: a copy of `.env`, with every secret and your Anthropic key.

Not included: the code, `docker-compose.yml` and the scripts (get them again from the release), Docker images, and
your Tailscale or reverse proxy settings. The archive doesn't record which version made it either, so note your
version (`git describe --tags` in the repository folder) somewhere alongside your backups.

**The archive is not encrypted and contains your secrets and everyone's data.** `backup.sh` creates it readable only
by you. Keep every copy somewhere private, and encrypt copies that leave your network.

## Make a backup

```bash
bash backup.sh
```

It stops Syllabus Sync for about a minute so the copy is consistent, writes the archive, and starts everything again,
even if something went wrong along the way. While it's stopped, the app and the calendar feeds don't answer; calendar
apps keep showing their last copy. It prints the archive's path and size when it's done.

Two optional settings, given as environment variables:

- **`BACKUP_DIR`**: where archives go. Default `~/syllabus-sync-backups`. Example:
  `BACKUP_DIR=/mnt/backups bash backup.sh`.
- **`KEEP`**: how many archives to keep. Default 7; older ones in that folder are deleted after each run. Example:
  `KEEP=14 bash backup.sh`. Only files named `syllabus-sync-*.tar.gz` are counted or deleted.

## Back up every night

```bash
bash install-backup-timer.sh
```

It asks for your `sudo` password and installs a systemd timer that runs `backup.sh` as you every night at 3:30, with a
random delay of up to 15 minutes. If the machine was off at that time, the backup runs at the next start. Useful
commands:

```bash
systemctl list-timers syllabus-sync-backup.timer                   # when the next run is
sudo systemctl start syllabus-sync-backup.service                  # run one now
journalctl -u syllabus-sync-backup.service -n 20 --no-pager        # how the last runs went
```

The timer uses the default folder and keeps 7 archives. To change that, run
`sudo systemctl edit syllabus-sync-backup.service` and add:

```ini
[Service]
Environment=BACKUP_DIR=/mnt/backups
Environment=KEEP=14
```

To remove the timer:

```bash
sudo systemctl disable --now syllabus-sync-backup.timer
sudo rm /etc/systemd/system/syllabus-sync-backup.service /etc/systemd/system/syllabus-sync-backup.timer
sudo systemctl daemon-reload
```

Backups made by your hypervisor (for example Proxmox) work too and cover everything on the machine. Either way, keep
reading: a copy on the same disk isn't enough.

## Copy backups off the machine

An archive on the same disk is lost with the disk. Some ways to keep a second copy:

- Point `BACKUP_DIR` at a mounted share on your NAS.
- Copy the folder after each run, for example `rsync -a ~/syllabus-sync-backups/ <user>@<backup-host>:syllabus-sync/`.
  Old archives on the other side are yours to clean up.
- For cloud storage, encrypt first: restic encrypts by default, or use `gpg --symmetric` on each archive.

## Restore on the same machine

```bash
bash restore.sh ~/syllabus-sync-backups/syllabus-sync-<date>.tar.gz
```

It asks you to type `RESTORE`, stops Syllabus Sync, and replaces the database, the uploaded PDFs and `.env` with the
backup's. Nothing is deleted: the current data is moved to `volumes.before-restore-<time>`, and the current `.env` to
`.env.before-restore-<time>` if it differs. Then everything starts again, and the `migrate` container brings the
database up to the version you have installed.

Check the app in the browser. When you're happy, remove the kept-aside copies. The database files belong to the
database container's user, so this needs `sudo`:

```bash
sudo rm -rf volumes.before-restore-<time>
rm -f .env.before-restore-<time>
```

Restore onto the same version of Syllabus Sync that made the backup, or a newer one. An older version can't run on a
database that a newer one has already changed.

## Restore on a new machine

1. Install Docker and add your user to the `docker` group ([install.md](install.md#requirements)).

2. Get the same release that made the backup, or a newer one, and copy the archive to the machine:

   ```bash
   git clone https://github.com/Dev-APkash/syllabus-sync.git
   cd syllabus-sync && git checkout <version> && cd selfhost
   ```

3. Put the backup's settings in place first. `restore.sh` stops the old stack before it unpacks `.env`, and Docker
   Compose won't run without one:

   ```bash
   tar xzf ~/syllabus-sync-<date>.tar.gz env && mv env .env && chmod 600 .env
   ```

4. Restore:

   ```bash
   bash restore.sh ~/syllabus-sync-<date>.tar.gz
   ```

   The first time, this also downloads (or builds) the images, so it takes longer.

5. If the new machine has a different address, set `SITE_URL` (and `APP_BIND` if needed) in `.env`, run
   `docker compose up -d`, and set up Tailscale Serve or your proxy for it. Calendar subscriptions then need the new
   link from Settings.

## Try a restore once

A backup you've never restored is only a hope. Once, after setting up backups, prove that yours work:

1. Make a backup with `bash backup.sh`.
2. Change something you'll recognise, such as ticking a deadline as done.
3. Restore that backup with `bash restore.sh`.
4. Check that the change is gone, that you can sign in, and that a syllabus PDF still opens.

Better still, do it on a spare VM by following "Restore on a new machine", which also proves you have everything you
need if the original machine is gone.
