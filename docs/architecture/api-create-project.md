# Create a project (F2-01)

`POST /api/v1/projects/` creates a draft project owned by the signed-in user, in the term whose dates include today.

## Request

Sign in first. The session cookie is used, and unsafe methods need the `X-CSRFToken` header.

```json
{ "title": "TeamMatch demo", "pitch": "Find teammates for a class project" }
```

| Field | Required | Limit |
|---|---|---|
| `title` | yes | 100 characters |
| `pitch` | yes | 2000 characters |

## Response `201 Created`

```json
{
  "id": 1,
  "title": "TeamMatch demo",
  "pitch": "Find teammates for a class project",
  "status": "draft",
  "term": 1,
  "owner": 1,
}
```

`status`, `term` and `owner` are set by the server. A new project is always a `draft`.

## Errors

| Status | When | Body today |
|---|---|---|
| 400 | `title` or `pitch` missing, blank or too long | `{ "title": ["This field is required."] }` |
| 401 or 403 | not signed in | `{ "detail": "Authentication credentials were not provided." }` |
| 409 | no term includes today (`no_active_term`) | `{ "detail": "There is no active term, so projects cannot be created yet." }` |

The shared `{ "error": { ... } }` shape in `api.md` is not implemented yet, so these are Django REST Framework's default bodies.

## How to try it

1. `make up`, then `make migrate`.
2. Create a login (`createsuperuser`) and add a term that covers today.
3. Sign in at http://localhost:8000/admin/.
4. Open http://localhost:3000/projects/new and create a project, or use Swagger at http://localhost:8000/api/docs/.

## Where the code is

- Business rule: `create_project` and `NoActiveTerm` in `backend/apps/projects/services.py`
- Tests: `backend/apps/projects/tests/test_create_project.py`
- Form: `frontend/src/features/projects/new-project-form.tsx`
