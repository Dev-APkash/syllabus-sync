# Vendored Supabase files

Copied **unchanged** from Supabase's official self-hosting setup, so this install behaves like theirs:

- Source: https://github.com/supabase/supabase/tree/master/docker
- Commit: `d95ff5bda979f910698edf0741a9ccbe92fbbbfb` (6 October 2026)
- Licence: Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0)

| Here                            | Upstream path                            |
| ------------------------------- | ---------------------------------------- |
| `api/envoy/envoy.yaml`          | `docker/volumes/api/envoy/envoy.yaml`          |
| `api/envoy/cds.yaml`            | `docker/volumes/api/envoy/cds.yaml`            |
| `api/envoy/lds.template.yaml`   | `docker/volumes/api/envoy/lds.template.yaml`   |
| `api/envoy/docker-entrypoint.sh`| `docker/volumes/api/envoy/docker-entrypoint.sh`|
| `db/roles.sql`                  | `docker/volumes/db/roles.sql`                  |
| `db/jwt.sql`                    | `docker/volumes/db/jwt.sql`                    |
| `db/webhooks.sql`               | `docker/volumes/db/webhooks.sql`               |

When updating Supabase's image versions in `../docker-compose.yml`, re-copy these files from the same
upstream commit and update the commit above. `setup.sh` signs the API keys the same way as upstream's
`docker/utils/generate-keys.sh`.
