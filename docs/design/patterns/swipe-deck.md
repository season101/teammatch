# Swipe deck

The candidate's main screen: a stack of [RoleCards](../components/role-card.md), ranked by match %, best first. One decision at a time: apply or pass.

## What's in the deck
Open roles on open projects that the candidate hasn't applied to or passed, that aren't on their own project, ranked by match % (then newest). Benched candidates see the benched state instead.

## Ways to decide
| Action | Touch | Mouse | Keyboard | Button |
|---|---|---|---|---|
| Apply | Swipe right | Drag right | → | ✓ Apply |
| Apply with a note | Long-press ✓ | Shift-click ✓ | ⇧ → | |
| Pass | Swipe left | Drag left | ← | ✕ Pass |
| Undo the last pass | | | Z | ↺ Undo |
| Open details | Tap ⓘ | Click ⓘ | ↑ | ⓘ Details |
| Close details | Swipe down / tap ✕ | Click ✕ | ↓ or Esc | |
| Next or previous card page | Tap right or left half | Click right or left half | Space | |

## Gesture
- **While dragging,** the card follows the pointer 1:1 and tilts `distance / 20` degrees, up to 15°. Vertical movement is damped to a quarter.
- **A swipe commits** when the card has moved 30% of its width, or on a fling faster than 0.6 px/ms with at least 40px of movement.
- **On release short of that,** the card springs back over 320ms.
- **On commit,** the card flies off in that direction over 200ms, and the next card scales from 0.96 to 1.
- **A tap** (under 4px of movement) changes the card page instead of swiping.

### Stamps
While dragging, an outlined word appears at the top corner on the side the card is heading to:
- **APPLY** in `apply-text`, rotated -12°.
- **PASS** in `pass`, rotated 12°.

The opacity is the drag distance ÷ the commit distance. Stamps are decorative (`aria-hidden`).

## Undo
**Undo only brings back the last pass.** You can't re-apply to a role you've applied to, so an apply can't be undone from the deck. The candidate withdraws from My applications instead. The Undo button is disabled unless the last decision was a pass. The pass toast also offers Undo for 4 seconds.

## Apply with a note
- Opens a bottom sheet on phone, a modal on desktop, or the right panel at 1440px and up.
- One textarea: "Add a note for the owner", 300 characters max, with a counter.
- CTA "Send application"; ghost "Apply without a note".

## Keyboard legend
On desktop, a row pinned to the bottom of the stage:

`Hide` · ← Pass · → Apply · ↑ Details · ↓ Close · Z Undo pass · Space Next page · ⇧→ Apply with note

- Key caps are 24px `surface-2` boxes, Geist 12px semibold.
- `Hide` collapses the row until the next visit.
- Settings → Keyboard shortcuts turns the keys and the legend off.
- The keys never fire while focus is in a text field, or while a modal is open.

## First visit
Three coach marks over the live deck. Each has Skip, and they're shown once:
1. "Swipe right to apply."
2. "Swipe left to pass. Your skills decide what you see first."
3. "There's more": Undo a pass, Details, Apply with a note.

## Announcements
Results are announced in the page's live region, as listed in [accessibility.md](../foundations/accessibility.md#announcements).

## States
| State | What shows |
|---|---|
| Loading | One skeleton card |
| Default | The top card, with the next one peeking under it |
| Dragging | Tilt and stamp |
| Out of roles | [EmptyState](../components/empty-state.md): "You've seen every role. *For now.*" |
| Benched | EmptyState: "You're on **CampusEats**", with Open team chat |
| Error | EmptyState: "Couldn't load your deck", with Retry |
