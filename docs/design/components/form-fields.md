# Form fields

TextField, Textarea and Select for sign-up, profile and project forms. **Status: specced, not built.** Until they're built, use native elements with these classes.

## Anatomy
```
Label *                          ← 14px semibold, text
┌─────────────────────────────┐
│ value                       │  ← 48px tall, surface-2, 1px border, rounded-input
└─────────────────────────────┘
Helper text says why it matters  ← 13px, text-muted
```

## States
| State | Look |
|---|---|
| Default | `surface-2` fill, 1px `border` |
| Hover | Border moves to `text-muted` |
| Focus | Global violet ring; the border stays |
| Error | 1px `pass` border; helper text is replaced by the error in `pass` with an icon |
| Disabled | 50% opacity, not-allowed cursor |
| Read-only | No border, `bg` fill |

## Rules
- The label always sits above the field. Placeholders are examples, never labels.
- Required fields get a quiet `*` after the label. Optional sections sit under an "Optional" divider instead of marking each field.
- **Validate** a field when it loses focus, and the whole form on submit. Errors are inline next to the field, never only in a toast.
- **Error text says how to fix it:** "Use your @latech.edu or @email.latech.edu email."
- **Character counts** go bottom right in mono, for limited fields ("120 / 300" for the application note, "/ 500" for the bio).
- **Textarea** grows with its content up to 8 lines, then scrolls.
- **Select** uses the native `<select>` styled with the same frame. Pickers with many options use chips ([chip.md](chip.md)).

## Accessibility
- `<label for>` on every field.
- Helper and error text are linked with `aria-describedby`, and the field gets `aria-invalid` on error.
- Autocomplete hints (`autocomplete="email"`, `"given-name"`).

## Classes until the component exists
```tsx
<label htmlFor="major" className="text-sm font-semibold">Major *</label>
<input id="major" aria-describedby="major-help"
  className="h-12 w-full rounded-input border border-border bg-surface-2 px-4 text-base hover:border-muted aria-invalid:border-pass" />
<p id="major-help" className="text-[13px] text-muted">Owners see your major on your applications.</p>
```
