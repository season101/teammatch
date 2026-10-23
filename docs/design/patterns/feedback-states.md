# Feedback and states

How every screen handles loading, empty, error and success, and the two big moments.

## Every data screen has four states
| State | Rule |
|---|---|
| Loading | Skeletons in the shape of the content (`surface-2` blocks). After 10 seconds, add "Still loading…". No spinners on whole pages. |
| Empty | An [EmptyState](../components/empty-state.md) that says why, and what to do next |
| Error | An EmptyState with what went wrong in plain words, and Retry. Keep whatever data already loaded. |
| Success | The content |

## Application status chips
| Status | Chip | Shown as |
|---|---|---|
| `pending` | default chip | Pending |
| `liked` | matched (lime) chip | Filled |
| `passed` | default chip, muted | Passed |
| `withdrawn` | default chip, muted, struck through | Withdrawn |

## Toasts
See [toast.md](../components/toast.md). Use them for results that don't change the screen, like "Photo updated" or "Backend Developer filled".

## Role filled
For an owner's like that fills one role: a toast, "Backend Developer filled. 2 roles to go.", plus the team strip updating.

## It's a Team!
Shown when the last role fills and the project locks.
- **Who sees it:**
  - The owner sees it straight away, from the like that locked the team.
  - Each member sees it the next time they open TeamMatch, once per team. Live notifications are out of scope for now.
- **Layout:** full screen on the `spark` gradient.
  - The members' avatars slide into a row with their role names.
  - The title "It's a *Team!*" in Fraunces 44–64px.
  - One line naming the project and the term.
- **Actions:** CTA "Open team chat"; ghost "See the team".
- **Motion:** avatars 80ms apart, then the title, then confetti for 1.2 seconds. With reduced motion, everything appears in place.

## Benched
After a team locks, its members are benched until the term ends:
- They drop out of other decks and review queues.
- Their other pending applications are withdrawn.
- The deck shows "You're on **CampusEats**. You're on a team until Dec 12. Your other applications were withdrawn." with Open team chat.
