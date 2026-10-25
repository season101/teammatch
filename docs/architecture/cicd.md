# CI/CD and Branching

## Branching: GitHub Flow + release tags

- `main` is protected: PR required, 1 approving review, CI green, linear history, squash merge only, no force push.
- One branch per issue, named by type:
  - `feat/<issue>-slug` e.g. `feat/14-swipe-deck`
  - `fix/<issue>-slug`, `chore/<issue>-slug`, `docs/<issue>-slug`
- Commits follow Conventional Commits: `feat(matching): lock team when last role filled`. Scopes are app or feature names (`accounts`, `profiles`, `projects`, `matching`, `chat`, `web`, `infra`, `docs`).
- The squash commit title is the PR title, so the PR title must be a valid conventional commit.
- PR body uses the template: summary, `Closes #<issue>`, how it was tested, and a `Reviewer: @name` line (the course check-in notes need the reviewer).
- Keep PRs small (aim under 400 changed lines, not counting generated client).
- End of each sprint: tag `main` as `v<sprint>.<minor>.0` (e.g. `v1.0.0` after Sprint 1). The tag triggers the release.

### Example

Squash merges show up as a single commit on `main`.

```mermaid
gitGraph
    commit id: "chore: repo scaffold"
    branch feat/3-email-signup
    checkout feat/3-email-signup
    commit id: "feat(accounts): signup"
    commit id: "test(accounts): allowlist"
    checkout main
    branch feat/7-create-project
    checkout feat/7-create-project
    commit id: "feat(projects): create"
    checkout main
    merge feat/3-email-signup id: "feat(accounts): email signup"
    merge feat/7-create-project id: "feat(projects): create project"
    commit id: "fix(web): login redirect"
    commit id: "sprint 1 done" tag: "v1.0.0"
```

## CI (`.github/workflows/ci.yml`)

Runs on every PR and on push to `main`. `concurrency` cancels older runs on the same branch. `permissions: contents: read`.

| Job | Steps | Fails when |
|---|---|---|
| `detect` | checks `backend/` and `frontend/` exist | never |
| `backend` | uv sync, `ruff check`, `ruff format --check`, `pytest` with Postgres 17 and Redis 8 service containers, then regenerate `schema.yml` and `git diff --exit-code` | lint or tests fail, or `schema.yml` not committed after an API change |
| `frontend` | pnpm install (frozen lockfile), `eslint`, `tsc --noEmit`, `vitest`, `next build`, then regenerate `packages/api-client` and `git diff --exit-code` | lint, types, tests or build fail, or the client is out of date |
| `docker` | buildx build `backend/Dockerfile` and `frontend/Dockerfile`, no push | an image does not build |
| `secrets` | gitleaks over the commits in the PR or push | a secret is found |

Branch protection requires all five jobs. `make check` runs the same checks locally.

Playwright e2e for the golden path runs on `main` and nightly (added in Sprint 3), not on every PR, to keep PR CI fast.

Dependabot opens weekly PRs for pip (uv), npm (pnpm) and GitHub Actions.

## Release (`.github/workflows/release.yml`)

On push of a tag matching `v*`:

1. Checkout, set up buildx, log in to GHCR with `GITHUB_TOKEN` (`permissions: packages: write`).
2. Build and push:
   - `ghcr.io/season101/teammatch-api`
   - `ghcr.io/season101/teammatch-web`
3. Tags from `docker/metadata-action`: `1.2.0` and `1.2`.
4. The `release` job creates a GitHub Release for the tag with notes generated from the squash commits.

The repo is public, so the images are public and the host can pull without logging in.

## Wiki (`.github/workflows/wiki.yml`)

Runs when `docs/`, `README.md`, `deploy/README.md` or `packages/api-client/README.md` change. `.github/scripts/build_wiki.py` turns each doc into a wiki page, rewrites links between docs to point at wiki pages, and builds the sidebar. It fails when a link is broken or when a doc under `docs/` has no line in its `PAGES` list. On a PR the job only builds. On push to `main` it replaces the wiki's contents and pushes them with `GITHUB_TOKEN` (`permissions: contents: write`). Run it by hand from the Actions tab to undo edits someone made in the wiki itself.

## Manual deploy

Deploys follow the sitashma-infra convention and are done by hand after a release.

1. Wait for the release workflow to finish and check both images exist on GHCR.
2. In `sitashma-infra`, bump the submodule and set the version:
   ```bash
   cd apps/teammatch && git fetch --tags && git checkout v1.0.0 && cd ../..
   # set TEAMMATCH_VERSION=1.0.0 in apps/teammatch/deploy/.env
   git add apps/teammatch && git commit -m "Bump teammatch submodule to v1.0.0"
   git push
   ```
3. On the host:
   ```bash
   git pull && git submodule update --init apps/teammatch
   docker compose --profile apps pull teammatch-api teammatch-web
   docker compose --profile apps up -d
   docker compose ps
   ```
4. Verify:
   - `docker compose ps` shows `teammatch-*` healthy and `teammatch-migrate` exited 0.
   - `docker exec teammatch-api python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/readyz')"` exits 0 (200).
   - `https://teammatch.sijancodes.com` loads, login works, `/api/v1/me/profile/` returns 200 when logged in.
   - Chat page connects (WS 101 in browser devtools).
5. Rollback: set `TEAMMATCH_VERSION` to the previous tag and repeat step 3. Migrations must stay backward compatible for one release so this works.

## Pipeline

```mermaid
flowchart LR
    dev["Developer<br/>feat/issue-slug branch"]
    pr["Pull request<br/>template + Reviewer line"]

    subgraph ci ["CI workflow"]
        direction TB
        be["backend<br/>ruff, pytest, schema drift"]
        fe["frontend<br/>eslint, tsc, vitest, build, client drift"]
        dk["docker<br/>build both images"]
        gl["gitleaks"]
    end

    review["1 approving review"]
    main["main<br/>squash merge"]
    tag["tag v*<br/>end of sprint"]

    subgraph rel ["Release workflow"]
        direction TB
        build["buildx build"]
        ghcr["push to GHCR<br/>teammatch-api, teammatch-web"]
        notes["GitHub Release notes"]
    end

    subgraph deploy ["Manual deploy on sitashma-infra"]
        direction TB
        bump["bump submodule + TEAMMATCH_VERSION"]
        pull["compose pull"]
        up["compose up -d"]
        verify["verify readyz + smoke test"]
    end

    dev --> pr --> ci
    ci -->|"all green"| review --> main --> tag --> build --> ghcr --> notes
    ghcr --> bump --> pull --> up --> verify
```
