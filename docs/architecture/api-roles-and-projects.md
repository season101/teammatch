# Roles, project detail and publish (F2-02)
 
These endpoints let a project owner add roles to a draft project, edit them, and publish the project so it shows up in the open-projects list.
 
All of them need a signed-in session. Unsafe methods (POST, PATCH) also need the `X-CSRFToken` header.
 
## Endpoints
 
| Method and path | Who | What it does |
|---|---|---|
| `GET /api/v1/projects/{id}/` | owner, or anyone for an open or locked project | Project with its roles |
| `POST /api/v1/projects/{id}/roles/` | owner | Add a role to the project |
| `PATCH /api/v1/roles/{id}/` | owner | Edit an open role |
| `DELETE /api/v1/roles/{id}/` | owner | Delete an open role. Its applications go with it. If every other role is filled, the project locks |
| `POST /api/v1/projects/{id}/publish/` | owner | Move a draft project to `open` |

 
## Project detail
 
`GET /api/v1/projects/{id}/` returns the project and its roles. An owner can always open their own project. Other people can open it only when it is `open` or `locked`. A draft or archived project that someone else owns returns `404`.
 
```json
{
  "id": 1,
  "title": "TeamMatch demo",
  "pitch": "Find teammates for a class project",
  "status": "draft",
  "owner": 1,
  "owner_name": "Shree Krishna Shrestha",
  "roles": [
    {
      "id": 3,
      "title": "Backend developer",
      "description": "Builds the Django API",
      "required_skills": [2, 5],
      "status": "open"
    }
  ],
  "created_at": "2026-10-17T20:10:00Z"
}
```
 
## Add and edit a role
 
`POST /api/v1/projects/{id}/roles/` and `PATCH /api/v1/roles/{id}/` use the same fields.
 
| Field | Required | Limit |
|---|---|---|
| `title` | yes | 100 characters |
| `description` | no | free text |
| `required_skills` | yes | at least one skill id |
 
A successful add returns `201 Created` with the role. A successful edit returns `200 OK`.
 
## Publish
 
`POST /api/v1/projects/{id}/publish/` has no body. It moves a `draft` project to `open`. A project with no roles cannot be published (business rule BR-06). An owner can have only one open project per term, so publishing a second one is rejected (business rule BR-14).
 
## Errors
 
| Status | When | Code | Body today |
|---|---|---|---|
| 400 | missing title, or no skills | | `{ "required_skills": ["This list may not be empty."] }` |
| 401 or 403 | not signed in, or not the owner | | `{ "detail": "..." }` |
| 404 | the project or role does not exist, or you may not see it | | `{ "detail": "Not found." }` |
| 409 | project is locked or archived | `project_locked` | `{ "detail": "This project is locked or archived, so its roles cannot change." }` |
| 409 | role is not open | `role_not_open` | `{ "detail": "Only an open role can be edited." }` |
| 409 | publishing a project that is not a draft | `project_not_draft` | `{ "detail": "Only a draft project can be published." }` |
| 409 | publishing a project with no roles | `project_needs_roles` | `{ "detail": "Add at least one role before publishing." }` |
| 409 | deleting the only role of an open project | `project_needs_roles` | `{ "detail": "An open project needs at least one role. Close the project instead." }` |
| 409 | publishing while you already have an open project | `open_project_exists` | `{ "detail": "You already have an open project. Close it or wait until it locks." }` |
 
The owner check runs before the body is validated, so a non-owner gets `403` rather than a `400`.
 
The shared `{ "error": { ... } }` shape in `api.md` is not implemented yet, so these are Django REST Framework's default bodies.
 
## How to try it
 
1. `make up`, then `make migrate`.
2. Sign in at http://localhost:8000/admin/ and make sure a term covers today and some skills exist.
3. Open http://localhost:3000/projects/new and create a project, then choose **Add roles**.
4. On the project page add a role with a title and at least one skill, then choose **Publish project**.
5. Publish a project with no roles to see the `project_needs_roles` message.
You can also use Swagger at http://localhost:8000/api/docs/.
 
## Where the code is
 
- Business rules: `ensure_roles_editable`, `ensure_role_editable`, `publish_project` and `visible_projects` in `backend/apps/projects/services.py`
- Views and URLs: `backend/apps/projects/views.py` and `urls.py`
- Tests: `backend/apps/projects/tests/test_roles.py` and `test_project_detail.py`
- Project page: `frontend/src/app/projects/[id]/page.tsx`
- Role editor: `frontend/src/features/projects/project-editor.tsx` and `role-form.tsx`
