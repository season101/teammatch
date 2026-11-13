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
| `liked` | selected (violet) chip | Offer |
| `committed` | matched (lime) chip | Committed |
| `declined`, `passed`, `withdrawn` | default chip, muted | Closed |

The line under a closed application says why: the owner picked someone else, you declined, you withdrew, or it closed when you committed.

## Team chat
- **Sending:** a message shows in the log on the same frame it's sent, a little faded, and turns solid when the server echoes it.
- **Not sent:** if the server refuses it or the connection drops first, it stays in the log with "Not sent. Retry", so the text is never lost.
- **Reading older messages:** a new message only scrolls the log when you're already at the bottom. Otherwise a "New messages" button appears and takes you there. Your own message always scrolls into view.

## A refused sign-in
A wrong email or password marks the password field, moves focus into it and shakes it once (360ms). The message sits under it. Nothing shakes on blur or while typing, and typing clears the mark.

## Toasts
See [toast.md](../components/toast.md). Use them for results that don't change the screen, like "Photo updated".

## Splash
The landing page (`/`) opens with the TeamMatch logo, large, on the dark stage. It's a brand moment that lasts about 1.7 seconds and never holds content back.
- **When:** the first time `/` is the page that loads in a browser tab. A reload, a later visit in the same tab or a client-side navigation back to `/` skips it. A new tab plays it again (it's tracked in `sessionStorage`).
- **Never gates content:** the page is already painted underneath. The splash covers it, then lifts away. Nothing waits for data.
- **Look:** always dark, whatever the theme. The three logo seats in `spark` and the wordmark in Fraunces `text-hero` with the `spark` gradient.
- **Motion:** the seats fill one by one, `stagger` apart, from `fast` on. At `splash-hold` (1100ms) the stage rolls up over `splash-lift` (600ms) with the `splash` ease-in-out curve. Only transform and visibility animate, so nothing shifts.
- **Skipped entirely** with reduced motion, without JavaScript, or when storage is blocked. Content shows straight away.
- **Accessibility:** the splash is `aria-hidden` and doesn't take clicks, so screen readers and keyboard focus start on the page.
- **Code:** `frontend/src/features/landing/splash.tsx`. An inline script in the root layout decides before the first paint, so a return visit never flashes it.

## Offer sent and role filled
A like sends an offer and fills nothing. The queue shows a status line, "Offer sent to Riley Chen. The role stays open until someone commits.", and Riley is listed under Offers out. When someone commits, the role tab gets a tick and the role shows "Riley Chen committed". See the [commit flow](commit-flow.md).

## It's a Team!
Shown when the last role fills and the project locks.
- **Who sees it:**
  - The candidate whose commit fills the last role sees it straight away.
  - The owner and each other member see it the next time they open TeamMatch, once per team. `Membership.seen_at` tracks this on the server, so it shows once across devices. Live notifications are out of scope for now.
- **Layout:** full screen on the `spark` gradient.
  - The members' avatars slide into a row with their role names.
  - The title "It's a *Team!*" in Fraunces 44–64px.
  - One line naming the project and the term.
- **Actions:** CTA "Open team chat"; ghost "See the team".
- **Motion:** avatars 80ms apart, each settling on a soft spring, then the title, then confetti for 1.2 seconds. The confetti is thrown up from behind the title and falls in arcs. With reduced motion, everything appears in place.

## Deck closed
After a commit, until the team locks: the deck shows "You're committed to **CampusEats**. Your deck stays closed while you hold this seat. Team chat opens when the last role fills." with See your commitment. The other offers and pending applications are closed.

## Benched
After a team locks, its members are benched until the term ends:
- They drop out of other decks and review queues.
- Their other pending applications are withdrawn.
- The deck shows "You're on **CampusEats**. You're on a team until Dec 12. Your other applications were withdrawn." with Open team chat.
