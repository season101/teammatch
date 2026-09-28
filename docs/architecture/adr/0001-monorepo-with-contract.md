# ADR 0001: Monorepo with an OpenAPI contract

- Status: Accepted
- Date: 2026-09-27

## Context

Four students, four epics, three two-week sprints. Each of us is graded on our own commits, so we need to work in parallel without stepping on each other. We have a Django backend and a Next.js frontend, and we want a mobile app later that uses the same API.

## Decision

- One repo: `backend/`, `frontend/`, `packages/api-client/`, `docs/`, `deploy/`.
- The backend publishes an OpenAPI schema (drf-spectacular), committed as `backend/schema.yml`.
- `packages/api-client` is generated from that schema (`openapi-typescript` + `openapi-fetch`). WS message types are a small hand-written file in the same package.
- The frontend only talks to the backend through that package. It never imports backend code.
- CI regenerates schema and client and fails if anything changed (contract drift job).
- Each service has its own Dockerfile, dependency file and CI job.

## Consequences

- One PR can change the API and the UI together, reviewed together.
- API changes are visible in review as a `schema.yml` diff.
- Frontend work can start from the schema before the endpoint is finished.
- Extra step: remember `make schema client` before pushing. CI catches it if we forget.
- The generated client is only as good as the serializers' type hints; we need `extend_schema` on custom actions.

## Alternatives considered

- **Two repos (api, web):** cleaner separation, but cross-cutting changes need two PRs and version juggling. Too much overhead for a class project.
- **Hand-written fetch calls:** fast to start, but types drift silently and break at runtime.
- **GraphQL:** nice for the client, but new to most of the team and more backend setup.
