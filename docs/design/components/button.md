# Button

A pill-shaped button for every action that isn't a swipe decision. Swipe decisions use [ActionButton](action-button.md).

## When to use
- **`cta`:** the one main action on a view ("Apply", "Continue", "Open team chat"). Only one per view.
- **`secondary`:** other actions with weight ("Edit profile", "Browse projects").
- **`ghost`:** low-weight actions and escapes ("Skip for now", "Cancel").
- **`danger`:** destructive actions ("Delete role", "Withdraw"). They're always text, and always sit inside a confirmation gate or a settings row.

## Anatomy
A pill (`rounded-pill`) with a label and an optional leading icon, semibold Geist.

## Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `"cta" \| "secondary" \| "ghost" \| "danger"` | `"cta"` | |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Heights 36 / 44 / 52px. Use `md` unless there's a reason. |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | Use `submit` for the form's main button. |
| …rest | native `<button>` props | | `disabled`, `onClick`, `ref`, `aria-*` |

## Looks
| Variant | Dark | Light |
|---|---|---|
| `cta` | White fill, ink text | Ink fill, white text |
| `secondary` | `surface-2` fill, `border` outline | same tokens |
| `ghost` | No fill, `text` colour, underline on hover | same |
| `danger` | No fill, `pass` text, `surface-2` on hover | same |

## States
- **Hover:** cta at 90% opacity; secondary moves to `surface`; ghost underlines; danger gets a `surface-2` fill.
- **Pressed:** scales to 0.98.
- **Focus:** global violet ring.
- **Disabled:** 50% opacity and a not-allowed cursor. Show the reason nearby in helper text.
- **Loading:** a spinner replaces the label, and the button keeps its width and is disabled.

## Behaviour
- **In forms,** the CTA stays visible and disabled until the step is valid, then enables.
- **On optional steps,** the CTA reads "Skip" until something is entered, then "Continue".
- **On phone,** the CTA sits at the bottom of the screen, full width with 16px gutters.

## Accessibility
- The label is a verb that says what happens.
- An icon-only button needs an `aria-label`.
- Use `disabled` on the button only while it's truly unavailable, and explain why in nearby text.

## Do and don't
- **Do** use one `cta` per view.
- **Do** put destructive actions behind a [Modal](modal.md).
- **Don't** make a filled red button.
- **Don't** fill a button with violet.
- **Don't** use `cta` for navigation links; use a link.

## Example
```tsx
<Button onClick={save}>Save profile</Button>
<Button variant="secondary">Browse projects</Button>
<Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete role</Button>
```
