# TeamMatch - Product Backlog

CSC 5323 Advanced Software Engineering, Fall 2026

**TeamMatch is Tinder for project teams - you swipe on roles, not people.** Owners post projects with open roles. Candidates swipe on role cards ranked by skill fit. When the owner likes an applicant, that role is filled. When every role is filled, the team locks automatically, chat opens, and the members retire from matching until next term.

Full stories with acceptance criteria, estimates, and sprints: `docs/product/backlog.md`.

Planned capacity: each of the 4 members works 10 h per sprint over three sprints (8 h stories + 1 h code review + 1 h rotating chore), 120 h total. Repo setup is done before Sprint 1.

## User requirements

### F1 Accounts & Profiles
1. F1-01 Users can sign up with a school email and password, with email verification.
2. F1-02 Users can sign in and sign out.
3. F1-03 Users can create and edit a profile (name, bio, major).
4. F1-04 Users can add skills to their profile from a shared skill list.
5. F1-05 Users can sign in with Google.
6. F1-06 Only emails from allowed domains (e.g. latech.edu) can sign up or sign in.
7. F1-08 Users on a formed team cannot apply and are hidden from owners until the term ends; a term reset command lets them match again next term.
8. F1-07 Users can upload an avatar (uploaded through the API).

### F2 Projects & Roles
9. F2-01 Owners can create a project with a title and pitch.
10. F2-02 Owners can add roles to a project, each with required skills, and publish it.
11. F2-03 Users can see a list of open projects in the current term.
12. F2-04 Users can open a project to see its pitch, owner, and roles.
13. F2-05 Owners can edit or close their project.
14. F2-06 Owners can delete a role nobody can fill so the team can still form.
15. F2-07 Users can search projects by keyword and filter by skill.
16. F2-08 The app can be installed as a PWA on phone and desktop.
17. F2-10 All screens work from phone to desktop width.

### F3 Swipe Feed & Applications
18. F3-08 Each role is shown as a card with role, project, skills (matches highlighted), and pitch.
19. F3-01 Candidates see a feed of open roles they haven't applied to or passed, never their own.
20. F3-02 Candidates can apply to a role with an optional note; one application per role.
21. F3-03 Candidates swipe right to apply and left to pass.
22. F3-05 Candidates can pass on a role so it stops showing up.
23. F3-06 Candidates can see all their applications and withdraw pending ones.
24. F3-04 Roles are ranked by how many of the candidate's skills they need.
25. F3-09 Apply and pass also work with buttons and arrow keys.
26. F3-10 Candidates can undo their last swipe (pass or pending application) in the same session.

### F4 Review, Match & Team Chat
27. F4-01 Owners can see pending applicants for each role.
28. F4-02 Owners can like or pass each applicant.
29. F4-03 The system has a team model and a tested rule for when a team locks.
30. F4-04 Owners review applicants one at a time in a review queue per role.
31. F4-05 Liking an applicant fills the role, and the team locks automatically when every role is filled.
32. F4-07 When a team locks, its members' other pending applications are withdrawn and they are retired.
33. F4-08 Members of a locked team can chat in real time.
34. F4-09 Team chat shows earlier messages and recovers from dropped connections.

### Platform
35. PL-07 Admins can manage users, projects, skills, terms, and messages, and remove bad content.
36. PL-10 Seed data exists for demos and testing.
37. PL-08 A Playwright test covers the golden path end to end.

### Future (not this term)
Expo mobile app, F3-07 live notifications, F1-09 account settings (change password, delete account), F2-09 full accessibility audit, presigned avatar uploads, Tauri desktop wrapper, team-balance score, instructor mode, web push.

## Technical requirements

1. TR-01 Contract-first API: OpenAPI schema generated and committed; frontend uses a generated TypeScript client; CI fails on drift.
2. TR-02 Authentication with django-allauth (headless): session + CSRF for web, email/password and Google, email domain allowlist.
3. TR-03 Object-level authorization on every endpoint and WebSocket (owners for project actions, members for team chat).
4. TR-04 Security: no secrets in the repo, secret scanning in CI, HTTPS, secure cookies, auth rate limiting, uploads checked by the API with storage kept internal, non-root containers.
5. TR-05 Data integrity: unique application per role and user; team lock, withdraw, and retire in one transaction.
6. TR-06 Performance: main list endpoints under 300 ms p95 at seed scale, paginated; chat delivery under 1 second.
7. TR-07 Installable PWA, responsive from 360 px to desktop, current major browsers.
8. TR-08 Accessibility basics on every screen: keyboard-usable, labeled inputs, AA contrast, keyboard alternatives for swiping.
9. TR-09 Deployment: Docker images and Docker Compose; app runs its own Postgres, Redis, and SeaweedFS behind Traefik with HTTPS and health checks.
10. TR-10 CI/CD with GitHub Actions: lint, type check, tests, build, contract check, Docker build, secret scan on every PR; images published on release tags; protected main.
11. TR-11 Testing: tests with every story, every business rule tested, 70%+ backend coverage, Playwright end-to-end test of the golden path.
12. TR-12 Observability: stdout logs with request IDs, no stack traces leaked in prod.
13. TR-13 API usable by a future mobile app (token auth, same generated client).

Tech stack: Django 5.2 + Django REST Framework + Django Channels (Python), Next.js 15 + TypeScript + Tailwind (web/PWA), PostgreSQL, Redis, SeaweedFS, Docker, GitHub Actions.
