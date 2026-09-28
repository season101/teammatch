# Deploy

Production compose for the server (`teammatch.sijancodes.com` behind the sitashma-infra Traefik). The stack is self-contained: its own Postgres, Redis, and SeaweedFS on a private `teammatch` network. Only `teammatch-web` and `teammatch-api` join the external `t3_proxy` network, and nothing publishes a port.

Topology and routing: [docs/architecture/deployment.md](../docs/architecture/deployment.md). Release and deploy steps: [docs/architecture/cicd.md](../docs/architecture/cicd.md#manual-deploy).

## Services

| Service | Image | Notes |
|---|---|---|
| `teammatch-web` | `ghcr.io/season101/teammatch-web` | Next.js standalone, catch-all router (priority 1) |
| `teammatch-api` | `ghcr.io/season101/teammatch-api` | uvicorn, 2 workers. Router for `/api`, `/ws`, `/admin`, `/static`, `/_allauth` (priority 100) |
| `teammatch-migrate` | api image | one-shot `migrate`, api waits for it |
| `teammatch-db` | `postgres:17.11-alpine` | volume `teammatch_pgdata` |
| `teammatch-redis` | `redis:8.8-alpine` | AOF on, volume `teammatch_redisdata` |
| `teammatch-storage` | `chrislusf/seaweedfs` | S3 on :8333, internal only, volume `teammatch_s3data` |
| `teammatch-storage-init` | seaweedfs | one-shot, creates the bucket |

## deploy/.env

Create `deploy/.env` on the server (it's gitignored). Every service has `profiles: ["apps", "all"]`, so a standalone run needs `COMPOSE_PROFILES=apps`. The infra root compose passes `--profile apps` itself.

```bash
# generate each secret with: openssl rand -base64 48 | tr -d '/+=' | cut -c1-50
COMPOSE_PROFILES=apps
TEAMMATCH_VERSION=0.1.0          # image tag, v0.1.0 -> 0.1.0
TEAMMATCH_HOST=teammatch.sijancodes.com
TZ=America/Chicago

DJANGO_SECRET_KEY=change-me

POSTGRES_DB=teammatch
POSTGRES_USER=teammatch
POSTGRES_PASSWORD=change-me      # any characters, the app URL-encodes it

S3_BUCKET=teammatch-media
S3_ACCESS_KEY=teammatch
S3_SECRET_KEY=change-me

EMAIL_URL=consolemail://         # smtp+tls://user:pass@host:587 once email is set up
DEFAULT_FROM_EMAIL=TeamMatch <no-reply@sijancodes.com>
```

`DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `TEAMMATCH_VERSION` have no defaults, so compose refuses to start without them.

## Run

Standalone (any host with Traefik on `t3_proxy`):

```bash
docker compose -f deploy/teammatch.prod.yml --env-file deploy/.env up -d
```

Via sitashma-infra: add `apps/teammatch/deploy/teammatch.prod.yml` to the root `include:` list. Compose reads `apps/teammatch/deploy/.env` for this file's variables.

## Verify

```bash
docker compose ps    # teammatch-* healthy, migrate and storage-init exited 0
docker exec teammatch-api python -c "import urllib.request as u; print(u.urlopen('http://127.0.0.1:8000/readyz').read().decode())"
curl -fsS https://teammatch.sijancodes.com/api/v1/health/
```

`/healthz` and `/readyz` are only reachable inside the stack. Publicly those paths land on web and return 404.
