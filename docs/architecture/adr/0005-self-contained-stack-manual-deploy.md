# ADR 0005: Self-contained stack with manual deploy

- Status: Accepted
- Date: 2026-09-27

## Context

We host on sitashma-infra for now. That server runs other apps, has no shared database, Redis or object store, and its convention is: each app is a git submodule under `apps/<name>/`, ships a `<name>.prod.yml`, is added to the root `include:` list, and deploys are manual ("Bump <app> submodule to <sha>"). There is no CI or registry there yet. We may move hosts after the semester.

## Decision

- TeamMatch brings its own Postgres, Redis and SeaweedFS, with its own named volumes and a private `teammatch` network.
- Only `web` and `api` join the external `t3_proxy` network, with Traefik labels (`storage` joins only if the future files host is added). Nothing publishes ports.
- `deploy/teammatch.prod.yml` works standalone or through the infra `include:`.
- GitHub Actions builds and pushes images to GHCR on a `v*` tag. Deploy stays manual: bump the submodule in sitashma-infra, pull, `up -d`, verify.
- Migrations run in a one-shot `migrate` service before `api` starts.

## Consequences

- Moving hosts means copying one compose file and one `.env`.
- Our data can't be broken by another app on the host, and we can't break theirs.
- More containers to run than if we shared a DB, but the host has room.
- Backups are our job: `pg_dump` and a SeaweedFS bucket mirror, documented in `docs/deploy.md`.
- Manual deploys mean someone has to do them; we deploy at least once per sprint, right after the release tag.

## Alternatives considered

- **Share a Postgres/Redis with other infra apps:** fewer containers, but coupling and shared-credential risk, and it breaks portability.
- **Auto-deploy from Actions over SSH or a self-hosted runner:** faster, but needs SSH keys or a runner on the host. Not worth it this semester; listed as a later option.
- **Managed hosting (Render, Fly, Vercel + a DB):** less ops, but free tiers are limited for WS + Postgres + Redis + S3, and we already have a host.
