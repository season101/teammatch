# User flows

The three journeys every screen serves, plus one that's planned. Numbers in brackets are screen numbers from [README.md](README.md). For the API calls behind each step, see [../../architecture/flows.md](../../architecture/flows.md).

The diagrams below render on GitHub. Image versions for slides or offline reading: [sign-up](img/flow-signup.png), [apply](img/flow-apply.png), [owner](img/flow-owner.png).

## 1. Sign up to first deck

```mermaid
flowchart LR
    L["Landing [1]"] --> SU["Sign up [3]"]
    L --> SI["Sign in [2]"]
    SU -->|email| V["Verify email [4]"]
    SU -->|Google| R
    SI -->|first time with Google| R
    V -->|link opened| R["Team rules [5]"]
    V -->|link expired| V
    SU -->|wrong domain| SU
    R -->|I agree| P["Profile setup [6]"]
    P -->|name, major, 1+ skill| D["First deck with coach marks [7]"]
    D --> DK["Discover deck [8]"]
```

- A wrong domain shows its error inline on sign-up and sign-in.
- Verification links last 3 days. The expired screen offers a new link.
- Profile setup is one question per screen on phone, and one form on desktop.

## 2. Candidate: apply to a role

```mermaid
flowchart LR
    DK["Discover deck [8]"] -->|"→ / swipe right"| A["Applied (pending)"]
    DK -->|"⇧→ / long press"| N["Apply with note [10]"] --> A
    DK -->|"← / swipe left"| PS["Passed"]
    PS -->|"Z / Undo"| DK
    DK -->|"↑ / ⓘ"| RD["Role details [9]"] --> DK
    A --> MA["My applications [11]"]
    MA -->|Withdraw, confirmed| W["Withdrawn"]
    A -->|owner likes| F["Filled"]
    A -->|another candidate filled the role| PA["Passed"]
    F -->|last role filled| T["It's a Team! [19]"] --> C["Team chat [22]"]
    DK -->|deck empty| E["Out of roles → Browse [13]"]
```

- Undo only brings back a pass.
- Filled applications can't be withdrawn.
- When a team locks, its members are benched, and the deck shows the benched state until the term ends.

## 3. Owner: post a project to team chat

```mermaid
flowchart LR
    MP["My projects [15]"] -->|New project| CP["Create project + roles [16]"]
    CP -->|open, 1+ role| O["Open project"]
    O --> RQ["Review queue per role [17]"]
    RQ -->|"← Pass"| RQ
    RQ -->|"→ Like"| RF["Role filled toast [18]"]
    RF -->|roles left| RQ
    RF -->|last role| T["It's a Team! [19]"]
    RQ -->|nobody fits| DR["Delete role [20]"]
    DR -->|last open role deleted| T
    T --> C["Team chat [22]"]
    C --> TP["Team page [23]"]
```

- An owner can have one open project at a time.
- A project needs at least one role before it can open.
- When a role fills, its other pending applicants become passed.

## 4. Planned: candidate commits to one offer

Planned for F4-10 and F4-11. It replaces the "owner likes" step in flows 2 and 3 when it ships. See the [commit flow](../patterns/commit-flow.md) guide.

```mermaid
flowchart LR
    RQ["Review queue [17]"] -->|"→ Like"| OS["Offer sent [33]"]
    OS --> DK["Discover with offers [26]"]
    DK --> OL["Offers list [27]"]
    OL -->|Commit| FC["Final confirm [28]"]
    OL -->|Decline| DO["Decline offer [29]"]
    DO -->|owner likes someone else| RQ
    FC -->|owns an open project| B["Commit blocked [30]"]
    B --> OL
    FC -->|committed| AC["After committing [31]"]
    AC --> DC["Deck closed [32]"]
    AC --> CC["Candidate committed [34]"]
    CC -->|last role filled| T["It's a Team! [19]"]
    CC -->|roles left| RQ
    T --> C["Team chat [22]"]
```

- A student can hold several offers at once. Committing closes the rest.
- The role stays open until someone commits, so the first commit wins.
- A commit can't be undone.
