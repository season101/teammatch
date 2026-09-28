# ADR 0004: Single-origin routing through Traefik

- Status: Accepted
- Date: 2026-09-27

## Context

The PWA (Next.js) and the API (Django) are separate containers. If they sit on different hosts, the browser needs CORS, cross-site cookies (`SameSite=None`), and CSRF across origins, which is fiddly and easy to break, especially on mobile browsers that block third-party cookies. sitashma-infra already runs Traefik v3 with a `*.sijancodes.com` wildcard cert.

## Decision

- Serve the app on one host: `teammatch.sijancodes.com`.
- Traefik router for `web` matches the host with low priority.
- Traefik router for `api` matches the same host plus `PathPrefix(/api) || PathPrefix(/ws) || PathPrefix(/admin) || PathPrefix(/static) || PathPrefix(/_allauth)` with higher priority.
- Uploaded files also go through the api in the MVP (upload and read avatars under `/api`), so SeaweedFS stays internal-only. A separate `teammatch-files.sijancodes.com` host for presigned URLs is optional and future.
- Locally, Next.js rewrites the same prefixes to the api container, so the browser also sees one origin.

## Consequences

- No CORS, session cookies are first-party with `SameSite=Lax`, CSRF works out of the box.
- WebSockets go to the same host, so the session cookie is sent on the WS handshake.
- The path prefixes are reserved: the frontend cannot have pages under `/api`, `/ws`, `/admin`, `/static` or `/_allauth`.
- Next.js static assets live under `/_next`, which does not clash with Django's `/static`.
- No SeaweedFS CORS is needed in the MVP. If the future files host is added, SeaweedFS will need CORS for `PUT` from the app origin (set by `storage-init`).

## Alternatives considered

- **Separate `api.` subdomain:** clean split, but cross-origin cookies and CORS. More config and more ways to fail.
- **Next.js proxies everything to Django in prod:** one router, but every request goes through Node, and WS proxying in Next is awkward.
- **Serve files through Django:** simpler routing, but every upload and download goes through the app server.
