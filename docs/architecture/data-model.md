# Data Model

All tables live in one Postgres 17 database. Every table has an `id` bigint PK and `created_at` / `updated_at` unless noted. Enums are stored as short text with a `CHECK` constraint (Django `TextChoices`).

## ERD

```mermaid
erDiagram
    USER ||--|| PROFILE : has
    PROFILE ||--o{ PROFILE_SKILL : lists
    SKILL ||--o{ PROFILE_SKILL : "tagged in"
    TERM ||--o{ PROJECT : groups
    USER ||--o{ PROJECT : owns
    PROJECT ||--|{ ROLE : defines
    ROLE ||--o{ ROLE_SKILL : requires
    SKILL ||--o{ ROLE_SKILL : "required by"
    USER |o--o{ ROLE : "fills"
    ROLE ||--o{ APPLICATION : receives
    USER ||--o{ APPLICATION : submits
    USER ||--o{ ROLE_DISMISSAL : dismisses
    ROLE ||--o{ ROLE_DISMISSAL : "dismissed in"
    PROJECT ||--o| TEAM : "locks into"
    TEAM ||--|{ MEMBERSHIP : has
    USER ||--o{ MEMBERSHIP : "belongs via"
    ROLE ||--o| MEMBERSHIP : "seat for"
    TEAM ||--o{ CHAT_MESSAGE : contains
    USER ||--o{ CHAT_MESSAGE : sends

    USER {
        bigint id PK
        string email UK
        string password "nullable for Google-only"
        bool is_active
        bool is_staff
        datetime date_joined
    }
    PROFILE {
        bigint id PK
        bigint user_id FK,UK
        string display_name
        text bio
        string major
        string avatar_key "SeaweedFS object key, nullable"
        date retired_until "nullable"
    }
    SKILL {
        bigint id PK
        string name UK "case-insensitive"
        string slug UK
    }
    PROFILE_SKILL {
        bigint profile_id FK
        bigint skill_id FK
    }
    TERM {
        bigint id PK
        string name UK "e.g. Fall 2026"
        date start_date
        date end_date
    }
    PROJECT {
        bigint id PK
        bigint owner_id FK
        bigint term_id FK
        string title
        text pitch
        string status "draft, open, locked, archived"
    }
    ROLE {
        bigint id PK
        bigint project_id FK
        string title
        text description
        string status "open, filled"
        bigint filled_by_id FK "nullable"
    }
    ROLE_SKILL {
        bigint role_id FK
        bigint skill_id FK
    }
    APPLICATION {
        bigint id PK
        bigint role_id FK
        bigint applicant_id FK
        string status "pending, liked, passed, withdrawn"
        text note
    }
    ROLE_DISMISSAL {
        bigint id PK
        bigint user_id FK
        bigint role_id FK
    }
    TEAM {
        bigint id PK
        bigint project_id FK,UK
        datetime formed_at
    }
    MEMBERSHIP {
        bigint id PK
        bigint team_id FK
        bigint user_id FK
        bigint role_id FK "nullable, null for owner"
    }
    CHAT_MESSAGE {
        bigint id PK
        bigint team_id FK
        bigint sender_id FK
        text body
        datetime created_at
    }
```

Notes:

- `Profile_Skill` and `Role_Skill` are plain M2M through tables (`Profile.skills`, `Role.required_skills`).
- `Term.start` / `Term.end` are stored as `start_date` / `end_date` (`end` is a reserved word in SQL).
- `Membership.role` is null for the project owner, who is always a member.
- `ChatMessage` has no `updated_at`; messages are not editable in the MVP.

## State machines

### Application

```mermaid
stateDiagram-v2
    [*] --> pending : candidate swipes apply
    pending --> liked : owner likes
    pending --> passed : owner passes
    pending --> withdrawn : candidate withdraws
    pending --> withdrawn : auto, candidate locked into another team
    pending --> withdrawn : auto, role filled by someone else
    liked --> [*]
    passed --> [*]
    withdrawn --> [*]
```

A like fills the role immediately, so `liked` is final. Only `pending` rows can change.

### Role

```mermaid
stateDiagram-v2
    [*] --> open : owner creates role
    open --> filled : owner likes an application
    open --> [*] : owner deletes role, project not locked
    filled --> [*]
```

### Project

```mermaid
stateDiagram-v2
    [*] --> draft : owner creates
    draft --> open : owner publishes, at least 1 role
    open --> draft : owner unpublishes, no liked apps yet
    open --> locked : last open role filled
    locked --> archived : term ends
    open --> archived : owner closes or term ends
    draft --> archived : owner closes or term ends
    archived --> [*]
```

## Constraints

| Table | Constraint | Why |
|---|---|---|
| `profile` | `UNIQUE(user_id)` | 1:1 with user |
| `skill` | `UNIQUE(lower(name))`, `UNIQUE(slug)` | no duplicate skills by case |
| `term` | `CHECK(start_date < end_date)` | valid range |
| `project` | `CHECK(status IN (...))` | enum |
| `role` | `CHECK(status IN ('open','filled'))` | enum |
| `role` | `CHECK((status = 'filled') = (filled_by_id IS NOT NULL))` | filled means someone fills it |
| `application` | `UNIQUE(role_id, applicant_id)` | one application per user per role |
| `application` | `CHECK(status IN (...))` | enum |
| `role_dismissal` | `UNIQUE(user_id, role_id)` | pass is idempotent |
| `team` | `UNIQUE(project_id)` | one team per project |
| `membership` | `UNIQUE(team_id, user_id)` | no duplicate members |
| `membership` | `UNIQUE(role_id) WHERE role_id IS NOT NULL` | one person per role seat |

Rules enforced in the service layer (not expressible as simple constraints):

- Owner cannot apply to roles in their own project.
- A user with `retired_until >= today` cannot apply.
- A user can be a member of at most one team per term (checked inside the lock transaction).
- Project can only be `locked` when every role is `filled`.

## Indexes

| Table | Index | Used by |
|---|---|---|
| `project` | `(term_id, status)` | browse open projects this term |
| `project` | `(owner_id)` | my projects |
| `role` | `(project_id, status)` | lock check, project detail |
| `role` | `(status)` partial `WHERE status = 'open'` | swipe feed |
| `role_skill` | `(skill_id)` | feed ranking by skill overlap |
| `profile_skill` | `(skill_id)` | feed ranking, search |
| `application` | `(role_id, status)` | owner review queue |
| `application` | `(applicant_id, status)` | my applications, auto-withdraw |
| `role_dismissal` | `(user_id)` | exclude dismissed roles from feed |
| `membership` | `(user_id)` | "my team", WS membership check |
| `chat_message` | `(team_id, created_at DESC)` | chat history pagination |

FKs get an index by default in Django; the table above lists the composite ones we add on purpose.

## Delete behavior

- `Project` delete: only allowed in `draft`; cascades roles.
- `Role` delete: only when project is not `locked`; cascades applications and dismissals.
- `User` delete: handled by admin only; `PROTECT` on `Project.owner`, `Membership.user` and `ChatMessage.sender` so history is not silently lost.
