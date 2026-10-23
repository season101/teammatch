# Shape, depth and motion

## Radius

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `chip` | 6px | `rounded-chip` | Chips inside cards |
| `input` | 10px | `rounded-input` | Text fields, selects |
| `row` | 14px | `rounded-row` | List rows, toasts, square buttons |
| `card` | 20px | `rounded-card` | Role card, applicant card, panels |
| `sheet` | 28px | `rounded-sheet` | Modals, bottom sheets |
| `pill` | 999px | `rounded-pill` | Buttons, picker chips, badges, tabs |

Buttons are always pills. Action buttons are circles (`rounded-full`).

## Depth
Depth comes from surface colour first (`bg` → `surface` → `surface-2`) and shadow second. Shadows go only on things that float:

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `card` | dark `0 18px 40px -12px rgb(0 0 0 / .6)`, light `0 12px 32px -12px rgb(21 19 29 / .18)` | `shadow-card` | Role card, applicant card, Apply button, toasts, a dragged item |
| `modal` | `0 24px 64px rgb(0 0 0 / .7)` | `shadow-modal` | Modals and sheets |

Rows, panels and inputs have no shadow.

## Motion

| Token | Value | Tailwind |
|---|---|---|
| `fast` | 120ms | `duration-fast` |
| `base` | 200ms | `duration-base` |
| `slow` | 320ms | `duration-slow` |
| `stagger` | 80ms | `var(--stagger)` (items entering in sequence) |
| `splash-hold` | 700ms | `var(--splash-hold)` (landing splash only) |
| `standard` easing | `cubic-bezier(.2, .8, .2, 1)` | `ease-standard` |

| Moment | Motion |
|---|---|
| Hover, press | Scale to 1.06 on hover and focus, 0.95 to 0.98 on press, `fast` |
| Drag a card | Follows the pointer 1:1 and tilts `distance / 20` degrees, capped at 15°. The stamp fades in with distance. |
| Commit a swipe | At 30% of card width, or a fling faster than 0.6 px/ms. The card flies off in `base`; the next card scales from 0.96 to 1. |
| Cancel a swipe | Springs back in `slow` with `standard` easing |
| Undo a pass | The card flies back in from the left |
| Change card page | Content swaps instantly; the page-tab underline slides in `fast` |
| Modal | Fades and rises 12px in `slow`; the scrim fades in |
| Toast | Rises in from the top on phone and top right on desktop, in `slow`. Stays 4 seconds and pauses on hover. |
| Landing splash | The logo seats fill `stagger` apart, then the dark stage lifts away at `splash-hold` in `slow`. About 1 second, once per tab. See [feedback-states.md](../patterns/feedback-states.md#splash). |
| It's a Team! | Avatars slide into a row 80ms apart, the title scales in, and confetti runs for 1.2 seconds |

### Reduced motion
When `prefers-reduced-motion: reduce` is set (`motion-safe:` and `motion-reduce:` in Tailwind):
- No tilt, fly-off, scaling or confetti. Use a 200ms cross-fade instead.
- The It's a Team! screen shows the finished lineup without the slide-in.
- The landing splash doesn't show at all.
- Nothing important may depend on seeing an animation.

## Focus
Every interactive element shows a 2px `primary` outline with a 2px offset on keyboard focus (`:focus-visible`). It's set globally in `globals.css`; don't remove it per component.
