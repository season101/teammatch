# Commit flow

**The API is built (F4-10); the screens are planned (F4-11).** This is the guide for [F4-10](../../product/backlog.md#f4-10-commit-to-one-offer-api) and [F4-11](../../product/backlog.md#f4-11-commit-to-one-offer-screens). Until the screens ship, a Like sends an offer that candidates can only commit to through the API.

A like becomes an offer. A student can hold offers from several projects, then commits to the one they want. The seat fills on the commit, not on the like.

Screens are numbered 26 to 34 in [screens/README.md](../screens/README.md#commit-flow-planned), and the full journey is [flow 4](../screens/flows.md#4-planned-candidate-commits-to-one-offer).

## The rules

| Rule | What it means |
|---|---|
| A like is an offer | The application becomes `liked`. The role stays `open` and no seat fills. |
| First commit wins | An owner can like several people for one role. The first to commit gets it, and the others' offers close. An owner who wants one person likes only that person. |
| No expiry | If nobody commits, the owner likes someone else. There's no timer. |
| A commit is final | It can't be undone, so it always goes through the final confirm. |
| One seat per person | Committing closes the student's other offers and pending applications that term. |
| Owners close first | Someone who owns an open project can be liked, but has to close that project before committing. |
| Deck closes | After a commit you can't apply anywhere else. The deck shows screen 32. |

## Statuses

| `status` | Meaning | Candidate sees | Owner sees |
|---|---|---|---|
| `pending` | Waiting on the owner | Pending | In the queue |
| `liked` | An offer | Offer | Waiting, under Offers out |
| `committed` | Seat taken (new) | Committed | Committed |
| `declined` | Candidate said no (new) | Closed | Declined |
| `passed` | Owner passed, or another person took the role | Closed | Offer closed, if it had been an offer |
| `withdrawn` | Candidate withdrew, or committed elsewhere | Closed | Leaves the queue |

## What to build, screen by screen

| # | Screen | Where | What changes | Code |
|---|---|---|---|---|
| 26 | Discover with offers | `/feed` | Banner above the deck when there's at least one offer, linking to `/applications`. Offer count on the Discover tab. | `frontend/src/app/(app)/feed/page.tsx`, `frontend/src/features/shell/app-shell.tsx` |
| 27 | Offers list | `/applications` | Tabs become Offers, Pending, Committed, Closed. Offers comes first and opens by default when there are offers. One card per offer with Decline and Commit. Three columns on desktop so offers can be compared. The sidebar shows an Offer chip. | `frontend/src/features/applications/my-applications.tsx` |
| 28 | Final confirm | Dialog | Opens from Commit. Says which seat you take and what closes. | `my-applications.tsx`, `frontend/src/components/ui/modal.tsx` |
| 29 | Decline offer | Dialog | Standard confirmation: the safe choice is the primary button. | `my-applications.tsx` |
| 30 | Commit blocked | Dialog | Shown on a 409 `owns_open_project`, with a link to that project. | `my-applications.tsx` |
| 31 | After committing | `/applications` | Committed tab with the seat and team progress, then what closed. | `my-applications.tsx` |
| 32 | Deck closed | `/feed` | Replaces the deck after a commit, next to the existing benched state. | `frontend/src/features/feed/feed.tsx` |
| 33 | Offer sent | `/applicants` | Status line after a Like, plus an Offers out list. The queue moves to the next applicant. | `frontend/src/features/review/role-queue.tsx` |
| 34 | Candidate committed | `/applicants` | The role tab gets a tick. Shows who took the seat and what happened to the others. | `role-queue.tsx` |

## Components

Reuse what's in `frontend/src/components/ui/`. Nothing new is needed.

| Component | How it's used |
|---|---|
| `Modal` | Screen 28: `ctaLabel` is "Commit to {project}", `escapeLabel` is "Keep my options", `escapeVariant="ghost"`. Add a prop so first focus can start on the escape button. |
| `Button` | Commit on the offer cards is `secondary`, so the dialog holds the view's one CTA. Decline is `danger`. |
| `Chip` | Offer uses `selected`, Committed uses `matched`, the rest use the default. Update the "Pickers only" comment on `selected`. |
| `Tabs`, `TeamStrip`, `MatchBadge` | As they are. |

## Copy

| Where | Text |
|---|---|
| Banner (26) | **{n} projects want you.** Pick the one you want before it fills. |
| Offers intro (27) | Commit to one. Your other offers close when you do. |
| Offer card (27) | {owner} liked you · {filled} of {total} roles filled |
| Final confirm (28) | **Commit to {project}?** You take the {role} seat. Your {n} other offers and {m} pending applications close, and you can't undo this. |
| Decline (29) | **Decline this offer?** {owner} can offer {role} to someone else. You can't get this offer back. |
| Blocked (30) | **Close your project first?** You own {project}, which is still open. You can only hold one spot this term, so close it before you commit to {other project}. |
| After committing (31) | You're in. Team chat opens when the last role fills. |
| Deck closed (32) | **You're committed to {project}.** Your deck stays closed while you hold this seat. Team chat opens when the last role fills. |
| Offer sent (33) | Offer sent to {name}. The role stays open until someone commits. |
| Offers out (33) | If {name} takes another offer or declines, you can like someone else. The first person to commit gets the seat. |
| Candidate committed (34) | **{name} committed.** {role} is filled. Your team locks when the other {n} roles fill. |

## Edge cases

| Case | What happens |
|---|---|
| The role fills while you decide | Commit returns 409 `role_not_open`. Show the message, refetch, and the offer moves to Closed. |
| Two people commit at once | The role row lock lets one through. The other gets `role_not_open`. |
| You committed elsewhere in another tab | Commit returns 409 `applicant_committed`. |
| The project closes while an offer is out | The offer closes too. `close_project` has to withdraw `liked` rows as well as `pending` ones. |
| An owner likes someone who already committed | 409 `applicant_committed`, as today. |
| The last open role fills on a commit | The team locks in the same transaction and "It's a Team!" shows as usual. |

There are no live notifications, so offers are found through the banner and the tab count, which refetch when the app regains focus.

## Keyboard and accessibility

- Screen 28 must open with focus on **Keep my options**. Commit is the primary button here ([DD-34](../decisions.md)), so Enter must not be able to commit straight away.
- Commit and Decline are named per offer, for example "Commit to Frontend developer on Campus Eats".
- The Review keys stay ← Pass and → Like. → now sends an offer.
- Screens are drawn in dark and light at phone and desktop width. The usual [UI review checklist](../process.md#ui-review-checklist) applies.

## Build order

1. F4-10: the API, migration and tests, then regenerate `backend/schema.yml` and the client.
2. F4-11: statuses and queries, then Offers and the dialogs (27 to 31).
3. Discover: the banner, tab count and closed deck (26, 32).
4. Review: Offers out and the filled state (33, 34).
5. Add the commit step to the golden-path test (PL-08).

## Docs to update with the code

Change these in the pull request that ships the behaviour, and remove "Planned" from this page:

- `docs/product/prd.md`: BR-03, BR-05, BR-11
- `docs/product/use-cases.md`, `docs/architecture/api.md`, `docs/architecture/data-model.md`, `docs/architecture/flows.md`
- `docs/design/components/modal.md`, `docs/design/patterns/confirmations.md`, `docs/design/patterns/feedback-states.md`, `docs/design/patterns/review-queue.md`, `docs/design/patterns/swipe-deck.md`
- `README.md` and `CLAUDE.md`, which describe a team locking on mutual likes
