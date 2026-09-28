# TeamMatch - Team Roles and Task Split

The work is split into four slots, one per epic. **Each member picks their own slot.** Nobody is assigned a slot by someone else. Once everyone has picked, put your name in the table below and set yourself as Owner on your epic's issues.

Each slot owns one feature end to end (backend models and API, frontend screens, tests) so everyone has their own commits in every sprint, which matters since implementation is graded per student.

Everyone works 10 h per sprint: 8 h of stories in their slot + 2 h team tax (1 h code reviews for teammates, 1 h one rotating chore). The repo scaffold (PL-01 to PL-04) is done by the team lead before S1 and is outside this budget. Full capacity math is in [sprint-plan.md](sprint-plan.md#capacity).

## Slots

| Slot | Name | Epic | Owns | Sprint 1 (8 h) | Sprint 2 (8 h) | Sprint 3 (8 h) |
|---|---|---|---|---|---|---|
| A | _(pick)_ | F1 Accounts & Profiles | Sign up/in, Google, domain allowlist, profile, skills, retire + term reset, avatar, admin | F1-01 (2), F1-02 (2), F1-03 (2), F1-04 (2) | F1-05 (3), F1-06 (2), F1-08 (3) | F1-07 (4), PL-07 (2), buffer (2) |
| B | _(pick)_ | F2 Projects & Roles | Projects, roles, browse, detail, edit/close, delete role, PWA, search, responsive | F2-01 (3), F2-02 (3), F2-03 (2) | F2-04 (2), F2-05 (3), F2-06 (2), buffer (1) | F2-08 (3), F2-07 (3), F2-10 (2) |
| C | _(pick)_ | F3 Swipe Feed & Applications | Role card, feed, apply, swipe deck, pass, my applications, ranking, controls, undo | F3-08 (2), F3-01 (3), F3-02 (3) | F3-03 (4), F3-05 (1), F3-06 (3) | F3-04 (3), F3-09 (1), F3-10 (2), buffer (2) |
| D | _(pick)_ | F4 Review, Match & Team Chat | Applicants, like/pass, team model, review queue, fill + lock, auto-withdraw, chat | F4-01 (3), F4-02 (2), F4-03 (3) | F4-04 (3), F4-05 (3), F4-07 (2) | F4-08 (6), F4-09 (2) |

## Rotating chores

Each member picks one chore per sprint at sprint planning (1 h). Try not to take the same kind of chore twice in a row. Slot: rotating.

| Sprint | Chores (one per member) |
|---|---|
| S1 | PL-05 First production deploy, PL-10 Seed data script, PL-11 Burn chart + sprint report, PL-12 Wiki/docs page for the sprint's features |
| S2 | PL-06 Cut release tag + deploy, PL-11 Burn chart + sprint report, PL-13 API docs refresh, PL-14 Playwright setup + smoke test |
| S3 | PL-06 Final release + deploy, PL-11 Burn chart + sprint report, PL-08 Golden-path e2e test (extends PL-14), PL-09 Final README + docs |

Code review (1 h per member per sprint) is its own line in the capacity table, not a chore or story.

Sprint 0: PL-01 to PL-04 are done by the lead before S1, outside the 30 h budget.

## What each slot is like

- **A - Accounts & Profiles:** auth flows, profiles, retire logic, and uploads. Good fit if you want to learn authentication, OAuth, and file uploads. Front-loaded in S1 because everyone else needs sign-in.
- **B - Projects & Roles:** CRUD, search, and the app shell. Good fit if you like forms, responsive UI, and PWA work.
- **C - Swipe Feed & Applications:** the signature UI. Good fit if you like frontend interaction and gestures (with a drag library), plus a ranking query.
- **D - Review, Match & Chat:** the core business logic and WebSockets. Good fit if you like backend logic, transactions, and real-time features.

## Handoffs between slots

| From | To | What | When |
|---|---|---|---|
| A | Everyone | Sign-in working and a current-user endpoint | Early S1 |
| A | C | Profile skills (for ranking and card highlights) | S1 |
| B | C, D | Project and Role models and endpoints | Early S1 |
| C | D | Application model and apply endpoint | Mid S1 |
| A | D | `retire(user, until)` service function (F1-08) that F4-07 calls on team lock | S2 |
| D | B | `try_lock(project)` service (F4-03) that F2-06 calls after deleting a role | S1 / S2 |
| Lead | Everyone | Repo scaffold: allauth wiring, Channels, CI, compose, generated client, empty apps | Before S1 |

Models are agreed at the start of Sprint 1 so slots can build in parallel. API changes go through the OpenAPI schema first.

## Responsibility (RACI-style)

R = does the work, A = accountable (final call), C = consulted, I = kept informed.

| Area | A | B | C | D |
|---|---|---|---|---|
| F1 stories | R/A | I | C | C |
| F2 stories | I | R/A | C | C |
| F3 stories | C | C | R/A | C |
| F4 stories | C | C | C | R/A |
| Business rules (BR-xx) | C | C | C | R/A |
| OpenAPI contract changes | R for own endpoints, reviewed by the consumer slot | same | same | same |
| Code review | Reviews B | Reviews C | Reviews D | Reviews A |
| Board + spreadsheet up to date | Own tasks | Own tasks | Own tasks | Own tasks |
| Rotating chores (deploy, release, seed, e2e, docs, burn chart) | R when picked | R when picked | R when picked | R when picked |

Each member spends 1 h per sprint on code review. The review rotation is a default; any member can review any PR. Every PR still names its reviewer. Scrum master and note-taking rotate each sprint (S1: A, S2: B, S3: C, final build: D).
