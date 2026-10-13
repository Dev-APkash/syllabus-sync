# Frequently asked questions

## How much does reading a syllabus cost?

About $0.05–0.30 per syllabus with the default model, charged to the Anthropic key in `.env`. Each install uses its
own key, so the person running it pays for every reading on it. The app keeps costs bounded:

- Each user can start at most `MAX_EXTRACTIONS_PER_DAY` readings in any 24 hours (default 10).
- Each syllabus can be read at most 3 times.
- PDFs over 30 pages or 10 MB are refused before anything is sent to Anthropic.
- If a user uploads a file they've already had read, the earlier result is reused for free.

For a hard ceiling, set a monthly spend limit in the Anthropic Console. To stop all readings at once, set
`EXTRACTION_ENABLED=false` in `.env` and run `docker compose up -d`.

## How do I see what readings have cost so far?

Every reading is logged with its token counts and an estimated cost. From the `selfhost` folder:

```bash
docker compose exec db psql -U postgres -c "select date_trunc('month', created_at)::date as month, count(*) as readings, sum(cost_usd) as usd from public.extraction_runs group by 1 order by 1;"
```

The amounts are estimates; the Anthropic Console shows what you were actually charged.

## Does it work without an Anthropic key?

Everything except reading syllabi works: accounts, course pages, the calendar feed, the grade calculator and Canvas
linking. But reading syllabi is what fills in the deadlines, so without a key there's little to see. You can add the key
to `.env` at any time and run `docker compose up -d`.

## Can I use a different Claude model?

Yes: set `ANTHROPIC_MODEL` in `.env`. The default, `claude-sonnet-5`, is the one the app was developed with. The cost
estimate only knows `claude-sonnet-5` and `claude-haiku-4-5` prices; other models work, but their cost is logged as
unknown.

## Why can't I subscribe in Google Calendar?

Google Calendar fetches subscribed calendars from Google's own servers, not from your phone or laptop, so it can only
reach an address that's public on the internet. A tailnet or home network address doesn't work. Calendar apps that
fetch the feed from the device itself, such as Apple Calendar on a device signed in to your tailnet, work. On a Mac,
choose On My Mac rather than iCloud as the subscription's location: iCloud subscriptions are refreshed by Apple's
servers, which can't reach a private address either.

For Google Calendar you need a public HTTPS address, for example your own domain behind a reverse proxy that's
reachable from the internet ([install.md](install.md#option-b-your-own-domain-behind-a-reverse-proxy)). Calendar apps
refresh subscriptions on their own schedule, often every few hours, so edits take a while to show up.

## What happens to subscribed calendars when my server is down?

Calendar apps keep showing the last copy they fetched. If the app is running but the database isn't answering, the
feed returns an error rather than an empty calendar, so subscribed calendars don't lose their events.

## I forgot my password and there's no email server

From the `selfhost` folder on the server:

```bash
bash reset-password.sh <account-email>
```

It asks for the new password twice (at least 8 characters) and connects to the front door at `APP_BIND` (or
`127.0.0.1` when that's `0.0.0.0`). To make "Forgot password?" send emails instead, fill in the
`SMTP_*` settings ([configuration.md](configuration.md#accounts-and-email)).

## Can friends or family use my install?

Yes. Everyone gets their own account, and the database keeps each person's courses, PDFs, marks and Canvas link
separate. Before you invite anyone:

- They need to reach the address: invite them to your tailnet, or share the machine with them in Tailscale.
- Their readings are paid for by your Anthropic key. The daily limit applies to each person separately.
- You, as the person running the server, can see their data. The in-app privacy page says so; tell them anyway.
- If sign-ups are off, set `DISABLE_SIGNUP=false`, let them sign up, then set it back to `true`.

## What do I need for Canvas linking?

- `CANVAS_TOKEN_KEY` in `.env`. `setup.sh` creates it ([configuration.md](configuration.md#canvas)).
- A school whose Canvas lets students create their own access tokens (Account → Settings → New access token). Some
  schools turn this off; then Canvas linking isn't possible.
- A Canvas address on https, which your server can reach.

The app only reads from Canvas and never changes anything there. See [security.md](security.md#canvas-tokens) for how
tokens are protected.

## Where does my data live?

On your machine, in the `selfhost` folder: `volumes/db/data` (the database: accounts, courses, deadlines, marks,
feedback and encrypted Canvas links), `volumes/storage` (the uploaded PDFs), the Docker volume
`syllabus-sync_db-config` (database settings) and `.env` (the secrets). Backups go to `~/syllabus-sync-backups` by
default. The only thing that leaves the machine is each PDF sent to Anthropic for reading
([security.md](security.md#what-leaves-your-server)).

## Where does in-app feedback go?

The "Something wrong? Tell us" form saves messages to the `public.feedback` table in your own database; nobody else
receives them. Read them with:

```bash
docker compose exec db psql -U postgres -c "select created_at, page, message from public.feedback order by created_at desc;"
```

## Will it run on a small machine?

It needs at least 3 GB of RAM; 4 GB is more comfortable. Building the app from source needs extra memory once, so on
a 3 GB machine add 2 GB of swap or use the published image. Leave Supabase Studio stopped when you're not using it
(it's off by default). A fast disk matters more than a fast CPU: put the database on an SSD. Both amd64 and arm64 are
supported.

## Can I make it reachable from the internet?

Yes, with your own domain behind a reverse proxy ([install.md](install.md#option-b-your-own-domain-behind-a-reverse-proxy)).
The sign-in page and the three Supabase APIs then become public too, so turn sign-ups off once your accounts exist,
keep the install updated, and read [security.md](security.md) first. If you don't need Google Calendar or access
without Tailscale, the private Tailscale Serve setup is simpler and safer.

## How do I uninstall it cleanly?

From the `selfhost` folder:

```bash
docker compose --profile studio down -v --rmi all     # containers, Docker volumes and images
sudo rm -rf volumes volumes.before-restore-*           # database files and PDFs (owned by container users)
rm -f .env .env.before-restore-*
sudo systemctl disable --now syllabus-sync-backup.timer
sudo rm -f /etc/systemd/system/syllabus-sync-backup.service /etc/systemd/system/syllabus-sync-backup.timer
sudo systemctl daemon-reload
```

Then delete the repository folder, your backups (`~/syllabus-sync-backups` and any copies elsewhere: they contain your
secrets), and the Tailscale Serve setting (`sudo tailscale serve reset`, which clears every Serve setting on that
machine) or your reverse proxy's entry.
