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
- A semibold title, an optional muted detail line, an optional action, and an optional × to dismiss. The × looks 32px and has a 44px touch zone.

## Props (current)
| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | |
| `children` | `ReactNode` | Detail line |
| `action` | `{ label, onClick }` | One text button: "Undo", "Retry" |
| `onDismiss` | `() => void` | Shows the × button |
| `announce` | `boolean` | `true` by default. `false` drops `role="status"` when a live region nearby already says it |

## Behaviour
- Top centre on phone, top right on desktop.
- Rises in over `slow`, stays 4 seconds, pauses while hovered or focused.
- One at a time: a new toast replaces the old one.

## Accessibility
`role="status"` (polite). Error toasts that need action use `role="alert"`.

## The pass toast
The deck shows "Passed on {role}" with Undo after every pass (`features/feed/pass-toast.tsx`). It holds the position and the 4-second clock itself, waits while hovered or focused, and goes on Undo, × or the next decision. A new pass replaces it and restarts the clock. The deck's live region announces the pass, so the toast sets `announce={false}`.

## Still to build
The current component draws one toast. A small provider that queues, auto-dismisses and keeps one live region mounted is planned; see [process.md](../process.md#what-is-still-to-build). Until then, keep the region mounted and swap its text so screen readers hear it.
