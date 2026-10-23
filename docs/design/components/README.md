# Components

Reusable UI pieces live in `frontend/src/components/ui/` and are shown live at `/design-system`. Feature code in `frontend/src/features/<feature>/` composes them. It doesn't restyle them.

## Inventory

| Component | Status | File | Doc |
|---|---|---|---|
| Button | Built | `ui/button.tsx` | [button.md](button.md) |
| ActionButton | Built | `ui/action-button.tsx` | [action-button.md](action-button.md) |
| Chip | Built | `ui/chip.tsx` | [chip.md](chip.md) |
| MatchBadge | Built | `ui/match-badge.tsx` | [match-badge.md](match-badge.md) |
| TeamStrip | Built | `ui/team-strip.tsx` | [team-strip.md](team-strip.md) |
| ProfileStrength | Built | `ui/profile-strength.tsx` | [profile-strength.md](profile-strength.md) |
| Tabs | Built | `ui/tabs.tsx` | [tabs.md](tabs.md) |
| Modal (gate) | Built | `ui/modal.tsx` | [modal.md](modal.md) |
| Toast | Built (no queue yet) | `ui/toast.tsx` | [toast.md](toast.md) |
| RoleCard | Specced | `ui/role-card.tsx` | [role-card.md](role-card.md) |
| ApplicantCard | Specced | `ui/applicant-card.tsx` | [applicant-card.md](applicant-card.md) |
| TextField, Select, Textarea | Specced | `ui/text-field.tsx` etc. | [form-fields.md](form-fields.md) |
| EmptyState | Specced | `ui/empty-state.tsx` | [empty-state.md](empty-state.md) |

**Specced** means the doc is final and the component isn't built yet. Build it to the doc and flip its status here in the same pull request.

## Conventions

**Files and names**
- One component per file, named in kebab-case (`action-button.tsx`), exporting a PascalCase function (`ActionButton`).
- Tests sit next to the component (`action-button.test.tsx`).
- Variant props use the words from the docs: `variant="cta"`, `kind="apply"`, `segments={["filled", "current", "open"]}`.

**Styling**
- Tailwind utilities that map to tokens only: `bg-surface`, `text-muted`, `rounded-card`, `duration-fast`.
- No hex values, no arbitrary pixel values outside the spacing scale, no inline colours.
- Keep variant classes in a `const variants = { … }` map at the top of the file, as the built components do.
- Pass `className` through for layout only (width, margin, grid placement), never to recolour.

**Every component handles**
- **States:** default, hover, focus-visible, active, disabled, and loading where it makes sense.
- **Both themes**, without branching in code: tokens switch values.
- **Reduced motion**, with `motion-safe:` and `motion-reduce:` on any animation.
- **Accessibility:** a real element (`<button>`, `<dialog>`), an accessible name and the right role. See [foundations/accessibility.md](../foundations/accessibility.md).

**Adding a component**
1. Check that an existing one can't do the job with a new variant.
2. Write its doc here first, using the template below, and get a teammate's review on the doc.
3. Build it, add it to `/design-system`, add a test for its behaviour, then update the inventory.

## Doc template

```markdown
# ComponentName

One sentence: what it's for.

## When to use / when not to
## Anatomy
## Props
| Prop | Type | Default | Notes |
## States
## Behaviour
## Accessibility
## Do and don't
## Example
```
