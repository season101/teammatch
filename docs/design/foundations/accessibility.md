# Accessibility

Our target is **WCAG 2.2 level AA** in both themes, on phone and desktop. Accessibility is part of "done", not a later pass.

## Checklist for every screen
- [ ] **Contrast:** text is at least 4.5:1 (3:1 for 24px+, or 18.66px+ bold), and icons and control edges are at least 3:1. Use tokens and this holds; see [color.md](color.md#contrast).
- [ ] **Keyboard:** everything works with Tab, Shift+Tab, Enter, Space, Esc and the arrow keys, in a sensible order. No keyboard traps except inside an open modal.
- [ ] **Focus is visible** on every control (the global violet ring).
- [ ] **No drag-only actions.** Every swipe has a button and a key. Photo reorder works with Space plus the arrow keys.
- [ ] **Targets** are at least 44 × 44px.
- [ ] **Names:** every icon-only button has an `aria-label` that says what it does to what ("Apply to Backend Developer on CampusEats").
- [ ] **Colour isn't the only signal:** statuses have words, stamps have words, and the team strip has a text label.
- [ ] **Announcements:** results of swipes and decisions are announced (below).
- [ ] **Reduced motion** is respected ([shape-depth-motion.md](shape-depth-motion.md#reduced-motion)).
- [ ] **Zoom:** works at 200% browser zoom and at 375px wide without sideways scrolling.
- [ ] **Forms:** every field has a visible label; errors are text next to the field, linked with `aria-describedby`.

## Announcements
Use one polite live region (`role="status"`) per page for results. Announce:

| Event | Message |
|---|---|
| Apply | "Applied to Backend Developer at CampusEats." |
| Pass | "Passed on Backend Developer." |
| Undo | "Back to Backend Developer." |
| Owner like that fills a role | "Backend Developer filled. 2 roles to go." |
| Team locks | "Your team is locked. Team chat is open." |
| Deck empty | "You've seen every role for now." |

Stamps and confetti are decorative (`aria-hidden="true"`).

## Patterns we rely on
- **Modals** use the native `<dialog>` with `showModal()`. That makes the page behind inert, closes on Esc and returns focus. The CTA gets focus first.
- **Tabs** use `role="tablist"` with roving tabindex. The arrow keys, Home and End move between tabs.
- **Meters** use `role="meter"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.
- **The team strip** is `role="img"` with an `aria-label` like "3 of 5 roles filled".
- **Keyboard shortcuts** on the deck and review queue never fire while focus is in a text field. They can be switched off in Settings → Keyboard shortcuts.

## How we test
- **Every UI pull request**, by hand:
  - Keyboard only.
  - Both themes.
  - 375px width.
  - A screen reader pass on any new component (VoiceOver or NVDA).
- **Automated:** axe checks in the Playwright e2e suite for each main screen. Planned; see [process.md](../process.md#what-is-still-to-build).
