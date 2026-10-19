# Deploy

Production compose for the server (`teammatch.sijancodes.com` behind the sitashma-infra Traefik). The stack is self-contained: its own Postgres, Redis, and SeaweedFS on a private `teammatch` network. Only `teammatch-web` and `teammatch-api` join the external `t3_proxy` network, and nothing publishes a port.

Topology and routing: [docs/architecture/deployment.md](../docs/architecture/deployment.md). Release and deploy steps: [docs/architecture/cicd.md](../docs/architecture/cicd.md#manual-deploy).

## Services

| Service | Image | Notes |
|---|---|---|
| `teammatch-web` | `ghcr.io/season101/teammatch-web` | Next.js standalone, catch-all router (priority 1) |
| `teammatch-api` | `ghcr.io/season101/teammatch-api` | uvicorn, 2 workers. Router for `/api`, `/ws`, `/admin`, `/static`, `/_allauth` (priority 100) |
| `teammatch-migrate` | api image | one-shot `migrate`, then `bootstrap` (terms and `SEED_*` accounts); api waits for it |
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
DEFAULT_FROM_EMAIL=TeamMatch <verification@teammatch.sijancodes.com>

# optional demo accounts, created verified on every deploy (leave a pair empty to skip it)
SEED_ADMIN_EMAIL=admin@latech.edu    # superuser, can sign in at /admin
SEED_ADMIN_PASSWORD=change-me
SEED_OWNER_EMAIL=olive.owner@latech.edu
SEED_OWNER_PASSWORD=change-me
SEED_CANDIDATE_EMAIL=sam.student@latech.edu
SEED_CANDIDATE_PASSWORD=change-me
```

`DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, and `TEAMMATCH_VERSION` have no defaults, so compose refuses to start without them.

After `migrate`, `teammatch-migrate` runs `python manage.py bootstrap`, so this happens on every deploy:
- It adds the terms listed in `backend/apps/core/management/commands/bootstrap.py`, starting with Fall 2026. A term that already exists keeps the dates an admin set.
- It creates the `SEED_*` accounts, or updates them if they exist, and marks their email verified. The password always becomes the `.env` value, so to change one, edit `.env` and recreate `teammatch-migrate`.

Only the `teammatch-migrate` container gets the `SEED_*` values.

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

## Upgrade to a new version

The example ships 1.0.0. Before you start, check that every PR for the release is merged and CI is green on `main`.

1. Tag the release on your laptop. The release workflow pushes `ghcr.io/season101/teammatch-api:1.0.0` and `teammatch-web:1.0.0`.

   ```bash
   git switch main && git pull
   git tag -a v1.0.0 -m "v1.0.0"
   git push origin v1.0.0
   gh run watch "$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
   ```

2. Back up the database on the server (`ssh -A sitashma`; `-A` lets git there reach GitHub).

   ```bash
   docker exec teammatch-db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > ~/backups/teammatch-$(date +%F)-before-1.0.0.dump
   ls -lh ~/backups/
   ```

3. Move the compose file and the image tag to the release. Only the `apps/teammatch` submodule moves. Don't pull or push the infra repo, because it pins the other apps too.

   ```bash
   cd ~/sitashma-infra/apps/teammatch
   git fetch --tags && git checkout v1.0.0
   sed -i 's/^TEAMMATCH_VERSION=.*/TEAMMATCH_VERSION=1.0.0/' deploy/.env
   ```

4. Pull the images and restart only the app services. `teammatch-migrate` runs first and the API waits for it. The database, Redis and storage keep running.

   ```bash
   cd ~/sitashma-infra
   docker compose --profile apps pull teammatch-migrate teammatch-api teammatch-web
   docker compose --profile apps up -d teammatch-migrate teammatch-api teammatch-web
   ```

5. Run the checks in [Verify](#verify). The health response should show the new `version`, and `docker logs teammatch-migrate` should end without errors. Then sign up on the live site with a real inbox, open the link in the email, and sign in.

## Roll back

Roll back if any of these happen:
- `teammatch-migrate` exits non-zero.
- The API isn't healthy within 2 minutes.
- The health check isn't `ok`.
- Sign-up or email verification fails.

If the release's migrations only add tables or columns (true for 1.0.0), the previous version runs fine on the new schema:

```bash
cd ~/sitashma-infra/apps/teammatch
git checkout v0.1.0
sed -i 's/^TEAMMATCH_VERSION=.*/TEAMMATCH_VERSION=0.1.0/' deploy/.env
cd ~/sitashma-infra && docker compose --profile apps up -d teammatch-api teammatch-web
```

Restore the backup only if data is damaged:

```bash
docker exec -i teammatch-db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < ~/backups/<file>.dump
```

## Sample data for demos

`seed_demo` adds five sample projects with open roles. They belong to sample accounts at `example.com`, which can't sign in. With `--candidate`, it also fills that account's profile with sample skills if the profile is still empty, so the feed shows skill matches. Running it again only adds what's missing.

```bash
docker exec teammatch-api python manage.py seed_demo --candidate <demo candidate email>
docker exec teammatch-api python manage.py seed_demo --remove   # delete the sample projects and accounts
```

Locally, run `make seed`, and `make seed args=--remove` to take the data out again.
