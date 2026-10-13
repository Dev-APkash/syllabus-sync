# Self-hosting Syllabus Sync

The reference for running your own copy: everyday commands, settings, security, backups and troubleshooting.
**To install it, follow [docs/install.md](../docs/install.md).** All the guides are listed in
[docs/README.md](../docs/README.md).

```text
Your devices
   │  https://<your address>        ← Tailscale Serve or your own reverse proxy: HTTPS
   ▼
127.0.0.1:8080 → caddy ─┬─ /auth/v1, /rest/v1, /storage/v1 → api-gw (Envoy) → auth · rest · storage → db
                        └─ everything else                 → app (Next.js)
```

Only Caddy listens on the network, and only the three APIs the app uses are reachable through it.

The short version, run in this folder on a Linux machine with Docker:

```bash
bash setup.sh                  # asks for your address and Anthropic key, generates every secret
docker compose pull && docker compose up -d   # or empty APP_IMAGE in .env and: docker compose up -d --build
```

## Everyday commands

| What                      | Command                                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| Status                    | `docker compose ps`                                                             |
| Logs (one service)        | `docker compose logs -f app` (or `auth`, `storage`, `db`, `caddy`, `migrate`)   |
| Stop / start              | `docker compose down` / `docker compose up -d`                                  |
| Update to the latest code | `git pull && docker compose up -d --build` (new migrations apply automatically) |
| Database shell            | `docker compose exec db psql -U postgres`                                       |
| Back up / restore         | `bash backup.sh` / `bash restore.sh <archive>` (see below)                      |
| Reset someone's password  | `bash reset-password.sh student@example.com` (no email server needed)           |

### Admin dashboard (Supabase Studio), when you need it

Studio is off by default and only listens on the VM itself. Start it, then open it from your laptop
through an SSH tunnel:

```bash
docker compose --profile studio up -d          # on the VM
ssh -L 3001:localhost:3001 <user>@<vm-name>     # on your laptop, then open http://localhost:3001
docker compose --profile studio stop studio meta   # on the VM, when you're done
```

## Settings

All settings live in `selfhost/.env` (made by `setup.sh`). After changing one, run `docker compose up -d`: every
setting is read when the containers start, so nothing needs rebuilding.

| Setting                                                              | Default              | What it does                                                                                              |
| -------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| `SITE_URL`                                                           | (asked by setup)     | The address you open the app at, e.g. `https://syllabus.example.ts.net`                                   |
| `APP_IMAGE`                                                          | published `:0.1`     | The app image to run (`ghcr.io/dev-apkash/syllabus-sync:0.1`). Empty: build it from source                |
| `APP_BIND` / `APP_PORT`                                              | `127.0.0.1` / `8080` | Where the front door listens. `127.0.0.1` = only this machine (behind Tailscale Serve or a reverse proxy) |
| `ANTHROPIC_API_KEY`                                                  | (empty)              | Your Claude API key. Without it, everything works except reading syllabi                                  |
| `ANTHROPIC_MODEL`                                                    | `claude-sonnet-5`    | The model that reads syllabi                                                                              |
| `MAX_EXTRACTIONS_PER_DAY`                                            | `10`                 | Syllabus readings per student per day (each costs about $0.05–0.30)                                       |
| `EXTRACTION_ENABLED`                                                 | `true`               | `false` pauses all AI calls at once (a kill switch)                                                       |
| `DISABLE_SIGNUP`                                                     | `false`              | `true` once everyone who should have an account has one                                                   |
| `ENABLE_EMAIL_AUTOCONFIRM`                                           | `true`               | New accounts work without a confirmation email. Set `false` only with SMTP set up                         |
| `SMTP_*`                                                             | (empty)              | Optional email server for password-reset emails (without it: `reset-password.sh`)                         |
| `CANVAS_TOKEN_KEY`                                                   | (generated)          | Encrypts linked Canvas tokens. Empty = Canvas linking off. Changing it unlinks everyone                   |
| `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, … | (generated)          | Generated secrets. **Don't change them** on an existing install: you'd be locked out of your data         |

## Security

- **Only one port is open**, on `127.0.0.1` by default. Put it behind Tailscale Serve (private to your
  tailnet, recommended) or your own HTTPS reverse proxy. Don't expose it over plain http on the internet.
- **Only three Supabase APIs are reachable** through the front door (`/auth/v1`, `/rest/v1`, `/storage/v1`).
  The database is never published, and Studio (the admin dashboard) only listens on the server itself, and only
  while you've started it (see above). Keep it that way: don't add `ports:` to the `db` service or change
  Studio's `127.0.0.1`.
- **Row Level Security** in the database means each student only ever sees their own courses, deadlines, files
  and Canvas link, even through the public APIs.
- **Turn sign-ups off** (`DISABLE_SIGNUP=true`) once your accounts exist, so nobody else who can reach the
  address can create one.
- **`.env` and backups contain your secrets.** Both are readable only by you; keep it that way, and keep backup
  copies somewhere private.
- **Canvas tokens** are encrypted with `CANVAS_TOKEN_KEY` and only used, on the server, to _read_ the student's
  own courses and grades. A Canvas token can do anything the student can, so set it to expire at the end of
  term; students can delete it in Canvas at any time.
- **What leaves your server:** uploaded syllabi go to Anthropic's API (using your key) to be read; Canvas is read
  live with the student's own token. Nothing else.
- **Updates:** pull the latest version and rebuild (see Everyday commands). Keep the host OS patched too (on
  Ubuntu: `sudo apt install unattended-upgrades`).

## Back up your data

Everything lives in `selfhost/volumes/` (database files and uploaded PDFs), a small database settings
volume, and `selfhost/.env` (the secrets that unlock the database). `backup.sh` puts all of it in one archive:

```bash
bash backup.sh                      # → ~/syllabus-sync-backups/syllabus-sync-<date>.tar.gz
```

It stops the app for about a minute so the copy is consistent, keeps the newest 7 archives (`KEEP=14 bash
backup.sh` for more), and writes elsewhere with `BACKUP_DIR=/mnt/backups bash backup.sh`. **The archive contains
your secrets**: it is readable only by you; keep a copy off this machine, somewhere private.

To restore (on this machine, or a new one after cloning the repo and installing Docker):

```bash
bash restore.sh ~/syllabus-sync-backups/syllabus-sync-<date>.tar.gz
```

It asks you to type `RESTORE`, keeps the current data aside in `volumes.before-restore-<time>` (delete it once
you're happy), and starts the app again. On a new machine with a different address, change `SITE_URL` in `.env`
and run `docker compose up -d`.

**Run it every night:** `bash install-backup-timer.sh` sets up a systemd timer that runs `backup.sh` around
3:30 AM (and catches up after the machine was off). Check on it with
`journalctl -u syllabus-sync-backup.service -n 20`. Your hypervisor's backups (e.g. Proxmox) work too and cover
everything. Either way, **try a restore once**: a backup you've never restored is only a hope.

## Good to know

- **Google Calendar can't reach a tailnet address.** Google fetches calendar feeds from its own servers,
  so syncing to Google needs a publicly reachable address (your own domain behind a reverse proxy, see
  [docs/install.md](../docs/install.md)). Apple Calendar on a device signed in to Tailscale works.
- **Password-reset emails need an email server.** Fill in the `SMTP_*` settings in `.env` (for example
  Resend's SMTP details) and run `docker compose up -d`.
- **Changing `SITE_URL`** only needs `docker compose up -d`: the app reads its address when it starts (older
  versions needed a rebuild).
- **Each install uses its own Anthropic key**, so each owner pays for their own syllabus readings. The
  app's daily and per-syllabus limits still apply.
- **Canvas linking** (Settings → Canvas) needs `CANVAS_TOKEN_KEY` in `.env`, which `setup.sh` creates. For an
  `.env` made before it existed, add one with `echo "CANVAS_TOKEN_KEY=$(openssl rand -hex 32)" >> .env`, then
  `docker compose up -d`. Changing the key later means everyone has to link Canvas again.

## Troubleshooting

| Symptom                                | Check                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docker compose up` stops at `migrate` | `docker compose logs migrate` shows which SQL file failed and why.                       |
| The page loads but sign-up fails       | `docker compose logs auth`. Is `SITE_URL` in `.env` exactly the address in your browser? |
| Upload fails                           | `docker compose logs storage`. Are you on the `https://` address? Uploads need HTTPS.    |
| Build is killed or freezes             | The VM ran out of memory: add swap or RAM, then run the build again.                     |
| Nothing at the address                 | `tailscale serve status` on the VM, and `docker compose ps` (is `caddy` running?).       |
