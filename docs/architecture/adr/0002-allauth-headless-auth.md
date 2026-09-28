# ADR 0002: django-allauth headless for auth

- Status: Accepted
- Date: 2026-09-27

## Context

We need email/password and Google sign-in, email verification, password reset, and a configurable school email domain allowlist (`ALLOWED_EMAIL_DOMAINS`, e.g. `latech.edu`). The UI is a separate Next.js app, and a future Expo app should reuse the same auth. The host (sitashma-infra) has no shared auth middleware, and routes there are public, so the app has to own auth.

## Decision

- Use django-allauth in **headless** mode.
- `browser` client (`/_allauth/browser/v1/`) for the PWA: Django session cookie + CSRF, same origin so no CORS or third-party cookies.
- `app` client (`/_allauth/app/v1/`) reserved for the Expo app: `X-Session-Token` header.
- Google through allauth's social provider. The Google redirect is a browser form POST to `auth/provider/redirect`.
- The domain allowlist lives in custom `AccountAdapter` and `SocialAccountAdapter` so email and Google signup both go through it.
- DRF uses session auth for the browser client and allauth's token auth class for the app client.
- Channels uses `AuthMiddlewareStack`, so WS connections reuse the same session.

## Consequences

- One auth system for REST, WS and admin.
- Verification, reset, rate limits and account linking come for free.
- allauth response format is different from our `/api/v1/` error format; the auth feature on the frontend handles it separately.
- Sessions are server-side, so logout and deactivation take effect immediately.

## Alternatives considered

- **JWT (simplejwt) + custom Google flow:** more code for us, token refresh and revoke to handle, and storing tokens in the browser is weaker than an httpOnly cookie.
- **NextAuth / Auth.js in the frontend:** auth would live in the web app, and Django plus a future mobile app would need a second way to trust users.
- **oauth2-proxy in front (msa2 style):** only allowlisted accounts, no public signup. Does not fit.
