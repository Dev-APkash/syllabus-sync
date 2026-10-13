# Configuration

Every setting lives in `selfhost/.env`. `setup.sh` creates it with fresh secrets; don't copy `.env.example` by hand
(it only shows the shape, with fake values). Docker Compose reads `.env` whenever you run a `docker compose` command.

To change a setting, edit `.env` and run:

```bash
docker compose up -d
```

Compose recreates only the containers whose settings changed, so a change usually means a short interruption. Keep
`.env` readable only by you (`chmod 600 .env`) and keep a current copy in your password manager.

## Address and network

- **`SITE_URL`** (asked by `setup.sh`, required). The address people open the app at, exactly as the browser shows it:
  `https://<machine>.<tailnet>.ts.net`, `https://syllabus.<your-domain>` or, for testing, `http://<lan-ip>:8080`.
  Include the port if it isn't the default, and no trailing slash. The browser reaches the Supabase APIs through the
  same address, sign-in redirects and email links use it, and the calendar feed links are built from it.

  After changing: `docker compose up -d`. (Older versions built this value into the app and needed
  `docker compose up -d --build` instead.) Everyone then signs in again at the new address, and calendar subscriptions
  have to be added again with the new link from Settings.

- **`APP_BIND`** (default `127.0.0.1`). The network address the front door (Caddy) listens on. `127.0.0.1` means only
  this machine, which is right behind Tailscale Serve or a reverse proxy on the same machine. A LAN address lets a
  proxy on another machine or in a container reach it. `0.0.0.0` means every interface; firewall it (see
  [install.md](install.md#option-b-your-own-domain-behind-a-reverse-proxy)). `reset-password.sh` and `smoke-test.sh`
  connect to this address (or to `127.0.0.1` when it's `0.0.0.0`).

- **`APP_IMAGE`** (default `ghcr.io/dev-apkash/syllabus-sync:0.1`). Which app image to run. A published image
  (`:0.1` follows the newest 0.1.x release; `:0.1.0` pins one exact version) is downloaded with
  `docker compose pull`, and nothing is built. Empty: Compose builds it from the source in this repository
  (`docker compose up -d --build`).
  Use the version that matches the repository you checked out, since the repository holds the matching database
  migrations.

- **`APP_PORT`** (default `8080`). The port the front door listens on. Tailscale Serve or your proxy must point at
  the same port, for example `sudo tailscale serve --bg 8080`.

- **`STUDIO_PORT`** (default `3001`, not in `.env` unless you add it). The port of the optional admin dashboard,
  Supabase Studio. It always listens on `127.0.0.1` only.

## AI reading

- **`ANTHROPIC_API_KEY`** (empty unless you gave one to `setup.sh`). The key used to send syllabi to Anthropic's API.
  Every reading by every user on this install is billed to it, so set a monthly spend limit in the Anthropic Console.
  Without a key, everything works except reading syllabi, which fails with "Syllabus reading isn't set up correctly".

- **`ANTHROPIC_MODEL`** (default `claude-sonnet-5`). The Claude model that reads syllabi. A model name the API doesn't
  know makes readings fail with the same message as a missing key. The app estimates the cost of each reading for
  `claude-sonnet-5` and `claude-haiku-4-5` models; with any other model, readings work but their cost is recorded as
  unknown.

- **`MAX_EXTRACTIONS_PER_DAY`** (default `10`). How many syllabus readings each user can start in any 24 hours,
  counting finished readings (successful or not) and readings in progress. A reading costs about $0.05–0.30 with the
  default model. Values above 100 are treated as 100; a missing or invalid value means 10. The limit is enforced inside
  the database, so many requests at the same moment can't get around it.

- **`EXTRACTION_ENABLED`** (default `true`). Set `false` to pause all AI calls at once, for example if costs look
  wrong. Users then see "Syllabus reading is temporarily paused"; their uploads are kept. Any other value means on.

These limits are fixed in the code, not settings: PDFs of up to 10 MB and 30 pages (longer ones are refused before any
AI call), at most 3 readings per syllabus, and one reading at a time per syllabus. When a user uploads a file they've
already had read, the earlier result is reused without a new AI call.

## Accounts and email

- **`DISABLE_SIGNUP`** (default `false`). Set `true` once everyone who should have an account has one; until then,
  anyone who can reach the address can create an account. To add someone later, set it back to `false`, let them sign
  up, then set it to `true` again.

- **`ENABLE_EMAIL_AUTOCONFIRM`** (default `true`). New accounts work straight away, without a confirmation email. Set
  `false` only once the email settings below work, or nobody can finish signing up.

- **`SMTP_HOST`**, **`SMTP_PORT`** (default `587`), **`SMTP_USER`**, **`SMTP_PASS`** (all empty by default). An
  optional email server, from any provider that offers SMTP. With it, "Forgot password?" sends reset emails, and you can
  turn on confirmation emails. Without it, reset passwords on the server with `reset-password.sh` (see the
  [FAQ](faq.md#i-forgot-my-password-and-theres-no-email-server)).

- **`SMTP_ADMIN_EMAIL`** (empty) and **`SMTP_SENDER_NAME`** (default `Syllabus Sync`). The address and name emails are
  sent from.

Fixed in the code: passwords need at least 8 characters (checked by the sign-in service too, not only the form), and
sign-in tokens last an hour and renew automatically while someone uses the app.

## Canvas

- **`CANVAS_TOKEN_KEY`** (generated by `setup.sh`). Encrypts the Canvas access tokens users link in Settings. It must
  be 64 hexadecimal characters (32 random bytes); empty or malformed switches Canvas linking off. Changing it makes the
  stored tokens unreadable, so everyone has to link Canvas again. For a `.env` made before this setting existed, add
  one and restart:

  ```bash
  echo "CANVAS_TOKEN_KEY=$(openssl rand -hex 32)" >> .env
  docker compose up -d
  ```

## Generated secrets: never change these

`setup.sh` generates these once. Changing any of them on an existing install locks services out of the database, logs
everyone out or makes stored data unreadable. Restoring a backup brings back the `.env` that belongs to that data.

- **`POSTGRES_PASSWORD`**: the password of the database's internal accounts (used by sign-in, storage, the REST API
  and migrations). It's written into the database the first time it starts; editing `.env` afterwards doesn't change
  the database, so the services can no longer log in.
- **`JWT_SECRET`**: signs every sign-in token and the two API keys below. Anyone who has it can act as any user.
- **`ANON_KEY`**: the public API key. Every browser receives it, by design: it only allows what the database's access
  rules allow.
- **`SERVICE_ROLE_KEY`**: the admin API key, which bypasses the access rules. It never reaches the browser. In the app
  only the calendar feed and account deletion use it; `reset-password.sh` and `smoke-test.sh` use it too.
- **`DASHBOARD_USERNAME`** (default `supabase`) and **`DASHBOARD_PASSWORD`**: protect the API gateway's dashboard
  route, kept from Supabase's own setup. The front door never forwards to that route.
- **`PG_META_CRYPTO_KEY`**: used by Supabase Studio and its helper service when you start them.
- **`S3_PROTOCOL_ACCESS_KEY_ID`** and **`S3_PROTOCOL_ACCESS_KEY_SECRET`**: credentials for the storage service's
  S3-compatible interface. The app doesn't use it; keep them secret anyway.

`ANON_KEY` and `SERVICE_ROLE_KEY` are signed to stay valid for five years from the day `setup.sh` ran.
