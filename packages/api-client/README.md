# api-client

TypeScript types generated from `backend/schema.yml` with openapi-typescript. The web app wraps them with openapi-fetch in `frontend/src/lib/api.ts`.

Regenerate with `make client` (or `make schema`, which does both). Don't hand-edit `schema.ts`; CI fails if it drifts from the schema.

`ws.ts` is hand-written: the chat socket frames and close codes from the WebSocket section of `docs/architecture/api.md`. Update it when that section changes.
