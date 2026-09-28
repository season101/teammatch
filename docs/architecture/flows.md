# Main Flows

Sequence diagrams for the flows that cross more than one module. Everything goes through Traefik on `teammatch.sijancodes.com`; it is left out of most diagrams to keep them readable.

## 1. Email signup with domain allowlist

```mermaid
sequenceDiagram
    actor U as Student
    participant W as web - Next.js
    participant A as api - allauth headless
    participant AD as AccountAdapter
    participant DB as Postgres
    participant M as SMTP

    U->>W: fill signup form
    W->>A: GET /_allauth/browser/v1/config
    A-->>W: CSRF cookie + config
    W->>A: POST /_allauth/browser/v1/auth/signup {email, password}
    A->>AD: is_open_for_signup / clean_email
    alt domain not in ALLOWED_EMAIL_DOMAINS
        AD-->>A: ValidationError
        A-->>W: 400 email domain not allowed
        W-->>U: show error
    else domain allowed
        A->>DB: insert User + EmailAddress unverified
        A->>DB: insert Profile via post_save signal
        A->>M: send verification email
        A-->>W: 401 with pending flow verify_email
        W-->>U: check your inbox
        U->>W: open link with key
        W->>A: POST /_allauth/browser/v1/auth/email/verify {key}
        A->>DB: mark email verified
        A-->>W: 200 session cookie set
        W-->>U: redirect to profile setup
    end
```

## 2. Google sign-in via allauth headless

The browser does a real form POST (not fetch) so allauth can redirect to Google.

```mermaid
sequenceDiagram
    actor U as Student
    participant W as web - Next.js
    participant A as api - allauth headless
    participant G as Google OAuth
    participant AD as SocialAccountAdapter
    participant DB as Postgres

    U->>W: click Continue with Google
    W->>A: form POST /_allauth/browser/v1/auth/provider/redirect {provider google, callback_url /auth/callback, process login}
    A-->>U: 302 to Google consent screen
    U->>G: sign in and consent
    G-->>A: 302 /accounts/google/login/callback/?code=...
    A->>G: exchange code for tokens
    G-->>A: id_token with email, email_verified, hd
    A->>AD: pre_social_login / is_open_for_signup
    alt email domain not allowed
        AD-->>A: reject
        A-->>U: 302 /auth/callback?error=domain_not_allowed
    else allowed
        A->>DB: get or create User, SocialAccount, Profile
        A-->>U: 302 /auth/callback with session cookie
        U->>W: GET /auth/callback
        W->>A: GET /_allauth/browser/v1/auth/session
        A-->>W: 200 user
        W-->>U: go to feed
    end
```

## 3. Swipe apply

```mermaid
sequenceDiagram
    actor C as Candidate
    participant W as web
    participant A as api - matching
    participant DB as Postgres

    C->>W: open feed
    W->>A: GET /api/v1/feed/?cursor=...
    A->>DB: open roles this term, not own project, not applied, not dismissed, ranked by skill overlap
    A-->>W: 200 role cards
    alt swipe right
        C->>W: apply with optional note
        W->>A: POST /api/v1/applications/ {role, note}
        A->>A: check not owner, not retired, role open
        A->>DB: insert Application pending
        alt unique role and applicant violated
            A-->>W: 409 already_applied
        else ok
            A-->>W: 201 application
        end
    else swipe left
        C->>W: pass
        W->>A: POST /api/v1/roles/{id}/dismiss/
        A->>DB: insert RoleDismissal, ignore if exists
        A-->>W: 204
    end
    W-->>C: next card
```

## 4. Owner like, role filled, team lock

The whole like runs in one DB transaction. Row locks stop two owners of different projects from grabbing the same candidate at the same time, and stop two likes in the same project from both thinking they filled the last role.

```mermaid
sequenceDiagram
    actor O as Owner
    participant W as web
    participant A as api - matching.services
    participant DB as Postgres

    O->>W: like applicant for role
    W->>A: POST /api/v1/applications/{id}/like/
    A->>DB: BEGIN
    A->>DB: SELECT project FOR UPDATE
    A->>DB: SELECT role FOR UPDATE
    A->>DB: SELECT application FOR UPDATE
    A->>DB: SELECT candidate profile FOR UPDATE
    alt role not open, app not pending, or candidate already on a team this term
        A->>DB: ROLLBACK
        A-->>W: 409 conflict with code
    else ok
        A->>DB: application.status = liked
        A->>DB: role.status = filled, filled_by = candidate
        A->>DB: other pending apps for this role = withdrawn
        A->>DB: count open roles in project
        alt open roles remain
            A->>DB: COMMIT
            A-->>W: 200 role filled
        else all roles filled
            A->>DB: project.status = locked
            A->>DB: insert Team, Membership for owner and each filled_by
            A->>DB: other pending apps of all members this term = withdrawn
            A->>DB: member profiles retired_until = term end_date
            A->>DB: COMMIT
            A-->>W: 200 team formed
        end
    end
```

Notes:

- Locks are always taken in the same order (project, role, application, profile) to avoid deadlocks.
- Live notifications over `/ws/notifications/` (`application.liked`, `team.formed`) are future (F3-07). In the MVP the candidate sees the new status in My applications and the team page on the next load. When notifications are added, they will be sent with `transaction.on_commit` so nobody gets an event for a rolled back change.
- The owner is a member of their own team, so owners are also blocked from other teams that term.

## 5. Team chat over WebSocket

```mermaid
sequenceDiagram
    actor U as Member
    participant W as web
    participant A0 as api - REST
    participant T as Traefik
    participant C as api - ChatConsumer
    participant DB as Postgres
    participant R as Redis channel layer
    actor U2 as Other member

    U->>W: open team page
    W->>A0: GET /api/v1/teams/{id}/messages/?cursor=...
    A0-->>W: 200 last 50 messages
    W->>T: WSS /ws/teams/{id}/ with session cookie
    T->>C: upgrade, same origin
    C->>C: AuthMiddlewareStack loads user from session
    C->>DB: Membership exists for team and user?
    alt anonymous or not a member
        C-->>W: close 4403
    else member
        C->>R: group_add team_{id}
        C-->>W: accept
        U->>W: type message
        W->>C: {type chat.send, body}
        C->>DB: insert ChatMessage
        C->>R: group_send team_{id} chat.message
        R-->>C: chat.message to every consumer in group
        C-->>W: {type chat.message, message}
        C-->>U2: {type chat.message, message}
    end
```

`api - REST` and `api - ChatConsumer` are the same `api` container; uvicorn serves both HTTP and WS.

## 6. Avatar upload through the API

In the MVP the file goes through Django. SeaweedFS stays internal-only; the browser never talks to it. Presigned direct uploads through a public files host are a future optimization.

```mermaid
sequenceDiagram
    actor U as Student
    participant W as web
    participant A as api - profiles
    participant S as SeaweedFS (internal)

    U->>W: pick image
    W->>W: check type jpeg/png/webp and size under 2 MB
    W->>A: POST /api/v1/me/avatar/ multipart file
    A->>A: check type and size, build key avatars/{user_id}/{uuid}.{ext}
    alt not an image or over 2 MB
        A-->>W: 400 invalid_avatar
    else ok
        A->>S: save via django-storages (S3 API)
        A->>A: save avatar_key, delete old object
        A-->>W: 200 profile with avatar_url
    end
    W-->>U: show new avatar
```

The bucket is private. `avatar_url` points at `GET /api/v1/profiles/{id}/avatar/`, which the API streams from SeaweedFS, so images are served from the same origin.
