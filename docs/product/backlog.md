# TeamMatch - Product Backlog

Each story is written so it can be pasted into a GitHub issue (User Story template). Business rules (BR-xx) are in [prd.md](prd.md#7-business-rules), use cases (UC-xx) in [use-cases.md](use-cases.md).

- **Sprint:** S0 (now to 10/6), S1 (10/6-10/20), S2 (10/22-11/3), S3 (11/5-11/17)
- **Estimate:** hours, including tests and review fixes
- **Priority:** MoSCoW (Must, Should, Could, Won't this term)
- **Owner slot:** A = F1, B = F2, C = F3, D = F4, rotating = team chore (see [../planning/team-roles.md](../planning/team-roles.md))

## Capacity and assumptions

- Each developer works **10 h per sprint**, 30 h over S1-S3. Team of 4 = 40 h per sprint, 120 h total.
- Per member per sprint: **8 h of stories + 2 h team tax** (1 h code reviews for teammates, 1 h one rotating chore) = 10 h.
- Sprint 0 (9/29 course deliverables and repo setup) is outside this budget.
- The repo scaffold is done by the team lead before S1 (PL-01 to PL-04): allauth auth wiring, Channels configured, CI, compose, generated API client, and empty Django apps. Feature estimates assume this plumbing already exists.
- Members still write their own models, endpoints, and UI for their stories, since implementation is graded per student on their own commits.

## Summary

| ID | Story | Slot | Sprint | Est | Priority |
|---|---|---|---|---|---|
| F1-01 | Sign up with email and password | A | S1 | 2 | Must |
| F1-02 | Sign in and sign out | A | S1 | 2 | Must |
| F1-03 | Create and edit my profile | A | S1 | 2 | Must |
| F1-04 | Add skills to my profile | A | S1 | 2 | Must |
| F1-05 | Sign in with Google | A | S2 | 3 | Must |
| F1-06 | Email domain allowlist | A | S2 | 2 | Must |
| F1-08 | Retired users blocked and term reset | A | S2 | 3 | Must |
| F1-07 | Upload an avatar | A | S3 | 4 | Should |
| PL-07 | Admin moderation | A | S3 | 2 | Should |
| BUF-A3 | Polish and bug buffer | A | S3 | 2 | - |
| F2-01 | Create a project | B | S1 | 3 | Must |
| F2-02 | Add roles with required skills and publish | B | S1 | 3 | Must |
| F2-03 | List open projects | B | S1 | 2 | Must |
| F2-04 | Project detail page | B | S2 | 2 | Should |
| F2-05 | Edit and close a project | B | S2 | 3 | Must |
| F2-06 | Delete an unfillable role | B | S2 | 2 | Must |
| BUF-B2 | Buffer | B | S2 | 1 | - |
| F2-08 | Installable PWA | B | S3 | 3 | Must |
| F2-07 | Search by keyword and filter by skill | B | S3 | 3 | Should |
| F2-10 | Responsive pass | B | S3 | 2 | Should |
| F3-08 | Role card component | C | S1 | 2 | Must |
| F3-01 | Role feed (list view) | C | S1 | 3 | Must |
| F3-02 | Apply to a role with a note | C | S1 | 3 | Must |
| F3-03 | Swipe deck | C | S2 | 4 | Must |
| F3-05 | Pass on a role | C | S2 | 1 | Must |
| F3-06 | My applications and withdraw | C | S2 | 3 | Must |
| F3-04 | Rank roles by skill overlap | C | S3 | 3 | Should |
| F3-09 | Keyboard and button swipe controls | C | S3 | 1 | Should |
| F3-10 | Undo last swipe | C | S3 | 2 | Should |
| BUF-C3 | Buffer | C | S3 | 2 | - |
| F4-01 | See applicants per role | D | S1 | 3 | Must |
| F4-02 | Like or pass an applicant | D | S1 | 2 | Must |
| F4-03 | Team model and lock rule | D | S1 | 3 | Must |
| F4-04 | Review queue UI | D | S2 | 3 | Must |
| F4-05 | Mutual like fills the role and locks the team | D | S2 | 3 | Must |
| F4-07 | Auto-withdraw and retire on lock | D | S2 | 2 | Must |
| F4-08 | Team chat over WebSocket | D | S3 | 6 | Must |
| F4-09 | Chat history and reconnect | D | S3 | 2 | Should |
| PL-05 | First production deploy | rotating | S1 | 1 | Must |
| PL-10 | Seed data script | rotating | S1 | 1 | Should |
| PL-11 | Burn chart and sprint report | rotating | S1, S2, S3 | 1 each | Must |
| PL-12 | Wiki/docs page for the sprint's features | rotating | S1 | 1 | Should |
| PL-06 | Cut release tag and deploy | rotating | S2, S3 | 1 each | Must |
| PL-13 | API docs refresh | rotating | S2 | 1 | Should |
| PL-14 | Playwright setup and smoke test | rotating | S2 | 1 | Should |
| PL-08 | Golden-path end-to-end test | rotating | S3 | 1 | Must |
| PL-09 | Final README and docs | rotating | S3 | 1 | Must |
| PL-01 | Repo scaffold and local stack | Lead | S0 | 8 | Must |
| PL-02 | CI pipeline | Lead | S0 | 5 | Must |
| PL-03 | Project board and issue templates | Lead | S0 | 3 | Must |
| PL-04 | OpenAPI schema and generated client | Lead | S0 | 4 | Must |

Load per member: 8 h stories + 2 h team tax = 10 h every sprint.

- Slots A-D: 8 h of stories each in S1, S2, and S3 (the rows above, buffers included).
- Rotating chores: 4 per sprint, each member picks one (1 h). Code review (1 h per member per sprint) is its own line in the capacity table in [../planning/sprint-plan.md](../planning/sprint-plan.md), not a story.
- PL-01 to PL-04 are done by the lead before S1, outside the 30 h budget.
- F4-06 was merged into F4-05. F1-09, F2-09, and F3-07 moved to the future backlog.

---

## F1 Accounts & Profiles (Member A)

### F1-01 Sign up with email and password
As a student, I want to sign up with my school email and a password so that I can use TeamMatch.
- Given I am on the sign-up page, when I submit a valid school email and a strong password, then my account is created and a verification email is sent.
- Given the email is already registered, when I submit, then I see "account exists, sign in instead".
- Given I click a valid verification link, then my account is verified and I am signed in.

Sprint S1 | 2 h | Must | UC-01

### F1-02 Sign in and sign out
As a user, I want to sign in and out so that my account stays mine on shared devices.
- Given a verified account, when I enter the right email and password, then I am signed in with a session cookie.
- Given wrong credentials, when I submit, then I see a generic error.
- Given I am signed in, when I click sign out, then my session ends and protected pages redirect to sign-in.

Sprint S1 | 2 h | Must | UC-01

### F1-03 Create and edit my profile
As a user, I want a profile with my name, bio, and major so that owners know who I am.
- Given I am signed in, when I save display name, bio (max 500 chars), and major, then my profile shows the new values.
- Given another user views my profile, then they see name, bio, major, and skills but not my email.
- Given I try to edit someone else's profile through the API, then I get 403.

Sprint S1 | 2 h | Must | UC-04

### F1-04 Add skills to my profile
As a candidate, I want to pick my skills from a list so that I see roles that fit me.
- Given the skill list, when I search and pick skills, then they are saved on my profile.
- Given I remove a skill, then it is no longer on my profile.
- Given I try to add a skill not in the list, then it is rejected.

Sprint S1 | 2 h | Must | UC-04

### F1-05 Sign in with Google
As a student, I want to sign in with my Google school account so that I don't need another password.
- Given I click "Continue with Google" and consent, when Google returns an allowed email, then I am signed in, and a new account is created if I didn't have one.
- Given an existing email/password account with the same verified email, then the Google login links to it instead of making a duplicate.
- Given I cancel at Google, then I return to sign-in with a short message.

Sprint S2 | 3 h | Must | UC-02

### F1-06 Email domain allowlist
As an admin, I want only allowed email domains to get in so that the app stays limited to our school.
- Given `ALLOWED_EMAIL_DOMAINS=latech.edu`, when someone signs up or signs in (email or Google) with `@gmail.com`, then it is rejected with a message listing allowed domains (BR-01).
- Given `Student@LATECH.EDU`, then it is accepted (case-insensitive).

Sprint S2 | 2 h | Must | UC-03

### F1-08 Retired users blocked and term reset
As a matched student, I want to be kept out of matching until the term ends so that I'm not pulled into a second team.
- Given the profiles app, then it exposes a `retire(user, until)` service function that F4-07 calls when a team locks.
- Given I am retired, then I cannot apply to roles (API returns 403), my feed shows "On a team until <term end>", and I do not appear in any owner's applicant list (BR-09).
- Given an admin runs the term reset management command for a new term, then `retired_until` is cleared for past terms and I can apply again.

Sprint S2 | 3 h | Must | UC-11

### F1-07 Upload an avatar
As a user, I want to upload a profile picture so that people recognize me.
- Given I pick a JPEG/PNG/WebP under 2 MB, when I upload, then the file is sent to the API as multipart, saved to SeaweedFS through django-storages, and my profile shows the new avatar.
- Given a non-image or a file over 2 MB, then the API rejects it with `invalid_avatar` and my old avatar stays.

Sprint S3 | 4 h | Should | UC-04

### PL-07 Admin moderation
As an admin, I want to manage users, projects, skills, terms, and messages in Django admin so that I can keep things clean.
- Given staff access, then I can search and filter users, projects, applications, and messages.
- Given I archive a project or deactivate a user, then it is hidden from the app.
- Given I add a term or skill, then it is available in the app right away.

Sprint S3 | 2 h | Should | Slot A | UC-14

### F1-09 Account settings (future)
As a user, I want to change my password and delete my account so that I control my data.
- Given I enter my current password and a new strong one, then my password is changed and other sessions are signed out.
- Given I delete my account and confirm, then my profile, pending applications, and dismissals are removed; my messages in locked teams show "former member".

Future | 5 h | Won't this term

---

## F2 Projects & Roles (Member B)

### F2-01 Create a project
As an owner, I want to create a project with a title and pitch so that I can recruit a team.
- Given I am signed in and not retired, when I submit title (max 100) and pitch (max 2000), then a `draft` project is created in the current term with me as owner.
- Given missing fields, then I see validation errors.
- Given there is no active term, then project creation is disabled with a message.

Sprint S1 | 3 h | Must | UC-05

### F2-02 Add roles with required skills and publish
As an owner, I want to add roles with required skills so that the right people find my project.
- Given a draft or open project I own, when I add a role with title, description, and one or more skills, then it is saved as `open`.
- Given a project with at least one role, when I publish, then its status is `open` and roles show in feeds.
- Given a project with no roles, when I publish, then it is blocked (BR-06).
- Given I am not the owner, then add/edit role returns 403.

Sprint S1 | 3 h | Must | UC-05

### F2-03 List open projects
As a candidate, I want to see open projects in this term so that I know what's out there.
- Given open projects exist, when I open "Projects", then I see title, owner, pitch preview, and open role count, newest first, paginated 20 per page.
- Given draft, locked, or archived projects, then they are not listed.

Sprint S1 | 2 h | Must | UC-06

### F2-04 Project detail page
As a candidate, I want to see a project's full pitch and roles so that I can decide where I fit.
- Given an open project, when I open it, then I see pitch, owner profile link, and each role with its skills and status.
- Given a locked project, then it shows "Team formed" and member names, no apply buttons.

Sprint S2 | 2 h | Should | UC-06

### F2-05 Edit and close a project
As an owner, I want to edit or close my project so that it stays accurate.
- Given an open project I own, when I edit title or pitch, then changes are saved.
- Given I close the project, then it is `archived`, its roles leave all feeds, and pending applications are set to `withdrawn`.
- Given a locked project, then editing is blocked (BR-13).

Sprint S2 | 3 h | Must

### F2-06 Delete an unfillable role
As an owner, I want to delete a role nobody fits so that my team can still form.
- Given an open role on my open project, when I delete it and confirm, then pending applications for it are `withdrawn` and the role is removed.
- Given the remaining roles are all filled, then the team-lock check (F4-03 service) re-runs and the project locks (BR-07).
- Given a filled role, then delete is not allowed.

Sprint S2 | 2 h | Must | UC-13

### F2-08 Installable PWA
As a student on my phone, I want to install TeamMatch to my home screen so that it feels like an app.
- Given a supported browser, then the app has a valid manifest, icons, and a basic service worker, and can be installed.
- Given Lighthouse, then the PWA installable check passes.

Sprint S3 | 3 h | Must

### F2-07 Search by keyword and filter by skill
As a candidate, I want to search projects by keyword and skill so that I find relevant ones fast.
- Given a keyword, then results match on project title or pitch.
- Given a skill, then results include projects with at least one open role requiring it.
- Given no results, then I see an empty state with "clear filters".

Sprint S3 | 3 h | Should | UC-06

### F2-10 Responsive pass
As a phone user, I want every screen to fit my screen so that I can use the app on the go.
- Given widths from 360 px to 1440 px, then no screen scrolls sideways.
- Given a phone, then tap targets are at least 44 px.

Sprint S3 | 2 h | Should

### F2-09 Full accessibility audit (future)
As any user, I want every screen to work with a keyboard and screen reader so that everyone can use it.
- Given Lighthouse accessibility, then score is 90 or higher on feed, project, review, and chat pages.
- Given a screen reader, then every screen and action is announced correctly.

Future | 6 h | Won't this term. In the MVP, accessibility basics are part of the Definition of Done: keyboard-usable, labeled inputs, AA contrast.

---

## F3 Swipe Feed & Applications (Member C)

### F3-08 Role card component
As a candidate, I want each role shown as a clear card so that I can decide quickly.
- Given a role, then the card shows role title, project title, owner, required skills (my matching skills highlighted), and a short pitch.
- Given a long pitch, then it is truncated with "more".

Sprint S1 | 2 h | Must

### F3-01 Role feed (list view)
As a candidate, I want a feed of open roles so that I can find ones to apply to.
- Given open roles in the current term, then I see roles I have not applied to or passed, excluding my own projects (BR-04).
- Given many roles, then the API pages results (20 per page).

Sprint S1 | 3 h | Must | UC-07

### F3-02 Apply to a role with a note
As a candidate, I want to apply to a role with an optional note so that the owner knows why I fit.
- Given an open role, when I apply with a note (max 300 chars), then a `pending` application is created and shows in the owner's applicant list.
- Given I already applied to this role, then no duplicate is created (BR-02).
- Given I own the project, then the API returns 403 (BR-04).
- Given the role was filled meanwhile, then I see "this role was just filled".

Sprint S1 | 3 h | Must | UC-07

### F3-03 Swipe deck
As a candidate, I want to swipe right to apply and left to pass so that browsing is fast and fun.
- Given the feed, then role cards show one at a time as a stack (built on a drag library).
- Given I drag a card past the threshold right, then it applies (with optional note); left, then it passes.
- Given the deck is empty, then I see "you're all caught up".

Sprint S2 | 4 h | Must | UC-07, UC-08

### F3-05 Pass on a role
As a candidate, I want to pass on a role so that it stops showing up.
- Given a role card, when I pass, then a `RoleDismissal` is saved and the role no longer appears in my deck (BR-10).
- Given I pass, then the owner is not notified.

Sprint S2 | 1 h | Must | UC-08

### F3-06 My applications and withdraw
As a candidate, I want to see and withdraw my applications so that I stay in control.
- Given I open "My applications", then I see each application with role, project, and status (pending, liked, passed, withdrawn).
- Given a pending application, when I withdraw and confirm, then its status is `withdrawn` and it leaves the owner's queue.
- Given a liked application, then there is no withdraw button and the API rejects it (BR-11).

Sprint S2 | 3 h | Must | UC-09

### F3-04 Rank roles by skill overlap
As a candidate, I want roles that match my skills first so that I see the best fits early.
- Given my skills and a role's required skills, then the feed sorts by number of overlapping skills, then by newest.
- Given I have no skills, then I am prompted to add skills and the feed sorts by newest.

Sprint S3 | 3 h | Should | UC-07

### F3-09 Keyboard and button swipe controls
As a user who can't or doesn't want to drag, I want buttons and arrow keys for apply and pass so that the deck is accessible.
- Given the deck, then Apply and Pass buttons are visible below the card.
- Given keyboard focus on the deck, then right arrow applies and left arrow passes.

Sprint S3 | 1 h | Should

### F3-10 Undo last swipe
As a candidate, I want to undo my last swipe so that a mis-swipe isn't permanent.
- Given I passed on a role in this session, when I tap "Undo", then the dismissal is removed and the card comes back.
- Given I applied to a role in this session and the application is still pending, when I tap "Undo", then the application is withdrawn and the card comes back.
- Given the last application is no longer pending, then undo is not offered.

Sprint S3 | 2 h | Should | UC-07, UC-08

### F3-07 Live notifications (future)
As a user, I want to be told right away when I'm liked or my team forms so that I don't have to keep checking.
- Given I am online, when an owner likes me, then I get an in-app notification over `/ws/notifications/`.
- Given my team locks, then all members get a "team formed" notification with a link to the team page.

Future | 6 h | Won't this term

---

## F4 Review, Match & Team Chat (Member D)

### F4-01 See applicants per role
As an owner, I want to see who applied to each role so that I can pick my team.
- Given my open project, then each role lists pending applicants with name, major, skills, and note.
- Given a project I don't own, then the endpoint returns 403.

Sprint S1 | 3 h | Must | UC-10

### F4-02 Like or pass an applicant
As an owner, I want to like or pass an applicant so that I can decide on each one.
- Given a pending application on my role, when I pass, then it is `passed`.
- Given a pending application on my role, when I like, then it is `liked`.
- Given an application that is not pending, then like/pass is rejected.

Sprint S1 | 2 h | Must | UC-10

### F4-03 Team model and lock rule
As the team, we want a `Team` and `Membership` model with a tested lock rule so that later stories build on a solid base.
- Given a project, then a service function `try_lock(project)` locks it only if all roles are filled (BR-06).
- Given a lock, then a `Team` is created with memberships for the owner and each `filled_by` user.
- Given `try_lock` is called twice, then only one `Team` exists (DB constraint + row lock).

Sprint S1 | 3 h | Must | UC-11

### F4-04 Review queue UI
As an owner, I want a review queue per role that shows one applicant at a time so that reviewing is quick.
- Given I open the queue and pick a role, then applicants show one at a time with skills that match the role highlighted.
- Given I like or pass, then the next applicant shows.
- Given no pending applicants, then I see an empty state.

Sprint S2 | 3 h | Must | UC-10

### F4-05 Mutual like fills the role and locks the team when all roles are filled
As an owner, I want liking an applicant to fill the role, and my team to form once every role is filled, so that we can start working.
- Given I like a pending applicant, then the role is `filled` with `filled_by` set and other pending applications for that role are `passed` (BR-05).
- Given that was the last open role, then the project becomes `locked` and a `Team` is created in the same transaction (BR-06).
- Given some roles are still open, then the project stays `open`.
- Given the applicant was retired by another team a moment earlier, then the like fails with a clear message.

Sprint S2 | 3 h | Must | UC-10, UC-11

### F4-06 Auto team-lock
Merged into F4-05.

### F4-07 Auto-withdraw and retire on lock
As a matched student, I want my other applications withdrawn when my team forms so that no other owner picks me.
- Given a team locks, then every member's other pending applications in that term are `withdrawn` (BR-08).
- Given a team locks, then A's `retire(user, until)` (F1-08) is called for each member with the term end.
- Given those withdrawn applications, then they leave the affected owners' queues.

Sprint S2 | 2 h | Must | UC-11

### F4-08 Team chat over WebSocket
As a team member, I want real-time chat with my team so that we can get started right away.
- Given I am a member of a locked team, when I open the team page, then a WebSocket connects to `/ws/teams/<id>/`.
- Given I send a message (1 to 2000 chars), then it is saved and appears for all connected members within 1 second.
- Given I am not a member, then the connection is refused (BR-12).

Sprint S3 | 6 h | Must | UC-12

### F4-09 Chat history and reconnect
As a team member, I want to see earlier messages and not lose any when my connection drops so that I can follow the conversation.
- Given I open the team page, then the last 50 messages load.
- Given the socket drops, then the client reconnects and fetches messages it missed.

Sprint S3 | 2 h | Should | UC-12

---

## Rotating chores (1 h each)

Each member picks one chore per sprint at sprint planning. Code review (1 h per member per sprint) is not a story; it is tracked as its own line in the capacity table.

### PL-05 First production deploy
As a team, we want the walking skeleton live so that we demo from the real URL.
- Given the documented deploy steps, then the stack runs on the host behind HTTPS at the TeamMatch domain.
- Given the deploy, then `/healthz` and `/readyz` return 200 and a user can sign up.

Sprint S1 | 1 h | Must | Slot: rotating

### PL-10 Seed data script
As a developer, I want seed data so that we can demo and test with realistic content.
- Given `make seed`, then a term, a skill list, users, and projects with roles exist, including one project one like away from locking.
- Given seed runs twice, then it does not create duplicates.

Sprint S1 | 1 h | Should | Slot: rotating

### PL-11 Burn chart and sprint report
As a team, we want a burn-down chart and short report every sprint so that progress is visible and graded.
- Given the sprint ends, then the burn-down chart from Hrs Left is in the spreadsheet and docs, with a short done/not done summary.

Sprint S1, S2, S3 | 1 h each | Must | Slot: rotating

### PL-12 Wiki/docs page for the sprint's features
As a team, we want a short docs page for what shipped so that the wiki stays current.
- Given the sprint's merged stories, then the wiki has a page describing the new features and how to try them.

Sprint S1 | 1 h | Should | Slot: rotating

### PL-06 Cut release tag and deploy
As a team, we want a tagged release deployed after each sprint so that deploys are repeatable.
- Given the retro is done, then a `vS.x.0` tag is cut, images are published by CI, and prod is updated to that tag.

Sprint S2, S3 | 1 h each | Must | Slot: rotating

### PL-13 API docs refresh
As a developer, I want the API docs to match the code so that frontend and backend stay in sync.
- Given the sprint's API changes, then `docs/architecture/api.md` matches `backend/schema.yml`.

Sprint S2 | 1 h | Should | Slot: rotating

### PL-14 Playwright setup and smoke test
As a team, we want Playwright wired into CI so that later e2e tests are cheap to add.
- Given the local stack, then one Playwright smoke test signs in and loads the feed, and runs in CI.

Sprint S2 | 1 h | Should | Slot: rotating

### PL-08 Golden-path end-to-end test
As a team, we want an automated test of the full flow so that we know the demo works.
- Given the PL-14 setup, then a single Playwright test signs up two users, creates a project with one role, applies, likes, sees the team lock, and exchanges a chat message.

Sprint S3 | 1 h | Must | Slot: rotating

### PL-09 Final README and docs
As a team, we want a final README and docs so that the final build is complete.
- Given the repo, then the README and docs cover setup, architecture, and a short user guide.

Sprint S3 | 1 h | Must | Slot: rotating

---

## Sprint 0 (lead, before S1, outside the 30 h budget)

### PL-01 Repo scaffold and local stack
As a developer, I want one command to run the whole stack locally so that everyone can start coding on day one.
- Given a fresh clone and `.env` from `.env.example`, when I run `make up`, then web, api, db, redis, and storage are healthy.
- Given the scaffold, then allauth auth wiring, Channels (ASGI + Redis channel layer), and empty Django apps are in place.
- Given the api is up, then `/healthz` returns 200.

Sprint S0 | 8 h | Must | Lead, before S1, outside the 30 h budget

### PL-02 CI pipeline
As a team, we want CI on every PR so that main stays green.
- Given a PR, then CI runs backend lint/type/tests, frontend lint/type/tests/build, contract check, Docker builds, and secret scan.
- Given any job fails, then the PR can't merge.

Sprint S0 | 5 h | Must | Lead, before S1, outside the 30 h budget

### PL-03 Project board and issue templates
As a team, we want a GitHub Project board with our fields so that we can track stories and hours.
- Given the board, then it has Status, Sprint, Epic, Estimate, Hrs Left, and Owner fields.
- Given a new issue, then User Story, Task, and Bug templates are offered.

Sprint S0 | 3 h | Must | Lead, before S1, outside the 30 h budget

### PL-04 OpenAPI schema and generated client
As a developer, I want the API contract generated and committed so that frontend and backend don't drift.
- Given a backend change, when I run `make schema`, then `backend/schema.yml` and the TS client are regenerated.
- Given the schema or client is stale, then CI fails.

Sprint S0 | 4 h | Must | Lead, before S1, outside the 30 h budget

---

## Technical requirements

| ID | Area | Requirement |
|---|---|---|
| TR-01 | Contract-first API | All HTTP endpoints are described in an OpenAPI 3 schema (`backend/schema.yml`) generated by drf-spectacular and committed. The frontend uses a TS client generated from it and never imports backend code. CI fails on drift. WebSocket messages have a documented JSON schema. |
| TR-02 | Authentication | django-allauth headless. Web uses session cookie + CSRF on a single origin; token (app) client reserved for a future mobile app. Email/password with verification and Google sign-in. Domain allowlist enforced for both (BR-01). |
| TR-03 | Authorization | Every endpoint checks object-level permissions: owners only for project/role/review actions, members only for team and chat (REST and WebSocket). Tests cover the 403 path for each. |
| TR-04 | Security | No secrets in the repo (gitleaks in CI, `.env` gitignored). HTTPS only in prod, secure/HttpOnly/SameSite cookies. Rate limiting on auth endpoints. Uploads go through the API with type and size checked; SeaweedFS is internal-only. Non-root containers. DB and Redis not exposed outside the private network. |
| TR-05 | Data integrity | Unique constraint on (role, applicant). Team lock, auto-withdraw, and retire happen in one transaction with row locks. |
| TR-06 | Performance | Feed, project list, and review endpoints p95 under 300 ms at seed scale; lists paginated; no N+1 queries (checked in tests). Chat delivery under 1 second. |
| TR-07 | PWA and responsive | Installable PWA (manifest, basic service worker, icons). Works from 360 px phone width to desktop. Latest Chrome, Safari, Firefox, Edge. |
| TR-08 | Accessibility | Definition of Done basics on every screen: keyboard-usable, labeled inputs, AA contrast. Swipe has button and arrow-key alternatives. A full audit (Lighthouse 90+, screen reader pass) is future (F2-09). |
| TR-09 | Deployment | Docker images for api and web; Compose for local and prod. The app brings its own Postgres, Redis, and SeaweedFS. Prod runs behind Traefik on the team server with `/healthz` and `/readyz`. Deploy steps documented and repeatable. |
| TR-10 | CI/CD | GitHub Actions on every PR and push to main: ruff, mypy, pytest (with Postgres and Redis), pnpm lint, typecheck, Vitest, build, contract check, Docker build, gitleaks. Tag `v*` publishes images. Protected main, PR review required. |
| TR-11 | Testing | Every story ships with tests. Every business rule (BR-xx) has at least one backend test. Backend line coverage 70%+. Playwright covers the golden path. |
| TR-12 | Observability | Logs to stdout in a consistent format; request IDs on API logs; errors never leak stack traces to clients in prod. |
| TR-13 | Mobile-ready API | API does not depend on web-only behavior, so a future Expo app can use the same generated client with token auth. |

---

## Future backlog (ranked)

Not planned for this term. Ranked by value and how much existing work they reuse.

| Rank | ID | Item | Why this order |
|---|---|---|---|
| 1 | FU-01 | Expo mobile app (iOS/Android) using the generated client and allauth app tokens | API and auth are already built for it; biggest reach for the least new backend work |
| 2 | F3-07 | Live notifications over `/ws/notifications/` (liked, team formed) | Channels is already set up for chat; biggest UX gain after mobile |
| 3 | F1-09 | Account settings (change password, delete account) | Mostly allauth built-ins plus a delete flow |
| 4 | F2-09 | Full accessibility audit (Lighthouse 90+, screen reader pass) | MVP already covers the basics in the Definition of Done |
| 5 | FU-06 | Presigned avatar uploads through a public files host | Optimization only; MVP uploads go through the API |
| 6 | FU-02 | Tauri desktop wrapper | Small effort on top of the PWA; nice for labs |
| 7 | FU-03 | Team-balance score and role recommendations | Uses skills data we already collect; helps owners pick |
| 8 | FU-04 | Instructor / course mode (sections, deadlines, formation dashboard) | Useful for real class adoption, but new permissions model |
| 9 | FU-05 | Web push notifications | Builds on F3-07; needs push service setup and permission UX |
