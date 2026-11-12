# User flows

The four journeys every screen serves, plus five that are planned. Numbers in brackets are screen numbers from [README.md](README.md). For the API calls behind each step, see [../../architecture/flows.md](../../architecture/flows.md).

The diagrams below render on GitHub. Image versions for slides or offline reading: [sign-up](img/flow-signup.png), [apply](img/flow-apply.png), [owner](img/flow-owner.png). The planned deck details flows, as drawn in the proposal: [deck to details](img/flow-deck-details.png), [repository](img/flow-repo-link.png), [links and resume](img/flow-profile-links.png), [reading a resume](img/flow-resume-viewer.png).

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

- A swipe right applies with no note. The note goes on the role details page with F3-13 (DD-40).
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

## 4. Candidate commits to one offer

Built in F4-10 and F4-11. It replaces the "owner likes" step in flows 2 and 3. See the [commit flow](../patterns/commit-flow.md) guide.

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

## 5. Planned: adding a way to sign in

Planned for F1-10, F1-12 and F1-13. See the [account paths](../patterns/account-paths.md) guide.

```mermaid
flowchart LR
    SI["Sign in [35]"] -->|Forgot password?| FP["Forgot password [36]"]
    SI -->|Google-only email| GP["Google-only prompt [41]"]
    FP -->|Send link| CI["Check your inbox [37]"]
    GP -->|Set a password| CI
    CI -->|opens the emailed link| SP["Set a password [38]"]
    SP -->|link used or expired| LE["Link expired [40]"]
    LE --> FP
    SP -->|saved| PS["Password saved [39]"]
    PS --> SI
    WA["Ways to sign in [42, 43]"] -->|Set a password| SS["Set a password [44]"]
    SS --> BW["Both ways on [45]"]
    WA -->|Connect, same email| BW
    WA -->|Connect, different email| CC["Can't connect [46]"]
    CC --> WA
```

- Signed out, a password is always set through an emailed link, which proves the person owns the inbox.
- Signed in, Settings saves it directly.
- Connect only links a Google account with the same email as the account.

## 6. Planned: deck to details and back

Planned for UI-06 and F3-13. See the [deck details](../patterns/deck-details.md) guide. The deck keeps its place, so going back feels like you never left.

```mermaid
flowchart LR
    D["Discover deck [47]"] -->|"tap, ↑ or Enter"| RD["Role details [48]"]
    RD -->|Back| D
    RD -->|Apply or Pass| N["Next card [47]"]
    RD -->|View the code| GH["GitHub, in a new tab"]
```

- Apply or Pass on the details page saves the decision, with the note if there is one.
- Opened from a link, Back goes to Discover.

## 7. Planned: owner adds a repository

Planned for F2-12. Optional, on create or edit.

```mermaid
flowchart LR
    F["New or edit project [49]"] -->|Save| C{"A github.com link?"}
    C -->|"yes, or left empty"| S["Saved"]
    S --> P["Project page [50] and role details [48]"]
    C -->|no| E["Error on the field [49]"]
    E --> F
```

- The server does the check. Nothing else on the form is lost.

## 8. Planned: candidate adds links and a resume

Planned for F1-15 and F1-16. Owners see them after the person applies.

```mermaid
flowchart LR
    PE["Profile editor [51]"] -->|links| L{"github.com or linkedin.com?"}
    PE -->|resume| R{"A PDF, 5 MB or less?"}
    L -->|yes| SV["Saved"]
    R -->|yes| ST["Stored privately"]
    L -->|no| PE
    R -->|no| PE
    SV --> PS["Profile strength goes up"]
    ST --> PS
    PS -->|applies to a role| RV["Review queue [52]"]
```

- GitHub adds 5%, LinkedIn 5% and a resume 10% (DD-43, not agreed yet).
- The resume check reads the file itself, not just its name.

## 9. Planned: reading a resume

Planned for F1-17. It stays inside the app from start to finish.

```mermaid
flowchart LR
    RC["Resume card [51, 52]"] -->|tap| A{"Allowed to read it?"}
    A -->|yes| V["Resume viewer [53]"]
    V -->|Back| B["Same applicant or profile"]
    A -->|no| N["Can't open this resume [53]"]
    V -->|"won't display"| DL["Download instead [53]"]
```

- Only the person and owners of projects they applied to can read it (DD-42, not agreed yet).
- The file comes through our server after a permission check, so there's never a public link.
