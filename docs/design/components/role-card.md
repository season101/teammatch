# RoleCard

The core object in TeamMatch: one role on one project, shown as a card the candidate applies to or passes on. **Status: specced, not built.** Build it to this doc.

## Size
- Ratio 3:4.6, `rounded-card`, `surface`, 1px `border`, `shadow-card`.
- Desktop: 380 × 640px, centred on the stage.
- Phone: full width minus 32px.

## Anatomy, top to bottom

```
┌──────────────────────────────┐
│ ▬▬ ▬▬ ▭▭ ▬▬ ▭▭   [86% match] │  team strip + match badge
│                              │
│ CAMPUSEATS                   │  project name (label, white 85%)
│ Backend Developer            │  role title (Fraunces 28–32, white)
├──────────────────────────────┤  ← cover ends (~42% of height)
│ 2 of 5 roles filled · Fall 26│  meta line (muted, 13px)
│ WHY YOU FIT · 3 OF 4 SKILLS  │  label
│ [✓ Django] [✓ PostgreSQL]    │  matched chips first
│ [✓ REST APIs] [Redis]        │
│ TEAM SO FAR                  │  label
│ (OK)(AR)(+ you?)( )( )       │  avatars, your seat, open seats
│ Late-night food delivery…    │  one-line pitch
│ Role  Project  Team          │  page indicator
│    ↺    ✕     ⓘ    ✓         │  action bar (inside, desktop)
└──────────────────────────────┘
```

1. **Cover** (about 42% of the height): the project's cover colour as a gradient to a darker shade.
   - Top: [TeamStrip](team-strip.md), with the [MatchBadge](match-badge.md) to its right.
   - Bottom: the project name (12px uppercase label, white at 85%) and the role title (Fraunces 800, white, balanced).
   - A large, faint first letter of the project name can sit in the corner as decoration (`aria-hidden`).
2. **Body.** It always fills the space down to the action bar. Never leave the middle empty.
3. **Page indicator:** small text tabs "Role · Project · Team". The active one is `text` with a 2px `primary` underline; the others are `text-muted`.
4. **Action bar:** the four [ActionButtons](action-button.md). Inside the card's bottom edge on desktop, below the card on phone.

## Pages
| Page | Content |
|---|---|
| **Role** (default) | Meta line ("2 of 5 roles filled · Fall 2026"). "Why you fit · N of M skills" with chips, matched first. "Team so far": 28px avatars for filled seats, a dashed "+ you?" pill on this role's seat, dashed circles for other open seats. A one-line pitch, truncated. |
| **Project** | The pitch (up to 5 lines), owner, term, number of seats |
| **Team** | Every seat as a row: avatar or dashed circle, role, then name or "open" |

To change page, tap the right or left half of the card, or press Space on desktop.

## Props (planned)
| Prop | Type | Notes |
|---|---|---|
| `role` | `{ id, title, skills: { id, name }[] }` | From the feed API |
| `project` | `{ id, title, pitch, owner, term, cover, roles: { id, title, status, filledBy? }[] }` | `cover` is a cover-palette name |
| `mySkillIds` | `Set<string>` | To mark matched chips and work out the match % |
| `page` | `"role" \| "project" \| "team"` | Controlled by the deck |
| `onPageChange` | `(page) => void` | |
| `actions` | `ReactNode` | The action bar, passed in by the deck |

The card only draws. The swipe gesture, keys and undo belong to the deck ([patterns/swipe-deck.md](../patterns/swipe-deck.md)).

## States
| State | Look |
|---|---|
| Default | As above |
| Dragging | Tilted, with the APPLY or PASS stamp fading in ([swipe-deck.md](../patterns/swipe-deck.md#stamps)) |
| Under the top card | Scaled to 0.96, 70% opacity, no action bar, `aria-hidden` |
| Loading | Cover and body as `surface-2` blocks with a slow shimmer (none with reduced motion) |

## Accessibility
- The card is a region labelled "Backend Developer on CampusEats, 86% match".
- Page changes are announced ("Project page").
- Every action is a real button with a full label.

## Do and don't
- **Do** keep the role title on the cover and the details in the body.
- **Don't** put photos on role cards.
- **Don't** show more than about 8 chips; use "+N more".
- **Don't** leave white space in the middle of the body.
