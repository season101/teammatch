# Modal (gate)

A small centred dialog that asks for one decision before something irreversible happens. It holds one CTA, the safe choice, and one escape.

## When to use
- Withdrawing an application.
- Deleting a role.
- Leaving a form with unsaved changes.
- Logging out.

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

## Behaviour
- Built on the native `<dialog>` with `showModal()`. The page behind is inert, Esc closes, and focus returns to the opener.
- It fades and rises in `slow`; with reduced motion it only fades.
- **Logout is the exception:** "Log out" is the CTA and "Cancel" the escape, because logging out loses nothing. The escape should then be a ghost button, not danger text. That needs a small `escapeVariant` prop, to add when the logout screen is built.

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
