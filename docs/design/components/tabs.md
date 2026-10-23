# Tabs

Text tabs with a violet underline on the active one. They switch between sibling lists, like **Applications | Teams** or **Browse | Mine** in the desktop sidebar, or the role tabs in a review queue.

## Anatomy
- A `tablist` row with a hairline bottom border.
- Each tab is 44px tall, semibold 14px, `text-muted`. The active tab is `text`, with a 2px `primary` underline that slides in.
- Counts go after the label in Geist Mono ("Applications 4").

## Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `tabs` | `{ id, label, panel }[]` | required | |
| `label` | `string` | required | The tablist's accessible name |
| `defaultTab` | `string` | first tab | |

## Behaviour
- **Mouse:** click selects.
- **Keyboard:** ←/→ move and select, Home and End jump to the ends. Only the active tab is in the tab order.
- **Panels:** only the active one is rendered visible; the others are `hidden`.

## Accessibility
`role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, and `role="tabpanel"` with `aria-labelledby`.

## Do and don't
- **Do** use tabs for 2–4 sibling views of the same kind.
- **Don't** use tabs for steps in a flow.
- **Don't** use tabs for the card's Role · Project · Team pages, which have their own small indicator ([role-card.md](role-card.md)).

## Example
```tsx
<Tabs label="Your activity" tabs={[
  { id: "applications", label: "Applications", panel: <ApplicationList /> },
  { id: "teams", label: "Teams", panel: <TeamList /> },
]} />
```
