# Modal (gate)

A small centred dialog that asks for one decision before something irreversible happens. It holds one CTA, the safe choice, and one escape.

## When to use
- Withdrawing an application.
- Deleting a role.
- Leaving a form with unsaved changes.
- Logging out.
- Committing to an offer, declining one, and a commit that's blocked ([commit flow](../patterns/commit-flow.md)).

Don't use a modal for information that could be inline, or for forms longer than one field.

## Anatomy
- `surface` panel, max 400px wide, `rounded-sheet`, 24px padding, centred text, `shadow-modal`, on a `scrim` backdrop.
- **Title:** Fraunces 24px. Phrase it as a question: "Withdraw your application?"
- **Body:** one or two lines in `text-muted` saying the consequence: "The owner of CampusEats won't see you for Backend Developer anymore."
- **CTA**, full width, for the safe choice: "Keep my application".
- **Escape:** a danger text button for the risky choice: "Withdraw".

## Props
| Prop | Type | Notes |
|---|---|---|
| `open` | `boolean` | |
| `onClose` | `() => void` | Called on Esc, or when `open` turns false |
| `title` | `string` | |
| `children` | `ReactNode` | The consequence text |
| `ctaLabel`, `onCta` | `string`, `() => void` | The safe choice. It gets focus first. |
| `escapeLabel`, `onEscape` | `string`, `() => void` | The risky choice. Defaults to `onClose`. |
| `escapeVariant` | `"danger"` \| `"ghost"` | `danger` by default; `ghost` for logout |
| `focusEscape` | `boolean` | First focus goes to the escape instead of the CTA. Only the final confirm uses it. |
| `escapeHref` | `string` | Makes the escape a link, for one that goes to another page ("Go to Trail Finder") |
| `busy` | `boolean` | The escape's request is running. Both buttons lock, so it can't be sent twice, and the escape shows the delayed spinner ([button.md](button.md)). Delete role and Close project use it. |

## Behaviour
- Built on the native `<dialog>` with `showModal()`. The page behind is inert, Esc closes, and focus returns to the opener.
- It scales up from 96% and fades in `base`, with the scrim on the same clock, and both leave in `exit`. With reduced motion it appears and goes with no motion. The CSS is the `gate` class in `globals.css`; the coach marks sheet uses `sheet`, which slides up from the bottom edge and back down.
- **The final confirm is the other exception** ([DD-34](../decisions.md)): "Commit to {project}" is the CTA and "Keep my options" is a ghost escape. It sets `focusEscape`, so Enter can't commit by accident.
- **Logout is the exception:** "Log out" is the CTA and "Cancel" the escape, because logging out loses nothing. The escape is then a ghost button, not danger text: pass `escapeVariant="ghost"`.

## Do and don't
- **Do** say exactly what will be lost.
- **Don't** stack modals.
- **Don't** put a filled red button in a modal.
- **Don't** use "Are you sure?" as the whole title.

## Example
```tsx
<Modal open={open} onClose={() => setOpen(false)}
  title="Delete this role?"
  ctaLabel="Keep role" onCta={() => setOpen(false)}
  escapeLabel="Delete role" onEscape={deleteRole}>
  Applicants waiting on this role won't be considered. If it was the last open role, your team locks.
</Modal>
```
