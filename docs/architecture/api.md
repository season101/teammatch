# API Contract

One origin serves everything: `https://teammatch.sijancodes.com` in prod, `http://localhost:3000` locally (Next.js rewrites `/api`, `/_allauth`, `/ws` to the api container in dev). No CORS.

The source of truth is the OpenAPI schema, not this page. This page is the overview.

## Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1/` |
| Format | JSON, `snake_case` fields, ISO 8601 UTC timestamps |
| Auth | Session cookie from allauth headless (`browser` client). Unsafe methods need the `X-CSRFToken` header. Future mobile app sends `X-Session-Token` (`app` client). |
| Authz | Every object endpoint checks ownership or membership. Not allowed and not found both return `404` for objects the user cannot see. |
| IDs | Integer ids in paths |
| Trailing slash | Always (`/api/v1/projects/`) |

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
| 400 | `validation_error`, `invalid_avatar` | bad input |
| 401 | `not_authenticated` | no session |
| 403 | `permission_denied`, `profile_retired`, `own_project` | logged in but not allowed |
| 404 | `not_found` | missing or not visible to you |
| 409 | `already_applied`, `role_not_open`, `already_on_team`, `project_locked` | state conflict |
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

### core

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/healthz` | none | liveness, no dependencies |
| GET | `/readyz` | none | readiness, checks db + redis |
| GET | `/api/v1/terms/` | user | list terms |
| GET | `/api/v1/terms/current/` | user | current term |

### accounts

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/me/` | user | current user + profile summary |
| DELETE | `/api/v1/me/` | user | deactivate own account (future, F1-09) |

Login, signup, logout, password and Google live under allauth (below).

### profiles

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/me/profile/` | user | own profile |
| PATCH | `/api/v1/me/profile/` | user | update display name, bio, major, skills |
| POST | `/api/v1/me/avatar/` | user | upload avatar as `multipart/form-data` (JPEG/PNG/WebP, max 2 MB); API saves it to SeaweedFS via django-storages |
| DELETE | `/api/v1/me/avatar/` | user | remove avatar |
| GET | `/api/v1/profiles/{id}/avatar/` | user | avatar image, streamed by the API from SeaweedFS |
| GET | `/api/v1/profiles/{id}/` | user | public profile view |
| GET | `/api/v1/skills/?q=` | user | search skills for pickers |
| POST | `/api/v1/skills/` | user | add a new skill (deduped by name) |

### projects

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/projects/?term=&skill=&q=&status=` | user | browse and search open projects |
| POST | `/api/v1/projects/` | user | create project (draft) |
| GET | `/api/v1/projects/mine/` | user | projects I own |
| GET | `/api/v1/projects/{id}/` | user | project detail with roles |
| PATCH | `/api/v1/projects/{id}/` | owner | edit title, pitch |
| DELETE | `/api/v1/projects/{id}/` | owner | delete draft |
| POST | `/api/v1/projects/{id}/publish/` | owner | draft to open |
| POST | `/api/v1/projects/{id}/close/` | owner | archive |
| POST | `/api/v1/projects/{id}/roles/` | owner | add role |
| PATCH | `/api/v1/roles/{id}/` | owner | edit role, required skills |
| DELETE | `/api/v1/roles/{id}/` | owner | delete open role (may trigger lock) |

### matching

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/feed/` | user | swipe deck, open roles ranked by skill overlap |
| POST | `/api/v1/roles/{id}/dismiss/` | user | candidate pass on a role |
| POST | `/api/v1/applications/` | user | apply to a role `{role, note}` |
| GET | `/api/v1/applications/mine/?status=` | user | my applications |
| POST | `/api/v1/applications/{id}/withdraw/` | applicant | withdraw pending application |
| GET | `/api/v1/roles/{id}/applications/?status=pending` | owner | review queue for a role |
| POST | `/api/v1/applications/{id}/like/` | owner | like, fills role, may lock team |
| POST | `/api/v1/applications/{id}/pass/` | owner | pass |
| GET | `/api/v1/teams/mine/` | user | my team this term, if any |
| GET | `/api/v1/teams/{id}/` | member | team detail with members and roles |

### chat

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/teams/{id}/messages/?cursor=` | member | chat history, newest first |

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
| POST | `auth/login` | email login |
| GET | `auth/session` | who am I |
| DELETE | `auth/session` | logout |
| POST | `auth/email/verify` | verify email key |
| POST | `auth/password/request` | password reset email |
| POST | `auth/password/reset` | set new password with key |
| POST | `auth/provider/redirect` | start Google login (browser form POST) |
| POST | `auth/provider/token` | Google id_token login (app client) |

Domain allowlist (`ALLOWED_EMAIL_DOMAINS`) is enforced in the account and social adapters for all of them.

## WebSocket

| Path | Auth | Purpose |
|---|---|---|
| `/ws/teams/{id}/` | session cookie, must be team member | team chat |
| `/ws/notifications/` | session cookie | per-user events (liked, team formed). **Future (F3-07), not in the MVP.** |

The MVP only builds `/ws/teams/{id}/` for chat. `/ws/notifications/` and its events are kept here as the future contract.

Handshake: same origin, cookie sent automatically. Origin is checked (`AllowedHostsOriginValidator`). Close codes: `4401` not logged in, `4403` not a member, `4404` team not found.

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
| `chat.error` | `{ "code": "validation_error", "message": "...", "client_id": "uuid" }` |
| `application.liked` | `{ "application": 12, "role": 4, "project": 2 }` (future, `/ws/notifications/`) |
| `team.formed` | `{ "team": 3, "project": 2 }` (future, `/ws/notifications/`) |
| `pong` | `{}` |

TypeScript types for these live in `packages/api-client/src/ws.ts`. Any change to this table updates that file in the same PR.

## Rate limits

DRF throttles: `apply` 60/hour per user, `chat.send` 30/10s per connection, anonymous auth endpoints 20/min per IP.
