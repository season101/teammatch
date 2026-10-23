# MatchBadge

Shows how well a candidate fits a role, as a percentage.

## What the number means
**Match % = the share of the role's required skills the candidate has, rounded to a whole number.**

For example, 3 of 4 skills is 75%. The deck is ranked by it, and the owner's review queue is sorted by it. Wherever there's room, show the basis too: "75% match · 3 of 4 skills".

## Look
A lime pill (`bg-apply`, `text-on-apply`) with Geist Mono semibold 12px: "86% match".

## Props
| Prop | Type | Notes |
|---|---|---|
| `percent` | `number` | Rounded and shown as "N% match" |

## Where it goes
- Top right of the role card cover, next to the team strip.
- Next to the applicant's name on the applicant card.
- In role details, with its basis.

## Do and don't
- **Do** show the basis ("3 of 4 skills") in details views.
- **Don't** colour the badge by score. It's always lime, because the ranking already says which roles fit best.
- **Don't** show decimals.

## Example
```tsx
<MatchBadge percent={(matched / required) * 100} />
```
