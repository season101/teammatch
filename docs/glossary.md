# Glossary

The short forms and IDs used across TeamMatch's docs, issues, board and code, in one place. If you meet one that isn't here, add it.

## IDs

| Prefix | Stands for | Example | Defined in |
|---|---|---|---|
| **F1-xx** | Feature story in epic F1, Accounts & Profiles | F1-03 Create and edit my profile | [backlog.md](product/backlog.md) |
| **F2-xx** | Feature story in epic F2, Projects & Roles | F2-11 One open project per owner | [backlog.md](product/backlog.md) |
| **F3-xx** | Feature story in epic F3, Swipe Feed & Applications | F3-03 Swipe deck | [backlog.md](product/backlog.md) |
| **F4-xx** | Feature story in epic F4, Review, Match & Team Chat | F4-05 Mutual like fills the role | [backlog.md](product/backlog.md) |
| **PL-xx** | Platform task: repo, CI, releases, deploys, docs, testing. Not tied to one epic; many are rotating chores. | PL-11 Burn chart and sprint report | [backlog.md](product/backlog.md) |
| **BUF-xy** | Buffer hours held back for bugs and polish. `x` is the slot letter, `y` the sprint number. | BUF-A3 = slot A's buffer in Sprint 3 | [backlog.md](product/backlog.md), summary table |
| **BR-xx** | Business rule, enforced in the backend with a test for each one | BR-02 One application per role | [prd.md](product/prd.md#7-business-rules) |
| **UC-xx** | Use case: an actor's goal, its main steps, and alternate flows | UC-07 Swipe right to apply | [use-cases.md](product/use-cases.md) |
| **2a, 3b…** | An alternate flow inside a use case, branching from that step number | UC-03 step 2a: domain not allowed | [use-cases.md](product/use-cases.md) |
| **DD-xx** | Design decision, with its date and reason | DD-17 Undo only brings back a pass | [design/decisions.md](design/decisions.md) |
| **ADR 00xx** | Architecture decision record | ADR 0003 Channels and Redis for chat | [architecture/adr/](architecture/adr/) |
| **TR-xx** | Technical requirement, from the Sprint 0 mind map | TR-01 Contract-first OpenAPI | `deliverables/Mindmap.mm` |
| **DS-xx** | Design-system task (only DS-01, done in #118) | DS-01 Design system tokens | GitHub issue #111 |
| **#nnn** | A GitHub issue or pull request number | #118 | GitHub |

## Planning and the board

| Term | Meaning |
|---|---|
| **S0, S1, S2, S3** | Sprint 0 to Sprint 3: planning (9/27–10/6), walking skeleton (10/6–10/20), swipe, match and team lock (10/22–11/3), chat and polish (11/5–11/17). Final demo 11/19. See [README](../README.md#sprints). |
| **Slot A, B, C, D** | The four work slots, one per epic: A = F1, B = F2, C = F3, D = F4. Each is 8 h of stories per sprint. Who owns which is in [team-roles.md](planning/team-roles.md). |
| **Member A–D** | The person who owns that slot |
| **rotating** | A chore with no fixed owner. Each member picks one 1 h chore per sprint (release, burn chart, API docs refresh…). |
| **Team tax** | The 2 h per member per sprint outside stories: 1 h code review plus 1 h rotating chore |
| **Must / Should / Could** | MoSCoW priority. "Won't this term" goes to the future backlog. |
| **stretch** | Label for a story we'll do only if time allows |
| **Estimate / Hrs Left** | Board fields: hours planned, and hours remaining (this drives the burn chart) |
| **Backlog → Ready → In progress → In review → Done** | Board statuses, left to right |
| **type: story / task / bug** | Issue labels. A story is user-facing (F-xx); a task is platform work (PL-xx, DS-xx). |
| **epic: F1 accounts, F2 projects, F3 swipe, F4 match-chat, platform** | Issue labels matching the epics |
| **AC** | Acceptance criteria, written as Given / When / Then in each story |
| **MVP** | Minimum viable product: what ships by 11/19 ([prd.md](product/prd.md#6-mvp-scope)) |

## Product words
Role, owner, candidate, apply and pass, filled, team locks, benched and match % have exact meanings. They're defined in [design/principles.md, "Words we use"](design/principles.md#words-we-use).

## Tech

| Short form | Meaning |
|---|---|
| **API** | The Django backend's HTTP interface under `/api/v1/` ([api.md](architecture/api.md)) |
| **REST** | The request style of that API: resources plus HTTP verbs (GET, POST, PATCH, DELETE) |
| **WS / WSS** | WebSocket (secure in production), used for team chat at `/ws/teams/{id}/` |
| **ASGI** | The async server interface Django runs on (uvicorn), so it can serve WebSockets |
| **DRF** | Django REST Framework, which builds our API views and serializers |
| **allauth** | django-allauth in headless mode: sign-up, sign-in and Google login ([ADR 0002](architecture/adr/0002-allauth-headless-auth.md)) |
| **Identity federation** | One system vouching for who a user is, so the next doesn't keep its own password. LA Tech's CAS vouches to Google, and Google to TeamMatch ([Google Sign-In](architecture/google-sign-in.md)) |
| **OAuth 2.0 / OIDC** | The sign-in protocols between TeamMatch and Google. OpenID Connect (OIDC) adds the ID token to OAuth 2.0 |
| **ID token** | Google's signed statement about the user: `email`, `email_verified`, `hd` and the account ID `sub` |
| **`hd` claim** | "Hosted domain": the Google Workspace domain an account belongs to. TeamMatch accepts only `email.latech.edu` ([ADR 0007](architecture/adr/0007-google-sign-in-trusts-la-tech-workspace.md)) |
| **Google Workspace** | Google accounts run by an organization. LA Tech's covers students' @email.latech.edu addresses, not staff @latech.edu |
| **CAS** | LA Tech's Central Authentication Service at `cas.latech.edu`, the login page Canvas, email and Workday share |
| **OpenAPI** | The API contract file `backend/schema.yml`. The TypeScript client in `packages/api-client` is generated from it. |
| **Channels** | Django Channels, the WebSocket layer, with Redis between processes |
| **S3 (storage)** | The Amazon S3 file API. We self-host it with SeaweedFS for avatars. **Not the same as S3 the sprint.** |
| **SeaweedFS** | The self-hosted, S3-compatible file store in our stack |
| **Traefik** | The reverse proxy that routes one domain to web, API and WebSocket ([ADR 0004](architecture/adr/0004-single-origin-routing.md)) |
| **GHCR** | GitHub Container Registry, where CI publishes our Docker images on a release tag |
| **CI / CD** | Continuous integration (checks on every PR) and continuous delivery (images on a tag) ([cicd.md](architecture/cicd.md)) |
| **PWA** | Progressive web app: installable on a phone home screen ([ADR 0006](architecture/adr/0006-pwa-first-mobile-later.md)) |
| **e2e** | End-to-end tests: Playwright drives a browser against the running stack |
| **DB, PK, FK, UK** | Database; primary key, foreign key and unique key in the [data model](architecture/data-model.md) |
| **ERD** | Entity-relationship diagram (the data model picture) |
| **C4** | The context, container, component and code diagram style used in [overview.md](architecture/overview.md) |
| **PRD** | Product requirements document ([prd.md](product/prd.md)) |
| **CSRF / CORS** | Cross-site request forgery protection and cross-origin rules. We serve one origin, so no CORS. |
| **HSTS / TLS / HTTPS** | Browser-enforced HTTPS, and the encryption under it, in production |
| **SMTP** | Email sending, used for verification emails |

## Design

| Short form | Meaning |
|---|---|
| **Lineup** | The name of TeamMatch's visual language ([design/README.md](design/README.md)) |
| **Token** | A named design value, like `surface` or `radius-card`. Source: [tokens.json](design/tokens.json). |
| **DTCG** | W3C Design Tokens Community Group, whose format `tokens.json` follows |
| **CTA** | Call to action: the one primary button on a view |
| **WCAG 2.2 AA** | The accessibility standard and level we target ([accessibility.md](design/foundations/accessibility.md)) |
| **UI / UX** | User interface (what you see) and user experience (how it works and feels) |
| **Specced** | A component whose doc is final but which isn't built yet |
