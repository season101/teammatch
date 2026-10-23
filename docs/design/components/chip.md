# Chip

A small tag for a skill or interest. It shows on cards, in profiles and in skill pickers.

## Variants
| Variant | Look | Means |
|---|---|---|
| `default` | `surface-2` fill, 1px `border`, `text-muted` | A skill the role wants that you don't list, or any neutral tag |
| `matched` | Solid `apply` fill, `on-apply` text, leading ✓ | You have this skill and the role wants it |
| `selected` | `primary` at 16% fill, 1px `primary` border, `text` | Picked in a skill picker |

Any variant can be **removable**: it gets a × button.

## Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `children` | `ReactNode` | required | The skill name |
| `variant` | `"default" \| "matched" \| "selected"` | `"default"` | |
| `pill` | `boolean` | `false` | Pill shape for pickers. Inside cards, chips use the 6px `chip` radius. |
| `onRemove` | `() => void` | | Shows the × button |
| `removeLabel` | `string` | the text of `children` | Used in the × button's name: "Remove Django" |

## Layout
- 28px tall, 14px medium text, 10px side padding.
- Chips wrap in a `flex flex-wrap gap-2` row.
- Matched chips come first, then the rest, each group in the role's order.

## Accessibility
- Matched chips add hidden text "(matched)", so the ✓ isn't the only signal.
- The × button is a real `<button>` with "Remove <skill>" as its name.
- In a picker, each chip is a toggle button with `aria-pressed`, wrapping the Chip.

## Do and don't
- **Do** show matched skills on every role card.
- **Don't** use lime chips for anything except matched skills.
- **Don't** put more than about 8 chips on a card; show "+3 more" instead.

## Example
```tsx
<div className="flex flex-wrap gap-2">
  {role.skills.map((s) => (
    <Chip key={s.id} variant={mySkills.has(s.id) ? "matched" : "default"}>{s.name}</Chip>
  ))}
</div>
```
