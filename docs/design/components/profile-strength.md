# ProfileStrength

A labelled meter showing how complete a profile is. Stronger profiles rank higher in owners' review queues, so the meter has a real reason to exist.

## Weights
| Section | Adds |
|---|---|
| Major | 20% |
| Skills (at least one) | 40% |
| Bio | 20% |
| Avatar | 20% |

## Look
- A label on the left and a Geist Mono percentage on the right.
- Under them, a 6px track in `surface-2`, filled with `apply-text`: lime in dark, deep green in light, so the bar is visible on white.

## Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `value` | `number` | required | 0–100, clamped and rounded |
| `label` | `string` | `"Profile strength"` | |

## Where it goes
- On the profile page, above the sections.
- Inside the Edit button's text ("Edit profile · 60%").
- Each missing section in the editor shows what it adds ("Bio +20%").

Under 60%, add a hint below: "Strong profiles show up higher in owners' review queues."

## Accessibility
`role="meter"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` and the label as its name.

## Example
```tsx
<ProfileStrength value={profile.strength} />
```
