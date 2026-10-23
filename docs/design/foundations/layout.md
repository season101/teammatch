# Layout

## Spacing
A 4px base. Use these steps only. They map to Tailwind's default spacing, so `p-4` = 16px.

| Step | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 |
|---|---|---|---|---|---|---|---|---|---|---|
| px | 4 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64 |

Common choices:
- 16px gutters on phone.
- 24px padding inside desktop panels.
- 8px between chips.
- 12–16px between rows in a list.
- 32px between page sections.

Lay out siblings with `flex` or `grid` and `gap`, not margins on each child.

## Breakpoints

| Name | Width | Tailwind prefix | Shell |
|---|---|---|---|
| Phone | under 640px | (none) | Bottom tab bar, single column |
| Tablet | 640–1023px | `sm:` | Top bar with tabs, single column, card max 420px |
| Desktop | 1024px and up | `lg:` | 320px sidebar plus stage |
| Wide | 1440px and up | `2xl:` (set to 1440px) | Desktop plus a 400px right panel |

Design phone first, then add the larger layouts.

## App shells

### Phone
```
┌───────────────────────┐
│ Top bar: title  [⋯]   │
│                       │
│   ┌───────────────┐   │
│   │   role card   │   │  card fills the width minus 16px gutters
│   │   3 : 4.6     │   │
│   └───────────────┘   │
│   ↺   ✕    ⓘ   ✓      │  action bar below the card
│                       │
│ Discover Projects Review Teams Me │  bottom tab bar
└───────────────────────┘
```
- Bottom tabs: **Discover · Projects · Review · Teams · Me**. Review appears only for students who own a project.
- My applications opens from an inbox button in the Discover top bar.

### Desktop
```
┌──────────────┬───────────────────────────────────────┐
│ [You] ◉ ▣ ⚙  │                                       │
│ Applications │          ┌─────────────┐              │
│ | Teams      │          │  role card  │ 380 × 640    │
│              │          │             │              │
│  rows…       │          │  ↺ ✕ ⓘ ✓    │              │
│              │          └─────────────┘              │
│   320px      │  ← Pass  → Apply  ↑ Details  Z Undo   │ legend
└──────────────┴───────────────────────────────────────┘
```
- The **sidebar** (320px, `surface`) has a `primary-strong` header strip with the avatar and "You", then three icon buttons: Discover, Projects and Settings. Each one switches the sidebar's mode (see [patterns/navigation.md](../patterns/navigation.md)).
- The **stage** (`bg`) holds the one thing you're deciding on, centred: the role card at 380×640, the applicant card, a chat or a settings page.
- The **keyboard legend** is pinned to the bottom of the stage.

### Wide (1440px and up)
Desktop plus a 400px right panel. Role details, project details and the apply-with-note form open in the panel instead of over the card.

## Sizes to remember
| Thing | Size |
|---|---|
| Minimum touch target | 44 × 44px |
| Large action button (Pass, Apply) | 64px |
| Small action button (Undo, Details) | 48px |
| Role card on desktop | 380 × 640px, ratio 3:4.6 |
| Role card on phone | full width minus 32px, same ratio |
| Sidebar | 320px |
| Right panel | 400px |
| Modal | max 400px wide |
| Text column | max about 65 characters |
