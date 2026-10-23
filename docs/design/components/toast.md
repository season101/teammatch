# Toast

A short message that confirms something happened, without blocking anything.

## When to use
| Moment | Title | Detail | Action |
|---|---|---|---|
| Owner likes and fills a role | "Backend Developer filled" | "2 roles to go." | |
| Candidate passes | "Passed on Backend Developer" | | Undo |
| Photo uploaded | "Photo updated" | | |
| Something failed | "Couldn't save your profile" | "Check your connection and try again." | Retry |

The candidate's Apply doesn't need a toast. The card flying off is the feedback, and the live region announces it.

## Anatomy
- `surface` panel, `rounded-row`, 1px `border`, `shadow-card`, max 384px wide.
- A leading icon: lime check for success, rose for errors, info blue for notices.
- A semibold title, an optional muted detail line, an optional action, and an optional × to dismiss.

## Props (current)
| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | |
| `children` | `ReactNode` | Detail line |
| `onDismiss` | `() => void` | Shows the × button |

## Behaviour
- Top centre on phone, top right on desktop.
- Rises in over `slow`, stays 4 seconds, pauses while hovered or focused.
- One at a time: a new toast replaces the old one.

## Accessibility
`role="status"` (polite). Error toasts that need action use `role="alert"`.

## Still to build
The current component draws one toast. A small provider that queues, auto-dismisses and keeps one live region mounted is planned; see [process.md](../process.md#what-is-still-to-build). Until then, keep the region mounted and swap its text so screen readers hear it.
