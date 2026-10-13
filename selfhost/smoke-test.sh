#!/bin/bash
# End-to-end check of a running self-hosted install. Run from this folder on the server:
#
#   bash smoke-test.sh                          # tests http://127.0.0.1:8080
#   bash smoke-test.sh https://<your-address>   # or any address that reaches Caddy
#
# Creates a throwaway account, checks the app, sign-up, the automatic profile row, the privacy
# rules and file uploads, then deletes the account again. Prints PASS/FAIL for each check.
set -euo pipefail
cd "$(dirname "$0")"

setting() { grep "^$1=" .env | cut -d= -f2- | tr -d '\r'; }
bind="$(setting APP_BIND)"
case "$bind" in "" | 0.0.0.0 | "::") bind=127.0.0.1 ;; esac
base="${1:-http://$bind:$(setting APP_PORT)}"
anon_key=$(setting ANON_KEY)
service_key=$(setting SERVICE_ROLE_KEY)
failures=0

check() { # check "<label>" <command...>
  local label=$1
  shift
  if "$@" >/dev/null 2>&1; then echo "PASS  $label"; else echo "FAIL  $label"; failures=$((failures + 1)); fi
}
json_field() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p" | head -n 1; }

check "App health endpoint answers" curl -fsS "$base/api/health"
check "Landing page loads" bash -c "curl -fsS '$base/' | grep -q 'Syllabus Sync'"

# A throwaway account (email autoconfirm must be on, as setup.sh sets it).
email="smoke-$(date +%s)-$RANDOM@example.com"
password="Smoke-$(openssl rand -hex 8)"
signup=$(curl -sS -X POST "$base/auth/v1/signup" -H "apikey: $anon_key" -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$password\"}")
token=$(printf '%s' "$signup" | json_field access_token)
user_id=$(printf '%s' "$signup" | sed -n 's/.*"user":{"id":"\([^"]*\)".*/\1/p' | head -n 1)
check "Sign-up returns a session" test -n "$token"

if [ -n "$token" ] && [ -n "$user_id" ]; then
  auth=(-H "apikey: $anon_key" -H "Authorization: Bearer $token")
  check "A profile row was created for the new user" \
    bash -c "curl -fsS '$base/rest/v1/profiles?select=id' -H 'apikey: $anon_key' -H 'Authorization: Bearer $token' | grep -q '$user_id'"
  check "Logged-out visitors see no profiles (RLS)" \
    bash -c "[ \"\$(curl -fsS '$base/rest/v1/profiles?select=id' -H 'apikey: $anon_key')\" = '[]' ]"

  pdf=$(mktemp)
  printf '%%PDF-1.4\n%% smoke test\n' >"$pdf"
  own=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$base/storage/v1/object/syllabi/$user_id/smoke.pdf" \
    "${auth[@]}" -H "Content-Type: application/pdf" --data-binary "@$pdf")
  check "Upload into your own folder works" test "$own" = "200"
  other=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$base/storage/v1/object/syllabi/someone-else/smoke.pdf" \
    "${auth[@]}" -H "Content-Type: application/pdf" --data-binary "@$pdf")
  check "Upload into someone else's folder is refused" test "$other" != "200"
  rm -f "$pdf"

  # Clean up: the file, then the account (its database rows are deleted with it).
  curl -s -o /dev/null -X DELETE "$base/storage/v1/object/syllabi/$user_id/smoke.pdf" "${auth[@]}" || true
  deleted=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$base/auth/v1/admin/users/$user_id" \
    -H "apikey: $service_key" -H "Authorization: Bearer $service_key")
  check "Test account deleted again" test "$deleted" = "200"
fi

check "The database isn't reachable through the front door" \
  bash -c "[ \"\$(curl -s -o /dev/null -w '%{http_code}' '$base/pg/')\" != '200' ]"

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) failed."
  exit 1
fi
echo "All checks passed."
