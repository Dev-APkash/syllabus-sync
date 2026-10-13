#!/bin/bash
# Sets a new password for an account, for installs without an email server (where
# "Forgot password?" can't send its email). Run on the server, from this folder:
#
#   bash reset-password.sh student@example.com
#
# Asks for the new password twice (hidden). For automated tests only, the password can come
# from the NEW_PASSWORD environment variable instead.
set -euo pipefail
cd "$(dirname "$0")"

email="${1:-}"
if ! [[ "$email" =~ ^[^@[:space:]]+@[^@[:space:]]+$ ]]; then
  echo "Usage: bash reset-password.sh <account email>"
  exit 1
fi
[ -f .env ] || { echo "No .env here: run this from the selfhost folder of a set-up install."; exit 1; }
setting() { grep "^$1=" .env | cut -d= -f2- | tr -d '\r'; }
# The front door's address on this machine: APP_BIND, or 127.0.0.1 when it listens everywhere.
bind="$(setting APP_BIND)"
case "$bind" in "" | 0.0.0.0 | "::") bind=127.0.0.1 ;; esac
base="http://$bind:$(setting APP_PORT)"
key="$(setting SERVICE_ROLE_KEY)"

# Find the account. The email goes in as a psql variable, never pasted into the SQL itself.
id="$(printf "select id from auth.users where lower(email) = lower(:'email');\n" |
  docker compose exec -T db psql -U postgres -v email="$email" -tA)"
if [ -z "$id" ]; then
  echo "No account with the email $email."
  exit 1
fi

password="${NEW_PASSWORD:-}"
if [ -z "$password" ]; then
  read -rsp "New password for $email: " password
  echo
  read -rsp "Type it again: " again
  echo
  [ "$password" = "$again" ] || { echo "The passwords don't match. Nothing changed."; exit 1; }
fi
if [ "${#password}" -lt 8 ]; then
  echo "Use at least 8 characters. Nothing changed."
  exit 1
fi

# JSON-escape the password, and send it on standard input so it never shows in the process list.
escaped="${password//\\/\\\\}"
escaped="${escaped//\"/\\\"}"
status="$(printf '{"password":"%s"}' "$escaped" |
  curl -s -o /dev/null -w '%{http_code}' -X PUT "$base/auth/v1/admin/users/$id" \
    -H "apikey: $key" -H "Authorization: Bearer $key" -H "Content-Type: application/json" --data-binary @-)"
if [ "$status" = "200" ]; then
  echo "Password changed for $email. They can log in with it now."
else
  echo "The sign-in service answered $status. Nothing changed; check: docker compose logs auth"
  exit 1
fi
