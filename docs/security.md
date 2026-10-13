# Security

What a Syllabus Sync install exposes, where its secrets are, and what you're responsible for as the person running it.

## What's reachable

- **One published port.** Normally only the front door (Caddy) has one, on `APP_BIND:APP_PORT`, by default
  `127.0.0.1:8080`: reachable from the machine itself and nowhere else until you put Tailscale Serve or a reverse proxy
  in front of it.
- **Through the front door:** the app, and exactly three Supabase APIs: `/auth/v1` (sign-up, sign-in, password
  reset), `/rest/v1` (the database API) and `/storage/v1` (file storage). Everything else Supabase's API gateway
  offers, such as its database administration API, isn't forwarded; `smoke-test.sh` checks that one.
- **Never published:** Postgres and the internal services. Supabase Studio, the admin dashboard, runs only when you
  start it with `docker compose --profile studio up -d`, and then only on `127.0.0.1:3001`; reach it through an SSH
  tunnel. Studio has no login of its own here, so anyone who can reach its port controls the database.
- **Keep it that way:** don't add `ports:` to the `db` service, don't change Studio's `127.0.0.1`, and stop Studio
  when you're done (`docker compose --profile studio stop studio meta`).

The recommended setup, Tailscale Serve, keeps the whole app private to your tailnet. If you serve it from your own
domain and that address is reachable from the internet, then the sign-in page and the three APIs are too. That works,
but turn sign-ups off, keep the install updated, and consider limiting who can reach the proxy. Never expose the front
door over plain http on the internet.

## Who can see what

- **Row Level Security** in the database means each user can only read and change their own courses, deadlines,
  marks, PDFs and Canvas link, even when they call the public APIs directly with the public key. The rules apply to
  every table and to the file storage bucket.
- **The admin key** (`SERVICE_ROLE_KEY`), which bypasses those rules, is used in exactly two places in the app: the
  calendar feed and account deletion. Both look up a single user and filter every query by that user.
- **Calendar feeds** use a link with a 64-character random token. Anyone with the link can see that user's deadlines
  (course codes, titles and dates; never a name or email), so users can reset it in Settings, which stops the old link.
- **You can see everything.** Whoever runs the server has access to the database, the PDFs and the backups. The
  in-app privacy page (`/privacy`) tells users this; make sure people you invite know it too.
- **Deleting an account** removes the user's files and every database row that belongs to them. Copies remain in
  backups until those are replaced.

## Secrets

- **`.env`** holds every secret: the database password, the key that signs all sign-ins (`JWT_SECRET`), the admin API
  key, the Canvas encryption key and your Anthropic key. `setup.sh` makes it readable only by you. Keep it that way,
  never commit it, and keep a copy in your password manager.
- **Backups** contain `.env` and all data, unencrypted, readable only by you. Encrypt any copy that leaves your
  network ([backups.md](backups.md)).
- **The `docker` group is root.** Anyone in it, or with `sudo`, can read every secret and all data on the machine.
- **The public API key** (`ANON_KEY`) is sent to every browser by design. On its own it allows only what Row Level
  Security allows.
- **If your Anthropic key leaks**, revoke it in the Anthropic Console, put a new one in `.env` and run
  `docker compose up -d`. Rotating the generated secrets on an existing install is not automated yet.

## Canvas tokens

- Users link Canvas with a personal access token. It's checked with Canvas, then stored encrypted (AES-256-GCM) with
  `CANVAS_TOKEN_KEY`. It's never stored as plain text, never logged and never sent back to the browser.
- It's decrypted only on the server, only while that user is viewing their own pages, and only sent to the Canvas
  address they entered (https only; requests to any other address, and redirects, are refused).
- The app only reads from Canvas (GET requests) and never changes anything there. Grades are fetched live and not
  stored, unless the user chooses to save them as their own marks in the grade calculator.
- A Canvas token can do anything its owner can do in Canvas: "read-only" is how the app behaves, not a limit of the
  token. Users should set it to expire at the end of term, and can delete it at any time in Canvas under Account →
  Settings → Approved integrations. Unlink Canvas in Settings deletes the stored copy.
- Anyone with both the database (or a backup) and `CANVAS_TOKEN_KEY` can decrypt the tokens. Backups contain both, so
  protect them accordingly. An empty `CANVAS_TOKEN_KEY` switches Canvas linking off.

## What leaves your server

- **Uploaded syllabi** go to Anthropic's API, with your key, to be read. Each PDF is sent inside the request, not
  through Anthropic's file storage. Anthropic doesn't train its models on API data, but may keep it for a limited time
  for safety reasons; see its [data retention policy](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention).
- **Canvas** is read live, from your server, with each user's own token.
- **Email**, only if you configure an SMTP server: password-reset and confirmation emails go through your provider.
- **Nothing else.** Self-hosted copies send no analytics or telemetry: Next.js telemetry is switched off in the image,
  and the hosted edition's page-view analytics only load on Vercel. Your own infrastructure (Docker image downloads,
  Tailscale) talks to its own services as usual.

## Sign-ups

- While `DISABLE_SIGNUP=false`, anyone who can reach the address can create an account and use your Anthropic key,
  within the daily limits. Set `DISABLE_SIGNUP=true` as soon as your accounts exist.
- With `ENABLE_EMAIL_AUTOCONFIRM=true` (the default), email addresses aren't verified. That's fine on a private
  install; with an email server set up you can require confirmation.
- Passwords need at least 8 characters, checked by the sign-in service itself, not only by the form.

## Keep it patched

- **Syllabus Sync and its Supabase images:** upgrade when a release comes out ([upgrading.md](upgrading.md)). The
  Supabase image versions are pinned in `docker-compose.yml` and only change with a release.
- **The host:** on Debian or Ubuntu, `sudo apt install unattended-upgrades` installs security updates automatically.
  Update Docker Engine and Tailscale along with your other packages.

## Reporting a security problem

Please don't open a public issue. Open a private security advisory on GitHub instead: on the repository, go to
**Security → Report a vulnerability**. Include what you found, how to reproduce it, and which version you run.
