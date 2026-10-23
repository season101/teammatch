# Navigation

How people move around TeamMatch at each screen size. Shells and sizes are in [foundations/layout.md](../foundations/layout.md).

## Phone: bottom tab bar
| Tab | Opens | Notes |
|---|---|---|
| Discover | The role deck | An inbox button in its top bar opens My applications |
| Projects | Browse \| Mine | Browse: search and the project list. Mine: your project and its roles. |
| Review | Review queues for your project's roles | Only shown if you own a project. Badge = applicants waiting. |
| Teams | Your team and its chat | Empty until your team locks |
| Me | Profile, profile strength, Settings | |

- **The active tab:** `text`, with a `primary` icon fill. Inactive tabs are `text-muted`.
- **Labels:** always visible under the icons.
- **Size and safe area:** the bar is 56px plus the safe area, on `surface` with a top hairline.

## Desktop: sidebar modes
The 320px sidebar has a `primary-strong` header strip holding:
- **Avatar and "You":** opens your profile on the stage.
- **Three icon buttons:** Discover, Projects and Settings.

Each icon switches what the sidebar lists. The stage follows.

| Mode | Sidebar | Stage |
|---|---|---|
| **Discover** (default) | Tabs **Applications \| Teams**. Application rows show a status chip (Pending, Filled, Passed, Withdrawn). Team rows show the latest message. | The deck. A team row opens that team's chat on the stage. |
| **Projects** | Tabs **Browse \| Mine**. Browse has a search field and the project list. Mine lists your project with each role and how many are waiting. | Browse: the selected project's details. Mine: the selected role's review queue ([review-queue.md](review-queue.md)). |
| **Settings** | The settings list: Theme, Keyboard shortcuts, Account, Log out | The selected setting |

- The icon for the current mode has a `surface` circle behind it. The others are transparent.
- At 1440px and up, details open in a 400px right panel instead of over the stage.

## Tablet
A top bar with the logo and the same five tabs as phone, as text. Content is one column, and the card is at most 420px wide.

## Rules
- **Back on phone** is a chevron at top left. On desktop, switching modes never loses what you were doing on the stage.
- **One owner project:** an owner can have one open project at a time (BR-14). While it's open, "New project" in Projects → Mine is disabled with the reason under it.
- **Benched users** still see every tab. The deck shows the benched state instead of cards ([feedback-states.md](feedback-states.md)).
