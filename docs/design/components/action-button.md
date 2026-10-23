# ActionButton

The round buttons under a role card or applicant card: the button version of a swipe. Four kinds, always shown in this order.

## Anatomy and kinds
| Kind | Size | Look | Key | Meaning |
|---|---|---|---|---|
| `undo` ↺ | 48px | `surface` circle, 1px `border`, `undo` icon | Z | Bring back the last passed card |
| `pass` ✕ | 64px | Transparent, 2px `pass` ring, `pass` icon | ← | Pass on this role or applicant |
| `details` ⓘ | 48px | `surface` circle, 1px `border`, `info` icon | ↑ | Open full details |
| `apply` ✓ | 64px | Solid `apply` fill, `on-apply` icon, `shadow-card`, 1px `apply-text` border | → | Apply (candidate) or Like (owner) |

The solid Apply and the ringed Pass carry the hierarchy. Size alone (48 vs 64) isn't enough. In light theme the 1px `apply-text` border shows as a green ring, so the lime button has a visible edge on white. In dark theme it blends into the lime.

## Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `kind` | `"undo" \| "pass" \| "details" \| "apply"` | required | |
| `label` | `string` | the kind's name | Accessible name. Always pass one that names the target. |
| …rest | native `<button>` props | | `onClick`, `disabled` |

## States
- **Hover and focus:** scale to 1.06 (motion-safe).
- **Pressed:** 0.95.
- **Disabled:** 40% opacity. Undo is disabled unless the last swipe was a pass.

## Behaviour
- **Placement:** on desktop the bar sits inside the bottom edge of the card. On phone it sits below the card, centred, 12px gaps.
- **Owner review** uses `pass`, `details` and `apply` (labelled "Like"). There's no undo for owners.
- **Pressing a button** triggers the same fly-off animation and announcement as the matching swipe.

## Accessibility
- Pass `label` with the role and project: `label="Apply to Backend Developer on CampusEats"`.
- The keys are handled by the deck, not the button. The button only needs `onClick`.

## Do and don't
- **Do** keep the order undo, pass, details, apply.
- **Don't** add a fifth button.
- **Don't** recolour a kind.
- **Don't** use ActionButton outside a card's action bar.

## Example
```tsx
<div className="flex items-center justify-center gap-3">
  <ActionButton kind="undo" label="Undo your last pass" disabled={!canUndo} onClick={undo} />
  <ActionButton kind="pass" label={`Pass on ${role.title}`} onClick={pass} />
  <ActionButton kind="details" label={`Details for ${role.title}`} onClick={openDetails} />
  <ActionButton kind="apply" label={`Apply to ${role.title} on ${project.title}`} onClick={apply} />
</div>
```
