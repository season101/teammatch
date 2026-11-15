# TeamMatch

[![CI](https://github.com/season101/teammatch/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/season101/teammatch/actions/workflows/ci.yml?query=branch%3Amain)
[![Release](https://github.com/season101/teammatch/actions/workflows/release.yml/badge.svg)](https://github.com/season101/teammatch/actions/workflows/release.yml)
[![Deploy](https://img.shields.io/github/deployments/season101/teammatch/production?label=deploy)](https://github.com/season101/teammatch/deployments)
[![Latest release](https://img.shields.io/github/v/release/season101/teammatch?label=latest)](https://github.com/season101/teammatch/releases/latest)
[![Live in prod](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fteammatch.sijancodes.com%2Fapi%2Fv1%2Fhealth%2F&query=%24.version&label=prod&prefix=v)](https://teammatch.sijancodes.com)

Swipe on roles, not people.

TeamMatch helps Louisiana Tech students form project teams. A student posts a project with the roles it needs. Classmates swipe through a deck of those roles, ranked by how well their skills match, and apply to the ones they want. The owner likes or passes on applicants role by role, a liked applicant commits to one offer, and the team locks when every role is filled. A locked team gets a private chat.

**Live:** https://teammatch.sijancodes.com (sign-in needs a `latech.edu` or `email.latech.edu` address, by email and password or Google). It installs to a phone's home screen: see [Install on your phone](#install-on-your-phone).

Built for CSC 5323 (Advanced Software Engineering), Louisiana Tech, Fall 2026. Three developers (four until Oct 16), three sprints, 10 h per person per sprint.

## Features

On `main` and live (v3.1.1):

- **Accounts:** sign up and sign in with email and password or Google, an email-domain allowlist, forgotten-password reset, and Settings to add Google or a password to an account (F1-01 to F1-06, F1-10, F1-12, F1-14).
- **Profile and skills:** a profile with major, bio and skills, and a guided setup on first sign-in that includes the team rules (F1-03, F1-04).
- **Projects and roles:** create, edit, close and delete projects, add roles with required skills, browse and search by keyword (F2-01 to F2-07, F2-11).
- **Swipe deck:** role cards ranked by skill overlap, apply with a note, pass, undo the last pass, and see passed roles again. Works with touch, buttons and the keyboard (F3-01 to F3-05, F3-09 to F3-11, UI-06).
- **My applications:** track and withdraw applications, and apply from a project page (F3-06).
- **Review and match:** an applicant queue per role, like or pass, commit to one offer, and the team locks when every role is filled. Locking withdraws the members' other applications and retires them for the term (F4-01 to F4-05, F4-07, F4-10, F4-11, F1-08).
- **Team chat:** real-time chat for a locked team, with history and reconnect (F4-08, F4-09).
- **App shell:** responsive navigation, light and dark theme, installable on Android and iPhone (PL-16, F2-08).

Not built yet: avatar upload (F1-07), GitHub and resume links on profiles (F1-15 to F1-17), repository link on projects (F2-12), the role details page (F3-13), admin moderation (PL-07), and the end-to-end test (PL-08). Status per story is in the [backlog](docs/product/backlog.md) and on the [project board](https://github.com/users/season101/projects/1).

## How it works

1. An **owner** posts a project and the roles it needs (for example "Backend Developer" with Django and Postgres as skills).
2. A **candidate** gets a deck of role cards ranked by how well their skills match. Swipe right to apply, left to pass.
3. The owner goes through applicants role by role and likes or passes each one.
4. A like is an offer. The candidate commits to one offer, and that fills the role. When **every** role is filled, the team locks.
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
docs/                 product, planning, architecture, design, deliverables
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

Then create the tables and, if you want sample data, load the demo projects:

```bash
make migrate   # run Django migrations in the api container
make seed      # sample owners, students, projects and applications (make seed args=--remove takes them out)
```

Open http://localhost:3000. The `/status` page shows a live status card for the API, database, and Redis.

To sign in, sign up with an address on the allowlist (`ALLOWED_EMAIL_DOMAINS`, default `latech.edu,email.latech.edu`). Set `SEED_OWNER_EMAIL` and `SEED_CANDIDATE_EMAIL` in `.env`, sign up with those addresses, and run `make seed` again to give them a sample project with applicants and sample applications. The sample students use `example.com` addresses and can't sign in.

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

Health checks: `/healthz` (process is up, no dependencies), `/readyz` (db + redis, 503 if either is down), and `/api/v1/health/` (same report as `/readyz`, always 200, shown on the `/status` page).

## Tests

```bash
make up      # the checks need Postgres and Redis running
make check   # backend: ruff, pytest. frontend: lint, typecheck, Vitest, build. Same as CI
```

CI runs the same checks plus the schema and client drift check on every pull request, and a secret scan. The Playwright golden-path test (PL-08) is not in the repo yet.

## Install on your phone

TeamMatch installs to the home screen from https://teammatch.sijancodes.com and opens full screen like an app. Settings has the same steps under App.

- Android: open the site in Chrome, tap the menu (⋮), then Install app.
- iPhone: open the site in Safari, tap Share, then Add to Home Screen.

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
| C | F3 Swipe Feed & Applications | Sijan Malla (Pavan Kumar Yadav Kolusu until Oct 16) | role card deck, ranking, apply/pass, undo, my applications |
| D | F4 Review, Match & Team Chat | Sijan Malla | review queue, like/pass, fill + team lock, auto-withdraw, real-time chat |

Each sprint is 8 h of stories + 1 h of code review + 1 h of a rotating chore. Details are in [team-roles.md](docs/planning/team-roles.md).

### Sprints

| Sprint | Dates (2026) | Goal | Report |
|---|---|---|---|
| 0 | 9/27 - 10/6 | Planning, deliverables, repo scaffold | |
| 1 | 10/6 - 10/20 | Walking skeleton, deployed | [report](docs/planning/sprint-1-report.md) |
| 2 | 10/22 - 11/3 | Swipe, match, team lock | [report](docs/planning/sprint-2-report.md) |
| 3 | 11/5 - 11/17 | Chat, avatars, PWA, polish | [report](docs/planning/sprint-3-report.md) |
| Final | 11/19 | Final build and demo | |

The team: Weibo Zhang (`WeiboZhang-01`), Shree Krishna Shrestha (`shreekrishna21`) and Sijan Malla (`season101`). Pavan Kumar Yadav Kolusu was on the team until Oct 16.

## Docs

| Doc | What's in it |
|---|---|
| [glossary.md](docs/glossary.md) | short forms and IDs: F1-xx, PL-xx, BUF-xx, BR-xx, UC-xx, DD-xx, S1–S3, slots |
| [prd.md](docs/product/prd.md) | problem, scope, business rules |
| [backlog.md](docs/product/backlog.md) | stories with acceptance criteria (F1-xx..F4-xx, PL-xx) |
| [use-cases.md](docs/product/use-cases.md) | use cases mapped to epics and stories |
| [sprint-plan.md](docs/planning/sprint-plan.md) | capacity and what goes in each sprint |
| [team-roles.md](docs/planning/team-roles.md) | who owns which epic, and who reviews whom |
| [sprint reports](docs/planning/sprint-3-report.md) | done and not done, burn-down and retro per sprint (also [1](docs/planning/sprint-1-report.md), [2](docs/planning/sprint-2-report.md)) |
| [overview.md](docs/architecture/overview.md) | C4 diagrams, quality attributes |
| [data-model.md](docs/architecture/data-model.md) | ERD, state machines, constraints |
| [api.md](docs/architecture/api.md) | REST, auth, and WebSocket contract |
| [flows.md](docs/architecture/flows.md) | sequence diagrams for the main flows |
| [google-sign-in.md](docs/architecture/google-sign-in.md) | how Google sign-in and the allowlist work |
| [cicd.md](docs/architecture/cicd.md) / [deployment.md](docs/architecture/deployment.md) | CI, releases, production setup |
| [adr/](docs/architecture/adr/) | architecture decisions |
| [design/](docs/design/README.md) | design system: principles, tokens, components, patterns, wireframes. Read before any UI work |
| [deliverables/](docs/deliverables/rundown-outline.md) | course deliverables: rundown outline, mind map, product backlog |
| [github-setup.md](docs/github-setup.md) | one-time repo setup for the owner |

The [wiki](https://github.com/season101/teammatch/wiki) mirrors these docs and updates on every merge to `main`. Edit the files here, not the wiki pages: the next sync overwrites wiki edits. A new doc under `docs/` also needs a line in `PAGES` in [build_wiki.py](.github/scripts/build_wiki.py).

## Deploy

Production runs at https://teammatch.sijancodes.com from the compose file in [deploy/](deploy/). Server setup, `deploy/.env` and the steps are in [deploy/README.md](deploy/README.md). A release tag builds the images to GHCR, and once someone approves the `production` environment, the Release workflow deploys them over SSH. The pipeline is in [cicd.md](docs/architecture/cicd.md) and the server setup in [deployment.md](docs/architecture/deployment.md).

## License

[MIT](LICENSE)

---
All hands on Project Review.