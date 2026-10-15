# Syllabus Sync documentation

Syllabus Sync reads course syllabus PDFs with Claude, lets each student check the deadlines, exams and grade weights it
found beside the original PDF, and publishes the confirmed deadlines as a calendar feed. It also has a grade calculator
and optional read-only Canvas linking. These guides are for people running their own copy with Docker Compose.

## Guides

- [Install](install.md): requirements, the three ways to reach it (Tailscale Serve, your own domain behind a reverse
  proxy, or plain http on your local network for testing), and the install steps.
- [Configuration](configuration.md): every setting in `.env`, its default and what changing it does.
- [Backups](backups.md): making backups, nightly backups, copying them off the machine, and restoring, on the same
  machine or a new one.
- [Upgrading](upgrading.md): moving to a new version, how database changes are applied, rolling back, and reading the
  changelog.
- [Security](security.md): what's exposed, where the secrets are, how Canvas tokens are protected, what leaves your
  server, and how to report a security problem.
- [FAQ](faq.md): costs, Google Calendar, forgotten passwords, sharing an install, uninstalling and more.

## Also useful

- [selfhost/README.md](../selfhost/README.md): a one-page reference with everyday commands, the admin dashboard
  (Supabase Studio) and troubleshooting.
- [CHANGELOG.md](../CHANGELOG.md): what changed in each version.

## The short version

On a Linux machine with Docker, after choosing how you'll reach it ([install.md](install.md)):

```bash
git clone https://github.com/Dev-APkash/syllabus-sync.git
cd syllabus-sync && git checkout v0.1.0 && cd selfhost   # or the newest release tag
bash setup.sh                     # asks for the site address and your Anthropic key, writes .env
docker compose up -d
```

Then open the site address, create your account, set `DISABLE_SIGNUP=true` in `.env`, run `docker compose up -d`
again, and set up backups.
