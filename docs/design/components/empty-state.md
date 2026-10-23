# EmptyState

What a screen shows when there's nothing to show, or when the user can't act right now. **Status: specced, not built.**

## Anatomy
Centred in the space the content would take:
1. An icon tile: 64px, dashed `border`, `rounded-card`, a muted line icon.
2. A title in Fraunces 28px. It can italicise one word.
3. One line of explanation in `text-muted`.
4. One CTA. An optional ghost link under it.

## The ones we have
| Where | Title | Line | CTA |
|---|---|---|---|
| Deck, out of roles | You've seen every role. *For now.* | New projects show up as owners post them. | Browse projects |
| Deck, benched | You're on **CampusEats** | You're on a team until Dec 12. Your other applications were withdrawn. | Open team chat |
| Applications, none | No applications yet | Swipe right on a role to apply. | Go to Discover |
| Teams, none | No team yet | Your team shows up here once every role is filled. | Go to Discover |
| Review, nobody waiting | No one's waiting for UI Designer | New applicants show up here. If no one fits, you can delete the role. | Edit role (ghost: Delete role) |
| Search, no results | Nothing matches "rust" | Try a skill or a project name. | Clear search |
| Error, couldn't load | Couldn't load your deck | Check your connection and try again. | Retry |

## Props (planned)
| Prop | Type |
|---|---|
| `icon` | `ReactNode` |
| `title` | `ReactNode` |
| `children` | `ReactNode` (the line) |
| `action` | `ReactNode` (a Button) |
| `secondaryAction` | `ReactNode` |

## Rules
- Every empty state says why it's empty and what to do next.
- Never blame the user. Never just say "No data".
- Error states use the same layout, with Retry as the CTA.
