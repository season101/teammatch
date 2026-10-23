# TeamStrip

A row of thin segments, one per role in a project. It shows at a glance how close the team is to locking. It's the signature element of TeamMatch.

## Segments
| Segment | Look | Means |
|---|---|---|
| `filled` | Solid `apply` | Someone has this seat |
| `open` | 1px white outline at 55% | Still open |
| `current` | Solid white, gently pulsing | The role on this card |

## Where it goes
**Only on a project cover** (the coloured band at the top of a role card, project card or project header). That's why open and current are white. Covers come from the approved set in [color.md](../foundations/color.md#project-covers), which keeps white and lime readable.

## Props
| Prop | Type | Notes |
|---|---|---|
| `segments` | `("filled" \| "open" \| "current")[]` | In the project's role order |

## Layout
- Full width of the cover minus padding, 6px tall, 4px gaps, pill ends.
- The [MatchBadge](match-badge.md) sits to its right on role cards.

## Accessibility
`role="img"` with a label like "3 of 5 roles filled". Segments are decorative.

## Do and don't
- **Do** show it wherever a project appears: role cards, project cards, project headers, the teams list.
- **Don't** draw it on `surface` or `bg`, where white segments disappear.
- **Don't** use more than one `current` segment.

## Example
```tsx
<TeamStrip segments={project.roles.map((r) => r.id === role.id ? "current" : r.status === "filled" ? "filled" : "open")} />
```
