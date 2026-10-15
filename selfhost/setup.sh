#!/bin/bash
# One-time setup for a self-hosted Syllabus Sync. Run on the server, from this folder:
#
#   bash setup.sh
#
# Creates .env with fresh random secrets and the classic Supabase API keys (signed JWTs),
# using the same method as Supabase's utils/generate-keys.sh (Apache-2.0). Secrets are
# written to .env only (readable by you alone) and never printed.
set -euo pipefail
cd "$(dirname "$0")"

if [ -e .env ]; then
  echo "A .env file already exists here. Delete or rename it first if you really want new secrets"
  echo "(new secrets on an existing install will lock you out of the existing database)."
  exit 1
fi
for tool in openssl docker; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing '$tool'. Install it first (see README.md)."; exit 1; }
done

# ---- Questions ----
echo "Syllabus Sync setup"
echo
echo "1) The address you'll open the app at."
echo "   With Tailscale Serve this looks like https://<vm-name>.<your-tailnet>.ts.net"
read -rp "   Address: " site_url
site_url="${site_url%/}"
case "$site_url" in
  http://* | https://*) ;;
  *) echo "The address must start with https:// (or http:// for a quick local test)."; exit 1 ;;
esac

echo
echo "2) Your Anthropic API key (for reading syllabi). Leave empty to add it to .env later."
read -rsp "   Key (hidden while you type): " anthropic_key
echo

# ---- Secrets ----
gen_hex() { openssl rand -hex "$1"; }
gen_base64() { openssl rand -base64 "$1" | tr -d '\n'; }
base64_url() { openssl enc -base64 -A | tr '+/' '-_' | tr -d '='; }

jwt_secret=$(gen_hex 32)
sign_jwt() {
  local header payload unsigned signature
  header=$(printf '%s' '{"alg":"HS256","typ":"JWT"}' | base64_url)
  payload=$(printf '%s' "$1" | base64_url)
  unsigned="${header}.${payload}"
  signature=$(printf '%s' "$unsigned" | openssl dgst -binary -sha256 -hmac "$jwt_secret" | base64_url)
  printf '%s' "${unsigned}.${signature}"
}
iat=$(date +%s)
exp=$((iat + 5 * 365 * 24 * 3600)) # the API keys are valid for 5 years
anon_key=$(sign_jwt "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":${iat},\"exp\":${exp}}")
service_role_key=$(sign_jwt "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":${iat},\"exp\":${exp}}")

# ---- Write .env (owner-only permissions before any secret goes in) ----
umask 077
cat >.env <<EOF
# Syllabus Sync self-hosted settings. Created by setup.sh on $(date -u +%Y-%m-%d).
# Contains secrets: never commit, share or paste this file. Back it up in your password manager.

# Where you open the app
SITE_URL=${site_url}
# The VM-local port Caddy listens on (Tailscale Serve forwards HTTPS to it)
APP_BIND=127.0.0.1
APP_PORT=8080
# Which app image to run: the published one (":0.1" = the newest 0.1.x, with bug fixes), so nothing is
# built here. Empty = build it from this folder's source instead (docker compose up -d --build).
APP_IMAGE=ghcr.io/dev-apkash/syllabus-sync:0.1

# Claude API (needed to read syllabi)
ANTHROPIC_API_KEY=${anthropic_key}
ANTHROPIC_MODEL=claude-sonnet-5
MAX_EXTRACTIONS_PER_DAY=10
EXTRACTION_ENABLED=true

# Sign-ups. Autoconfirm = no email server needed. Set DISABLE_SIGNUP=true once your accounts exist.
DISABLE_SIGNUP=false
ENABLE_EMAIL_AUTOCONFIRM=true

# Optional email server (for password-reset emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_ADMIN_EMAIL=
SMTP_SENDER_NAME=Syllabus Sync

# ---- Generated secrets: don't edit ----
POSTGRES_PASSWORD=$(gen_hex 24)
JWT_SECRET=${jwt_secret}
ANON_KEY=${anon_key}
SERVICE_ROLE_KEY=${service_role_key}
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=$(gen_hex 16)
PG_META_CRYPTO_KEY=$(gen_base64 24)
S3_PROTOCOL_ACCESS_KEY_ID=$(gen_hex 16)
S3_PROTOCOL_ACCESS_KEY_SECRET=$(gen_hex 32)
# Encrypts linked Canvas tokens. Changing it means everyone has to link Canvas again.
CANVAS_TOKEN_KEY=$(gen_hex 32)
EOF
chmod 600 .env

mkdir -p volumes/db/data volumes/storage

echo
echo "Done. Created .env (readable only by you) and the data folders in ./volumes."
echo "Next: docker compose pull && docker compose up -d    (uses the published app image; see docs/install.md)"
