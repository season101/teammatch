# API Contract

One origin serves everything: `https://teammatch.sijancodes.com` in prod, `http://localhost:3000` locally (Next.js rewrites `/api`, `/_allauth`, `/ws` to the api container in dev). No CORS.

The source of truth is the OpenAPI schema, not this page. This page is the overview.

## Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1/` |
| Format | JSON, `snake_case` fields, ISO 8601 timestamps with their offset, in Central time (`2026-11-15T01:44:00-06:00`; stored in UTC). Dates such as a term's are Central calendar dates |
| Auth | Session cookie from allauth headless (`browser` client). Unsafe methods need the `X-CSRFToken` header. Future mobile app sends `X-Session-Token` (`app` client). |
| Authz | Every object endpoint checks ownership or membership. Objects the user cannot see return `404`. Acting on something you can see but don't own returns `403` (for example editing someone else's profile). |
| Team rules | Applying, creating or publishing a project, like/pass, commit and sending a chat message need the Team rules accepted (`POST /api/v1/me/rules/accept/`, DD-12). Before that they answer `403` `rules_not_accepted` (chat: a `chat.error` with that code). Reading, withdrawing and declining don't. The app's onboarding asks first (DD-47); the API holds it for any client |
| IDs | Integer ids in paths |
| Trailing slash | Always (`/api/v1/projects/`) |
| Past terms | Once a project's term has ended (its last day counts), publishing it, applying to its roles, like/pass and commit answer `409` `term_over`, even by id |

## Versioning

- The version is in the path (`/api/v1/`). Additive changes (new fields, new endpoints) stay in v1.
- Breaking changes (removing or renaming a field, changing meaning) need `/api/v2/` for that resource and an ADR. For a class project we expect to stay on v1.
- WS messages carry a `type` field; new types are additive, clients ignore unknown types.

## OpenAPI and the generated client

- drf-spectacular serves the live schema at `/api/schema/` and Swagger UI at `/api/docs/` (docs UI is staff-only in prod).
- `make schema` writes `backend/schema.yml`, which is committed.
- `make client` regenerates `packages/api-client` from `backend/schema.yml` with `openapi-typescript` + `openapi-fetch`.
- CI regenerates both and fails on `git diff`, so the schema, the client and the code cannot drift.

## Errors

> Today the API returns Django REST Framework's default bodies with one addition: `{ "detail": "...", "code": "..." }`. The `core` exception handler adds `code` whenever the error has one, for example `not_authenticated` or `project_locked`, and the frontend branches on it. Validation errors stay `{ "field": ["..."] }`. The envelope below is the target, not built yet.

All `/api/v1/` errors use one shape (custom DRF exception handler in `core`):

```json
{
  "error": {
    "code": "validation_error",
    "message": "Some fields are invalid.",
    "fields": {
      "title": ["This field is required."]
    }
  }
}
```

| Status | `code` examples | When |
|---|---|---|
| 400 | `validation_error`, `invalid_avatar`, `repo_url_not_github`, `resume_too_big`, `resume_not_pdf` | bad input |
| 401 | `not_authenticated` | no session, sent with `WWW-Authenticate: Session`. A client treats `401` as signed out and `403` as not allowed; a write without the CSRF token is `403` too |
| 403 | `permission_denied`, `profile_retired`, `own_project`, `rules_not_accepted` | logged in but not allowed |
| 404 | `not_found` | missing or not visible to you |
| 409 | `already_applied`, `role_not_open`, `already_on_team`, `project_locked`, `term_over` | state conflict |
| 429 | `throttled` | rate limit |
| 500 | `server_error` | bug, no details leaked |

allauth endpoints keep allauth's own response format (`status`, `errors`, `data`, `meta`); the frontend auth feature handles that separately.

## Pagination

- Lists use cursor pagination: `?cursor=<opaque>&page_size=20` (max 50).
- Response:

```json
{ "next": "https://.../?cursor=abc", "previous": null, "results": [] }
```

- Feed and chat history are cursor-only. Small admin-ish lists (skills, terms) are not paginated.

## Endpoints

Rows marked **(planned)** are the contract for stories that are not built yet. They are not in `backend/schema.yml`, and a request to them returns `404` today. Every other row matches the schema.

### core

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/healthz` | none | liveness, no dependencies |
| GET | `/readyz` | none | readiness, checks db + redis |
| GET | `/api/v1/health/` | none | same checks as `/readyz`; always `200`, the body says whether db and redis are healthy |
| GET | `/api/v1/terms/` | user | list terms **(planned)** |
| GET | `/api/v1/terms/current/` | user | current term **(planned)** |

### accounts

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/me/` | user | current user + profile summary **(planned)** |
| DELETE | `/api/v1/me/` | user | deactivate own account (future, F1-09) |

Login, signup, logout, password and Google live under allauth (below).

### profiles

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/me/profile/` | user | own profile |
| PATCH | `/api/v1/me/profile/` | user | update display name, bio, major, skills, `github_url` and `linkedin_url` (F1-15). Links must be `https://github.com/...` or `https://linkedin.com/...`, with or without `www.`, with a path and no port or user; blank clears one. Anything else is a `400` on the field, "Enter a link that starts with https://github.com/" (code `github_url_invalid`) or the LinkedIn one (`linkedin_url_invalid`) |
| POST | `/api/v1/me/rules/accept/` | user | agree to the Team rules, `204`; repeats keep the first time. `rules_accepted_at` on my profile |
| POST | `/api/v1/me/avatar/` | user | upload my avatar as `multipart/form-data`, field `avatar`: JPEG, PNG or WebP of 2 MB or less, checked from the file's bytes with Pillow. It's redrawn at most 512px (dropping EXIF such as location) and saved to SeaweedFS through django-storages; the old file is deleted. Anything else: `400` `invalid_avatar`, and the old avatar stays. Answers with my profile |
| DELETE | `/api/v1/me/avatar/` | user | remove my avatar and delete its file. Answers with my profile |
| GET | `/api/v1/profiles/{id}/avatar/` | user | avatar image, streamed by the API from SeaweedFS (`Cache-Control: private`). No avatar: `404`. Profiles give `avatar_url`, this address with `?v=` that changes on each upload, or `null` |
| PUT | `/api/v1/me/profile/resume/` | user | upload or replace my resume as `multipart/form-data`, field `resume` (F1-16). Over 5 MB: `400` `resume_too_big`. Not starting with `%PDF-`, whatever its name: `400` `resume_not_pdf`. Either way nothing is saved. Stored on the private `resumes` storage; the old file is deleted. Answers with my profile (`has_resume`, `resume_name`) |
| DELETE | `/api/v1/me/profile/resume/` | user | remove my resume and delete its file. Answers with my profile |
| GET | `/api/v1/profiles/{id}/resume/` | person or owner | the PDF, streamed with `Content-Type: application/pdf`, `Content-Disposition: inline`, `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. `?download=1` sends it as an attachment. Only the person and owners of a project they applied to, in any status (DD-42); anyone else gets `403` before anything else is checked. No resume: `404`. There's never a public link |
| GET | `/api/v1/profiles/{id}/` | user | public profile view: name, bio, major, skills, `avatar_url`, `github_url`, `linkedin_url`, `has_resume` (never the file or its address). The same shape is the `applicant` in Review |
| PATCH | `/api/v1/profiles/{id}/` | owner | edit your own profile by id (`403` for anyone else) |
| GET | `/api/v1/skills/?q=` | user | filter skills by name for pickers |
| POST | `/api/v1/skills/` | user | add a new skill (deduped by name) **(planned)** |

### projects

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/projects/` | user | open projects (not those of deactivated owners, PL-07), cursor-paginated. `?q=` searches title, pitch, open role titles and their required skills, ignoring case (F2-07). The `term`, `skill` and `status` filters are **(planned)** |
| POST | `/api/v1/projects/` | user | create project (draft): title, pitch, and optionally `repo_url` and `details` (F2-12) |
| GET | `/api/v1/projects/mine/` | user | projects I own, newest first, each with its roles in the order they were added (as on the project page) |
| GET | `/api/v1/projects/{id}/` | user | project detail with roles, `repo_url` and `details` (empty strings when not set) |
| PATCH | `/api/v1/projects/{id}/` | owner | edit title, pitch, `repo_url`, `details`. An empty `repo_url` or `details` clears it. A non-empty `repo_url` that isn't `https://github.com/...` gets `400` with the field error `{"repo_url": ["Enter a link that starts with https://github.com/"]}`. The server raises it as `repo_url_not_github`, but field errors don't carry their code in the body yet (F2-12) |
| DELETE | `/api/v1/projects/{id}/` | owner | delete draft **(planned)** |
| POST | `/api/v1/projects/{id}/publish/` | owner | draft to open. The owner-only rows answer `404` for someone else's draft or archived project, `403` for their open or locked one |
| POST | `/api/v1/projects/{id}/close/` | owner | archive |
| POST | `/api/v1/projects/{id}/roles/` | owner | add role with 1-20 `required_skills` ids (unknown id: `400`) |
| PATCH | `/api/v1/roles/{id}/` | owner | edit role, required skills (1-20 ids) |
| DELETE | `/api/v1/roles/{id}/` | owner | delete open role (may trigger lock) |

### matching

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/feed/` | user | swipe deck, open roles ranked by match % (share of the role's required skills I have), then newest. Leaves out deactivated owners' projects (PL-07). Empty while I'm retired |
| POST | `/api/v1/feed/reset/` | user | clear my passes so those roles come back into my feed, `204`. Applied roles stay out |
| POST | `/api/v1/roles/{id}/dismiss/` | user | candidate pass on a role, `204`; repeats are fine. My own project: `403`; role or project not open: `409` |
| DELETE | `/api/v1/roles/{id}/dismiss/` | user | take back my pass on a role, `204`, also when there was none. Only my own pass |
| POST | `/api/v1/applications/` | user | apply to a role `{role, note}`. Retired: `403` `profile_retired`. Committed this term: `409` `applicant_committed` |
| GET | `/api/v1/applications/mine/?status=` | user | my applications. A withdrawn one has `withdrawn_reason`: `applicant` (I withdrew), `committed` (I took a seat elsewhere), `team_locked` (my own team locked) or `project_closed` (the owner closed it); empty on rows withdrawn before it was recorded |
| POST | `/api/v1/applications/{id}/withdraw/` | applicant | withdraw pending application |
| GET | `/api/v1/roles/{id}/applications/?status=` | owner | pending applicants for a role, minus retired and deactivated ones, best `match_percent` first then oldest. Someone else's open or locked project: `403`; their draft or archived one: `404`. `?status=liked` lists offers out, `?status=committed` who took the seat. Each has `committed_elsewhere`: true when the applicant holds a seat on another open project this term, so a like would get `409` `applicant_committed` |
| POST | `/api/v1/applications/{id}/like/` | owner | like: sends an offer, the role stays open (F4-10). Applicant on a team or committed: `409`. Your own application: `403`; someone else's on a role that isn't yours: `404` |
| POST | `/api/v1/applications/{id}/commit/` | applicant | take the seat an offer is for: fills the role, closes my other applications this term, may lock the team. `409` `offer_not_open`, `role_not_open`, `owns_open_project` or `applicant_committed`. An offer on your own role: `403`; anyone else's: `404` |
| POST | `/api/v1/applications/{id}/decline/` | applicant | turn an offer down; the role stays open. Not an open offer: `409` |
| POST | `/api/v1/applications/{id}/pass/` | owner | pass (`403`/`404` as for like) |
| GET | `/api/v1/teams/mine/` | user | my team this term with my `seen_at`: `{"team": {id, project {id, title}, term {name, end_date}, members [{display_name, role}], formed_at, seen_at}}`. `role` is the role title, or `"Owner"`. `formed_at` is when the team locked. No team this term: `200` with `{"team": null}` |
| GET | `/api/v1/teams/{id}/` | member | team detail with members and roles **(planned)** |
| POST | `/api/v1/teams/{id}/seen/` | member | mark the "It's a Team!" screen as seen, `204`. Sets my `seen_at` the first time; repeats keep it. Not my team: `404` |

### chat

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/teams/{id}/messages/?cursor=&after=` | member | chat history, newest first, 50 a page: `{id, team, sender {id, display_name}, body, created_at}`. `after=<message id>` keeps only newer messages (catch-up after a reconnect) and stays in the `next` link; not an integer: `400`. Not on the team or no such team: `404` |

Sending messages is WS only.

### Admin and static

| Path | Purpose |
|---|---|
| `/admin/` | Django admin, staff only |
| `/static/` | Django static files (admin, DRF), served by WhiteNoise |

## allauth headless

Two clients, same backend:

| Client | Prefix | Used by | Session |
|---|---|---|---|
| browser | `/_allauth/browser/v1/` | Next.js PWA | session cookie + CSRF |
| app | `/_allauth/app/v1/` | future Expo app | `X-Session-Token` header |

Endpoints we use (same under both prefixes):

| Method | Path | Purpose |
|---|---|---|
| GET | `config` | available providers, signup open |
| POST | `auth/signup` | email signup |
| POST | `auth/login` | email login; a Google account with no password gets 400 `google_only_account` instead of the usual mismatch (F1-13, DD-37) |
| GET | `auth/session` | who am I |
| DELETE | `auth/session` | logout |
| POST | `auth/email/verify` | verify email key; 200 signed in (the browser that signed up), 401 verified but sign in next |
| POST | `auth/password/request` | password reset email |
| POST | `auth/password/reset` | set new password with key |
| POST | `auth/provider/redirect` | start Google login (browser form POST) |
| POST | `auth/provider/token` | Google id_token login (app client) |
| GET | `account/providers` | linked sign-in providers (Settings, F1-12) |
| POST | `account/password/change` | signed in: set a password; with no password yet, just `new_password` (F1-12) |

`auth/provider/redirect` with `process: "connect"` and `callback_url: "/settings"` links Google to the signed-in account. The Google email has to match the account's, or it comes back as `/settings?error=google_email_mismatch` (F1-12, DD-36).

Domain allowlist (`ALLOWED_EMAIL_DOMAINS`) is enforced in the account and social adapters for all of them. Google sign-ins must also come from LA Tech's Google Workspace, and Google's redirect returns to `/accounts/google/login/callback/`, outside `/_allauth` ([Google Sign-In](google-sign-in.md)).

## WebSocket

| Path | Auth | Purpose |
|---|---|---|
| `/ws/teams/{id}/` | session cookie, must be team member | team chat |
| `/ws/notifications/` | session cookie | per-user events (liked, team formed). **Future (F3-07), not in the MVP.** |

The MVP only builds `/ws/teams/{id}/` for chat. `/ws/notifications/` and its events are kept here as the future contract.

Handshake: same origin, cookie sent automatically. Origin is checked (`AllowedHostsOriginValidator`). Close codes: `4401` not logged in, `4404` team not found or not a member (same answer, so team ids do not leak).

### Message envelope

Every frame is JSON:

```json
{ "type": "string", "data": {} }
```

### Client to server

| `type` | `data` | Notes |
|---|---|---|
| `chat.send` | `{ "body": "string, 1-2000 chars", "client_id": "uuid" }` | `client_id` lets the sender match the echo |
| `ping` | `{}` | keepalive, server replies `pong` |

### Server to client

| `type` | `data` |
|---|---|
| `chat.message` | `{ "id": 1, "team": 3, "sender": { "id": 7, "display_name": "..." }, "body": "...", "created_at": "2026-10-30T18:00:00Z", "client_id": "uuid or null" }` |
| `chat.error` | `{ "code": "validation_error", "message": "...", "client_id": "uuid or null" }`. `code` is `rules_not_accepted` when the sender hasn't accepted the Team rules |
| `application.liked` | `{ "application": 12, "role": 4, "project": 2 }` (future, `/ws/notifications/`) |
| `team.formed` | `{ "team": 3, "project": 2 }` (future, `/ws/notifications/`) |
| `pong` | `{}` |

`packages/api-client/ws.ts` has TypeScript types for the chat socket frames and close codes. Any change to the chat rows above updates that file in the same PR.

## Rate limits

DRF throttles: `apply` 60/hour per user (`POST /api/v1/applications/`, then `429` `throttled`; `DEFAULT_THROTTLE_RATES` in settings, raised in test and local settings), `chat.send` 30/10s per connection **(planned)**, anonymous auth endpoints 20/min per IP.
