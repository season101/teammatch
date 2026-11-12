# Swipe deck

The candidate's main screen: a stack of [RoleCards](../components/role-card.md), ranked by match %, best first. One decision at a time: apply or pass.

## What's in the deck
Open roles on open projects that the candidate hasn't applied to or passed, that aren't on their own project, ranked by match % (then newest). Benched candidates see the benched state instead, and someone who committed to an offer sees the closed deck. With offers waiting, a banner above the deck links to My applications ([commit flow](commit-flow.md)).

## Ways to decide
| Action | Touch | Mouse | Keyboard | Button |
|---|---|---|---|---|
| Apply | Swipe right | Drag right | → | ✓ Apply |
| Pass | Swipe left | Drag left | ← | ✕ Pass |
| Undo the last pass | | | Z | ↺ Undo |
| Open details | Tap the card | Click the card | ↑, or Enter on the deck | View details |
| Close details | Swipe down / tap ✕ | Click ✕ | ↓ or Esc | |
| Next or previous card page | Tap right or left half | Click right or left half | Space | |

## Gesture
- **While dragging,** the card follows the pointer 1:1 and tilts `distance / 20` degrees, up to 15°. Vertical movement is damped to a quarter.
- **A swipe commits** when the card has moved 30% of its width, or on a fling faster than 0.6 px/ms with at least 40px of movement.
- **On release short of that,** the card springs back over 320ms.
- **On commit,** the card flies off in that direction over 200ms, and the next card scales from 0.96 to 1.
- **A tap** that doesn't turn into a drag opens the role on its project page (`/projects/<id>?role=<role id>`).

### Stamps
While dragging, an outlined word appears at the top corner on the side the card is heading to:
- **APPLY** in `apply-text`, rotated -12°.
- **PASS** in `pass`, rotated 12°.

The opacity is the drag distance ÷ the commit distance. Stamps are decorative (`aria-hidden`).

## Undo
**Undo only brings back the last pass.** You can't re-apply to a role you've applied to, so an apply can't be undone from the deck. The candidate withdraws from My applications instead. The Undo button is disabled unless the last decision was a pass. The pass toast also offers Undo for 4 seconds.

## Card size
Every card is the same height, so ✕ and ✓ stay in one place, just above the phone tab bar. The height is the viewport minus the page header, padding, buttons and tab bar, kept between 22rem and 38rem. The title and project take one line each, skills one row with "+N more", and the pitch five lines. Longer text ends in an ellipsis, and nothing scrolls inside the card.

## The note
There's no note on the deck: a swipe right applies without one ([DD-40](../decisions.md), agreed Nov 11, 2026). The note moves to the role details page with F3-13. See [deck details](deck-details.md).

## Keyboard legend
On desktop, a row pinned to the bottom of the stage:

`Hide` · ← Pass · → Apply · ↑ Details · ↓ Close · Z Undo pass · Space Next page

- Key caps are 24px `surface-2` boxes, Geist 12px semibold.
- `Hide` collapses the row until the next visit.
- Settings → Keyboard shortcuts turns the keys and the legend off.
- The keys never fire while focus is in a text field, or while a modal is open.

## First visit
Three coach marks over the live deck. Each has Skip, and they're shown once:
1. "Swipe right to apply."
2. "Swipe left to pass. Your skills decide what you see first."
3. "There's more": Undo a pass and Details.

## Announcements
Results are announced in the page's live region, as listed in [accessibility.md](../foundations/accessibility.md#announcements).

## States
| State | What shows |
|---|---|
| Loading | One skeleton card |
| Default | The top card, with the next one peeking under it |
| Dragging | Tilt and stamp |
| Out of roles | [EmptyState](../components/empty-state.md): "You've seen every role. *For now.*" |
| Deck closed | After a commit: "You're committed to **CampusEats**", with See your commitment |
| Benched | EmptyState: "You're on **CampusEats**", with Open team chat |
| Error | EmptyState: "Couldn't load your deck", with Retry |
