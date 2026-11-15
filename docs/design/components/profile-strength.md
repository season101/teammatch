# ProfileStrength

A labelled meter showing how complete a profile is. Stronger profiles rank higher in owners' review queues, so the meter has a real reason to exist.

## Weights
| Section | Adds |
|---|---|
| Major | 20% |
| Skills (at least one) | 40% |
| Bio | 20% |
| Photo | 10% |
| GitHub | 5% |
| LinkedIn | 5% |

[DD-43](../decisions.md) has GitHub +5%, LinkedIn +5% and a resume +10% take the photo's 20% from DD-10. Photo upload (F1-07) shipped too, so until the resume (F1-16) ships the photo keeps 10% and the total stays 100%. With the resume, the photo stops counting, as DD-43 says. The team hasn't agreed to DD-43 yet. See [deck details](../patterns/deck-details.md#profile-strength).

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
