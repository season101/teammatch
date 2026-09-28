# ADR 0003: Django Channels + Redis for chat and live events

- Status: Accepted
- Date: 2026-09-27

## Context

Locked teams get a chat room. Candidates should also see "you got liked" and "team formed" without refreshing. We want real-time, but we are four students with one Django app and no budget for a hosted chat service.

## Decision

- Run Django under ASGI (uvicorn). The same `api` container serves HTTP and WebSocket.
- Django Channels 4 with `channels-redis` as the channel layer, backed by our own Redis container.
- Paths: `/ws/teams/<id>/` for chat (MVP). `/ws/notifications/` for per-user events is future (F3-07); the path is reserved.
- On connect: authenticate from the session (`AuthMiddlewareStack`), check origin, check team membership, then join group `team_<id>`. Close with `4403` if not a member.
- Messages are saved to Postgres before broadcast. History is loaded over REST with cursor pagination.
- When live notifications are added (future), domain events (like, team formed) will be pushed with `group_send` inside `transaction.on_commit`.
- The JSON message schema is documented in `api.md` and typed in `packages/api-client/src/ws.ts`.

## Consequences

- One codebase, one auth, one deploy for REST and WS.
- Redis is a hard dependency for chat; `/readyz` checks it.
- Consumers must use `database_sync_to_async` for ORM calls; easy to get wrong, so tests use Channels' `WebsocketCommunicator`.
- Horizontal scaling works later because the channel layer is shared, but we run one api replica for now.

## Alternatives considered

- **Polling every few seconds:** simplest, but laggy and wasteful, and chat was an explicit feature.
- **Server-Sent Events:** fine for notifications, but chat needs client to server too.
- **Hosted service (Pusher, Firebase):** extra account, secrets and vendor limits, and less for us to learn and show.
- **Separate Node socket server:** second backend language and a second place to check auth.
