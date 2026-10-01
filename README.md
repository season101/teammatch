# TeamMatch

Swipe on roles, not people.

Students post a project with open roles. Classmates swipe on the roles that fit their skills. Owners like or pass per role, and the team forms itself when every role is filled. Then team chat opens.

CSC 5323 (Advanced Software Engineering), Louisiana Tech, Fall 2026. Four developers, three sprints, 10 h per person per sprint.

## How it works

1. An **owner** posts a project and the roles it needs (for example "Backend Developer" with Django and Postgres as skills).
2. A **candidate** gets a deck of role cards ranked by how well their skills match. Swipe right to apply, left to pass.
3. The owner goes through applicants role by role and likes or passes each one.
4. A mutual like fills the role. When **every** role is filled, the team locks.
5. Once the team locks, its members retire for the rest of the term. Their other applications get withdrawn and they drop out of other decks, so nobody ends up on two teams.
6. Team chat opens for the locked team.

The full rules (BR-xx) are in the [PRD](docs/product/prd.md).

## Stack

| Piece | Tech |
|---|---|
| Web app | Next.js (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Query, installable PWA (Serwist) |
| API | Django 5.2, Django REST Framework, drf-spectacular, served over ASGI by uvicorn |
| Auth | django-allauth (headless): email/password and Google, with an email domain allowlist |
| Chat | Django Channels over WebSockets, Redis |
| Data | PostgreSQL 17, SeaweedFS (S3 API) for avatars |
| Delivery | GitHub Actions, GHCR, Docker Compose behind Traefik |

## Repo layout

```
backend/              Django API (HTTP + WebSockets), one app per epic under apps/
frontend/             Next.js web app, feature folders under src/features/
packages/api-client/  TypeScript client generated from backend/schema.yml
deploy/               production compose for the server
docs/                 product, planning, architecture, deliverables
compose.local.yml     local stack: web, api, Postgres, Redis, SeaweedFS
Makefile              shortcuts for everything below
```

## Getting started

You need Docker with Compose v2, Python 3.11+ with [uv](https://docs.astral.sh/uv/), and Node 24 with pnpm 9.

```bash
make setup   # copy .env.example to .env (then change the passwords)
make up      # build and start web, api, postgres, redis, storage
make ps      # everything should say healthy
```

Open http://localhost:3000. The homepage shows a live status card for the API, database, and Redis.

Local services:

| Service | Port | Notes |
|---|---|---|
| Web | 3000 | Next.js dev server, hot reload. Proxies `/api`, `/_allauth`, `/ws` to the api |
| API | 8000 | Django under uvicorn with `--reload`. Runs migrations on start. `/api/docs/` has Swagger |
| Postgres | 5432 | db, user, and password come from `.env` |
| Redis | 6379 | channel layer for chat |
| SeaweedFS S3 | 8333 | the bucket gets created on first `make up` |

Other commands:

```bash
make logs s=db   # follow logs for one service
make down        # stop the stack
make reset       # stop and wipe local data
make build       # rebuild api/web after adding a dependency
make schema      # regenerate backend/schema.yml and packages/api-client
make check       # lint, typecheck, tests, build (same as CI; needs db and redis up)
make help        # list everything
```

Ports can be changed in `.env` (`WEB_PORT`, `API_PORT`, `POSTGRES_PORT`, `REDIS_PORT`, `S3_PORT`) if something else on your machine is already using them.

You can also run either side on the host while the rest stays in Docker: `cd backend && uv run uvicorn config.asgi:application --reload` reads the repo `.env` and talks to the compose ports, and `cd frontend && pnpm dev` proxies to `localhost:8000`. Stop the matching container first (`docker compose -f compose.local.yml stop api`).

Health checks: `/healthz` (process is up, no dependencies), `/readyz` (db + redis, 503 if either is down), and `/api/v1/health/` (same report as `/readyz`, always 200, used by the homepage).

## Ground rules

- **Contract first.** If you change a serializer or view, regenerate `backend/schema.yml` and the client in the same PR:
  ```bash
  cd backend && uv run python manage.py spectacular --file schema.yml
  ```
  CI fails if the schema and client drift. Never hand-edit `packages/api-client/`.
- **The frontend never imports backend code.** It talks to the API through `packages/api-client` and to chat through `/ws/teams/<id>/`. No raw `fetch` to `/api`.
- **Every endpoint checks ownership.** The object must belong to the requesting user (owner, applicant, or team member). Write a test for the 403 case.
- **Business rules live in the backend.** The UI can hide a button, but the API still has to enforce the rule.
- **Team lock is one transaction** with `select_for_update`. WebSocket events go out after commit.
- **No secrets in the repo.** New settings go in `.env.example` with a safe placeholder.
- **Tests ship with the feature.** pytest for backend, Vitest for components, Playwright for the golden path.

### Backend conventions

- uv + `pyproject.toml`, ruff (line length 100), pytest + pytest-django.
- Settings are split into `config/settings/{base,local,prod,test}.py` and read everything from env vars.
- Each app has its own models, serializers, views, urls, and tests. Business logic goes in `services.py` and views stay thin.
- Routes: API under `/api/v1/`, auth under `/_allauth/`, WebSockets under `/ws/`.
- Default permission is `IsAuthenticated`. Object checks go in the view or a permission class, not the serializer.
- `/healthz` touches nothing. `/readyz` checks the db and redis.
- Settings for host runs come from the repo-root `.env` (see `config/settings/hostenv.py`), so there's no second env file.

### Frontend conventions

- TypeScript strict, pnpm.
- Feature folders: `src/features/<feature>/` (accounts, projects, feed, review, chat) with components, hooks, and queries kept together.
- Same-origin cookies (allauth session + CSRF). No tokens in localStorage.
- Mobile first. Every screen has to work at 390 px wide and with just a keyboard.

## How we work

- **Board:** GitHub Projects. Pick an issue from **Ready**, assign yourself, and update **Hrs Left** before each stand-up. Mirror the same numbers in the course Sprint Planning spreadsheet, since that's what gets graded.
- **Branches:** one story per branch, off `main`: `feat/<issue>-short-name`, `fix/...`, `chore/...`, `docs/...`.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat: add role card`).
- **PRs:** fill in the template and get one review. The reviewer's name goes in the PR. Squash merge once CI is green.
- Push small pieces often. Don't dump a pile of work in at the last minute.

### Epics and slots

| Slot | Epic | Owner | Covers |
|---|---|---|---|
| A | F1 Accounts & Profiles | Weibo Zhang | sign-up/in, Google, domain allowlist, profile, skills, avatar, retire + term reset, admin |
| B | F2 Projects & Roles | Shree Krishna Shrestha | create/edit/close projects, roles, browse and search, PWA, responsive pass |
| C | F3 Swipe Feed & Applications | Pavan Kumar Yadav Kolusu | role card deck, ranking, apply/pass, undo, my applications |
| D | F4 Review, Match & Team Chat | Sijan Malla | review queue, like/pass, fill + team lock, auto-withdraw, real-time chat |

Each sprint is 8 h of stories + 1 h of code review + 1 h of a rotating chore. Details are in [team-roles.md](docs/planning/team-roles.md).

### Sprints

| Sprint | Dates (2026) | Goal |
|---|---|---|
| 0 | 9/27 - 10/6 | Planning, deliverables, repo scaffold |
| 1 | 10/6 - 10/20 | Walking skeleton, deployed |
| 2 | 10/22 - 11/3 | Swipe, match, team lock |
| 3 | 11/5 - 11/17 | Chat, avatars, PWA, polish |
| Final | 11/19 | Final build and demo |

## Docs

| Doc | What's in it |
|---|---|
| [prd.md](docs/product/prd.md) | problem, scope, business rules |
| [backlog.md](docs/product/backlog.md) | stories with acceptance criteria (F1-xx..F4-xx, PL-xx) |
| [use-cases.md](docs/product/use-cases.md) | use cases mapped to epics and stories |
| [sprint-plan.md](docs/planning/sprint-plan.md) | capacity and what goes in each sprint |
| [overview.md](docs/architecture/overview.md) | C4 diagrams, quality attributes |
| [data-model.md](docs/architecture/data-model.md) | ERD, state machines, constraints |
| [api.md](docs/architecture/api.md) | REST, auth, and WebSocket contract |
| [flows.md](docs/architecture/flows.md) | sequence diagrams for the main flows |
| [cicd.md](docs/architecture/cicd.md) / [deployment.md](docs/architecture/deployment.md) | CI, releases, production setup |
| [adr/](docs/architecture/adr/) | architecture decisions |
| [github-setup.md](docs/github-setup.md) | one-time repo setup for the owner |

## Deploy

Production runs at `teammatch.sijancodes.com` from the compose file in [deploy/](deploy/). CI builds images to GHCR on a release tag, and we deploy by hand on the server. Steps are in [deployment.md](docs/architecture/deployment.md).

## License

[MIT](LICENSE)

---
All hands on Project Review.