# Feedback and states

How every screen handles loading, empty, error and success, plus the landing splash and the two big moments.

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

## Splash
The landing page (`/`) opens with the TeamMatch logo, large, on the dark stage. It's a brand moment that lasts about 1.7 seconds and never holds content back.
- **When:** the first time `/` is the page that loads in a browser tab. A reload, a later visit in the same tab or a client-side navigation back to `/` skips it. A new tab plays it again (it's tracked in `sessionStorage`).
- **Never gates content:** the page is already painted underneath. The splash covers it, then lifts away. Nothing waits for data.
- **Look:** always dark, whatever the theme. The three logo seats in `spark` and the wordmark in Fraunces `text-hero` with the `spark` gradient.
- **Motion:** the seats fill one by one, `stagger` apart, from `fast` on. At `splash-hold` (1100ms) the stage rolls up over `splash-lift` (600ms) with the `splash` ease-in-out curve. Only transform and visibility animate, so nothing shifts.
- **Skipped entirely** with reduced motion, without JavaScript, or when storage is blocked. Content shows straight away.
- **Accessibility:** the splash is `aria-hidden` and doesn't take clicks, so screen readers and keyboard focus start on the page.
- **Code:** `frontend/src/features/landing/splash.tsx`. An inline script in the root layout decides before the first paint, so a return visit never flashes it.

## Role filled
For an owner's like that fills one role: a toast, "Backend Developer filled. 2 roles to go.", plus the team strip updating.

## It's a Team!
Shown when the last role fills and the project locks.
- **Who sees it:**
  - The owner sees it straight away, from the like that locked the team.
  - Each member sees it the next time they open TeamMatch, once per team. `Membership.seen_at` tracks this on the server, so it shows once across devices. Live notifications are out of scope for now.
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
