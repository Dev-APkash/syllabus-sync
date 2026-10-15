# Install Syllabus Sync

This guide installs Syllabus Sync on one Linux machine with Docker Compose. It assumes you're comfortable with SSH, a
text editor and basic Docker commands. Plan on about 30 minutes, most of it waiting for downloads.

You end up with the app and a trimmed Supabase (Postgres, sign-in, file storage) in containers, behind a single front
door (Caddy) that listens on `127.0.0.1:8080` by default:

```text
browser ──► https://<your-address>   (Tailscale Serve or your own reverse proxy)
                 │
                 ▼
127.0.0.1:8080 ──► caddy ─┬─ /auth/v1, /rest/v1, /storage/v1 ──► API gateway ──► auth, rest, storage ──► db
                          └─ everything else ─────────────────► app (Next.js)
```

Only the app and those three Supabase APIs are reachable through the front door. The database is never published, and
the admin dashboard only runs when you start it, reachable from the machine itself.

## Requirements

- **Memory:** 3 GB RAM at least, 4 GB recommended, and 2 CPU cores.
- **Disk:** about 40 GB, preferably SSD. The container images take a few GB; the rest is your database, uploaded PDFs
  and any backups you keep on the same disk. On spinning disks the first start is noticeably slow.
- **Operating system:** 64-bit Linux on **amd64 or arm64**, for example Debian 13 or Ubuntu Server 26.04 LTS.
- **Docker Engine with the Compose plugin**, installed from [Docker's own repository](https://docs.docker.com/engine/install/),
  not the Ubuntu snap. `docker compose version` must work: the scripts use Compose v2 (`docker compose`, not the old
  `docker-compose`).
- **`git`, `openssl` and `curl`**, which most distributions already include.
- **An Anthropic API key** to read syllabi, from the Anthropic Console. Set a monthly spend limit there. Without a key
  everything works except reading syllabi.
- **HTTPS for real use.** Uploading a syllabus only works on an `https://` address, because the upload page uses
  browser features that are limited to secure pages.

If you'll build the app image yourself instead of using the published one, also add 2 GB of swap: the build needs
extra memory once.

Let your user run Docker without `sudo` (the scripts and the backup timer need this), then log out and back in:

```bash
sudo usermod -aG docker $USER
```

Membership of the `docker` group is equivalent to root on that machine, so only add people who should have it.

## Choose how you'll reach it

Decide this before installing: `setup.sh` asks for the address, and it becomes `SITE_URL`. You can change it later
(see [configuration.md](configuration.md)).

### Option A: Tailscale Serve (recommended)

Private to the devices on your tailnet, with a real HTTPS certificate and nothing opened on your network.

1. Install Tailscale on the server and sign in:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

   Install it on the phones and laptops you'll use too, signed in to the same tailnet.

2. In the Tailscale admin console, open **DNS**, turn on **MagicDNS**, and under **HTTPS Certificates** choose
   **Enable HTTPS**. Certificates are public records, so your machine and tailnet names appear in certificate
   transparency logs; rename the machine first if its name says more than you'd like.

3. Publish the front door to your tailnet:

   ```bash
   sudo tailscale serve --bg 8080
   ```

   It prints the address, `https://<machine>.<tailnet>.ts.net`, and keeps serving in the background, also after a
   reboot. `tailscale serve status` shows it again. Until the app is running, the address answers with an error.

4. Use that address as the site address. Leave `APP_BIND=127.0.0.1` and `APP_PORT=8080` as they are.

Only devices on your tailnet can open it, so Google Calendar can't fetch the calendar feed (see the
[FAQ](faq.md#why-cant-i-subscribe-in-google-calendar)).

### Option B: your own domain behind a reverse proxy

Use this if you already run Caddy, Traefik or Nginx Proxy Manager with certificates for your domain. Your proxy
handles HTTPS for `https://syllabus.<your-domain>` and forwards everything to `http://<host>:8080`.

The proxy must:

- **Use its own hostname, at the root.** A sub-path such as `https://<your-domain>/syllabus` doesn't work: the app and
  the Supabase APIs both expect the root of the address.
- **Serve HTTPS.**
- **Forward every path**, not just `/`: `/auth/v1`, `/rest/v1` and `/storage/v1` go through the same address.
- **Keep the original `Host` header** and send `X-Forwarded-Proto`. Most proxies do both by default.
- **Accept request bodies of at least 10 MB**, the largest PDF the app takes.
- **Wait up to 5 minutes for a response.** Reading a long syllabus is one request that can take about four minutes.

Choose `APP_BIND` (in `.env`, after running `setup.sh`) so the proxy can reach the front door:

- **Proxy on the same machine, not in a container:** keep `127.0.0.1` and point the proxy at `http://127.0.0.1:8080`.
- **Proxy on another machine, or in a container:** set `APP_BIND=<lan-ip>`, this machine's LAN address, and point the
  proxy at `http://<lan-ip>:8080`. Inside a container, `127.0.0.1` is the container itself, not the host.
- **Avoid `0.0.0.0`** unless you need it. It listens on every network interface, so anyone who can reach the machine
  can skip the proxy and use plain http. If you do use it, firewall port 8080 so only the proxy can connect. Ports
  published by Docker bypass ufw's rules, so filter in front of the machine (your hypervisor's or router's firewall)
  or in Docker's `DOCKER-USER` iptables chain.

**Caddy:**

```caddyfile
syllabus.<your-domain> {
    reverse_proxy <host>:8080
}
```

Caddy keeps the `Host` header, adds the forwarding headers, and sets no upload size or response time limits by default.

**Nginx:**

```nginx
server {
    listen 443 ssl;
    server_name syllabus.<your-domain>;
    # ... your existing ssl_certificate lines ...

    client_max_body_size 20m;        # the default of 1 MB is too small for PDFs

    location / {
        proxy_pass http://<host>:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;     # the default of 60 s cuts off long syllabus readings
    }
}
```

**Traefik:** add a router with the rule ``Host(`syllabus.<your-domain>`)`` on your HTTPS entry point and certificate
resolver, pointing at a service whose server URL is `http://<host>:8080` (for example through the file provider).
Traefik passes the `Host` header through and sets `X-Forwarded-Proto` by default. If you've added a buffering
middleware or changed the forwarding timeouts, allow at least 20 MB and 300 seconds.

**Nginx Proxy Manager:** add a proxy host for `syllabus.<your-domain>` with scheme `http`, forward hostname `<host>`
and port `8080`. On the SSL tab, pick or request a certificate and turn on Force SSL. On the Advanced tab, add
`proxy_read_timeout 300s;` and `client_max_body_size 20m;`. It keeps the `Host` header and sets `X-Forwarded-Proto` by
default.

The site address is then `https://syllabus.<your-domain>`. If the proxy is reachable from the internet, so is the
sign-in page: read [security.md](security.md) and turn sign-ups off as soon as your accounts exist.

### Option C: local network over plain http (testing only)

For a quick look from another computer on your network, without HTTPS:

- Site address: `http://<lan-ip>:8080`, where `<lan-ip>` is this machine's LAN address.
- In `.env`, after running `setup.sh`: `APP_BIND=0.0.0.0` (or `APP_BIND=<lan-ip>`).

The catches: nothing is encrypted, so passwords and session cookies cross your network in the clear; browsers mark the
page as not secure; and **uploading syllabi doesn't work**, because the upload page needs browser features that only
exist on HTTPS pages. Fine for looking around, not for real use. Moving to option A or B later only means changing
`SITE_URL` and `APP_BIND` and running `docker compose up -d`; accounts and data stay.

## Install

All commands run on the server.

1. **Get the code.** Download the latest release. With git:

   ```bash
   git clone https://github.com/Dev-APkash/syllabus-sync.git
   cd syllabus-sync
   git checkout <version>        # the newest release tag, for example v0.1.0
   cd selfhost
   ```

   Everything from here runs in the `selfhost` folder. You need the repository even with a published image: it holds
   the compose file, the database migrations and the scripts.

2. **Create the settings and secrets:**

   ```bash
   bash setup.sh
   ```

   It asks for the site address from the option you chose and for your Anthropic key (hidden while you type; leave it
   empty to add it later). It writes `.env` with fresh random secrets, readable only by you, and creates the
   `volumes` folder for your data. **Save a copy of `.env` in your password manager**: without it you can't get back
   into the database. For option B or C, edit `APP_BIND` in `.env` now.

3. **Start it.** `setup.sh` set `APP_IMAGE=ghcr.io/dev-apkash/syllabus-sync:0.1` (the newest 0.1.x release), so
   nothing is built on your machine:

   ```bash
   docker compose pull
   docker compose up -d
   ```

   To build the app from source instead, empty `APP_IMAGE` in `.env` and run `docker compose up -d --build` (5–15
   minutes the first time, and it needs about 4 GB of free memory). Either way this downloads the other images,
   prepares the database and starts everything. Then check:

   ```bash
   docker compose ps               # every service up; those with health checks show (healthy)
   docker compose logs migrate     # should end with "Database is up to date."
   ```

   `migrate` runs once and exits, so it only appears in `docker compose ps -a`.

4. **Optional: run the smoke test.**

   ```bash
   bash smoke-test.sh                           # checks the front door on this machine (APP_BIND:APP_PORT)
   bash smoke-test.sh https://<your-address>    # or the whole path through Tailscale or your proxy
   ```

   It creates a throwaway account, checks sign-up, the privacy rules and uploads, deletes the account again and prints
   PASS or FAIL for each check. It needs sign-ups to be on, so run it before step 6. If `APP_BIND` is a LAN address,
   pass `http://<lan-ip>:8080`.

5. **Create your account.** Open the site address, choose Sign up and pick a password of at least 8 characters. No
   confirmation email is needed. Upload a syllabus to check that reading works. There's no special admin account in
   the app: administration happens on the server, with the commands in these docs.

6. **Turn sign-ups off** once everyone who should have an account has one. Set `DISABLE_SIGNUP=true` in `.env`, then:

   ```bash
   docker compose up -d
   ```

## Next steps

- Set up nightly backups and copy them off the machine: [backups.md](backups.md).
- Subscribe to your deadlines: in the app, open Settings and copy the link under Calendar feed.
- Read through the settings and the security notes: [configuration.md](configuration.md), [security.md](security.md).
- Everyday commands and the admin dashboard (Supabase Studio): [selfhost/README.md](../selfhost/README.md).

## If something goes wrong

- **`docker compose up` stops at `migrate`:** `docker compose logs migrate` shows which SQL file failed and why.
- **The page loads but sign-up fails:** check `docker compose logs auth`, and that `SITE_URL` in `.env` is exactly the
  address in your browser's address bar (scheme, host, port, no trailing slash).
- **Upload fails:** check `docker compose logs storage`. Are you on an `https://` address? Behind your own proxy, check
  its upload size limit.
- **Reading a syllabus fails after about a minute** behind your own proxy: raise the proxy's response timeout.
- **The build is killed or freezes:** the machine ran out of memory. Add swap or RAM, then build again.
- **Nothing answers at the address:** `tailscale serve status` (option A) or your proxy's logs, and `docker compose ps`
  (is `caddy` running?).
