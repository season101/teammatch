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

## Desktop: nav column and list column
Two columns sit left of the stage (DD-46).

**Nav column (208px).** The logo, then one labelled row per place:

| Row | Opens | Badge |
|---|---|---|
| Discover | The deck | Offers waiting for you |
| Projects | Browse \| Mine | |
| Review | Review queues for your project's roles. Only shown if you own a project. | Applicants waiting |
| Teams | Your team and its chat | |
| Profile | Your profile | |
| Settings | Theme, keyboard shortcuts, account, log out | |

- A hairline separates the four places from Profile and Settings.
- **The current row:** `surface-2` fill, `text`, and a `primary` icon. The others are `text-muted`.
- **Badges** are `cta` pills. They show a count only when it's above zero. The same badges sit on the phone and tablet tabs.
- Up and Down move focus along the rows, as Left and Right do along the tabs.

**List column (320px).** What it lists follows the place:

| Place | List column | Stage |
|---|---|---|
| **Discover**, **Teams** | Tabs **Applications \| Teams**. Application rows show a status chip. Team rows show the latest message. | The deck, or the team's chat. |
| **Projects**, **Review** | Tabs **Browse \| Mine**. Mine lists your project with each role and how many are waiting. | Browse: the selected project's details. Review: the selected role's queue ([review-queue.md](review-queue.md)). |
| **Profile**, **Settings** | The settings list: Appearance, Keyboard shortcuts, Log out | The profile form, or the selected setting |

- At 1440px and up, details open in a 400px right panel instead of over the stage.

## Tablet
A top bar with the logo and the same five tabs as phone, as text. Content is one column, and the card is at most 420px wide.

## Rules
- **Back on phone** is a chevron at top left. On desktop, switching places never loses what you were doing on the stage.
- **One owner project:** an owner can have one open project at a time (BR-14). While it's open, "New project" in Projects → Mine stays enabled, with a note under it that a new project stays a draft until the open one is closed or locks. The server blocks the second publish, not the draft.
- **Benched users** still see every tab. The deck shows the benched state instead of cards ([feedback-states.md](feedback-states.md)).
