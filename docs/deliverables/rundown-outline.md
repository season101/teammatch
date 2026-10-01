# Run-down PDF - Outline

Outline for the run-down document due 10/1. Fill the placeholders, then export to PDF.

## 1. Title block
- **Team name:** Dogs
- **Project name:** TeamMatch
- **Course:** CSC 5323 Advanced Software Engineering, Louisiana Tech, Fall 2026
- **Members:**
  - Weibo Zhang - Slot A, F1 Accounts & Profiles
  - Shree Krishna Shrestha - Slot B, F2 Projects & Roles
  - Pavan Kumar Yadav Kolusu - Slot C, F3 Swipe Feed & Applications
  - Sijan Malla - Slot D, F4 Review, Match & Team Chat
- **GitHub repo:** https://github.com/season101/teammatch
- **Scrum board / Sprint Planning spreadsheet:** _(link)_

## 2. Narrative (one paragraph)
TeamMatch is Tinder for project teams - you swipe on roles, not people. Owners post a project and the roles it needs. Candidates swipe through role cards ranked by how well their skills fit. When the owner likes an applicant, the role is filled; when every role is filled, the team locks on its own, team chat opens, and the members retire from matching until next term.

## 3. The twist (short list)
- The team is the match unit, not a pair.
- Matching is role by role.
- Auto-lock when every role is filled; members retire so nobody is double-booked.

## 4. Core features
One line each, from `docs/product/prd.md` section 6: F1 to F4, plus who owns each slot.

## 5. Tools breakdown

| Area | Tool | Why |
|---|---|---|
| Backend | Django 5.2, Django REST Framework, drf-spectacular | Mature, fast to build an API with an OpenAPI schema |
| Auth | django-allauth (headless) | Email/password and Google in one library, works for web now and mobile later |
| Real-time | Django Channels + Redis | WebSocket team chat in the same app (live notifications later) |
| Database | PostgreSQL | Constraints and transactions for the team-lock rule |
| File storage | SeaweedFS (S3-compatible) | Avatars uploaded through the API, kept internal |
| Frontend | Next.js 15, TypeScript, Tailwind, shadcn/ui, TanStack Query | Responsive web app and PWA |
| API client | openapi-typescript + openapi-fetch | Typed client generated from the schema |
| Testing | pytest, Vitest, Playwright | Unit, API, and end-to-end |
| DevOps | Docker, Docker Compose, GitHub Actions, GHCR | Same stack locally and in prod; CI on every PR |
| Hosting | Team server behind Traefik with HTTPS | Existing infrastructure |
| Tracking | GitHub Projects + course Sprint Planning spreadsheet | Board for daily work, spreadsheet for grading |
| Design | Figma | Mockups |
| Docs | Markdown + Mermaid in the repo, Freeplane for the mindmap | Diagrams render on GitHub |

## 6. Architecture diagrams (references)
Include images or links for:
- Use-case diagram - `docs/product/prd.md` section 9
- Requirements mindmap - `docs/deliverables/Mindmap.mm` and `docs/product/prd.md` section 10
- System context and container diagrams (C4) - `docs/architecture/overview.md`
- Deployment diagram (Traefik, networks, containers) - `docs/architecture/deployment.md`
- ERD - `docs/architecture/data-model.md`
- Sequence diagrams: Google sign-in; apply, like, team lock, chat - `docs/architecture/flows.md`
- Sprint timeline (Gantt) - `docs/planning/sprint-plan.md`

## 7. Plan at a glance
Sprint dates and one-line goals from `docs/planning/sprint-plan.md`.

## 8. Mockups
Screenshots of the Figma screens: feed card, role card, review queue, team formed, chat.
