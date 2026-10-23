# TeamMatch design system

This folder is how TeamMatch looks and behaves on phone and desktop. Read it before you build or change any screen. When code and these docs disagree, fix one of them in the same pull request. Don't leave them out of step.

TeamMatch helps students form project teams by swiping on **roles, not people**. The visual language is called **Lineup**: a dark stage, one decision at a time, and a team that fills up seat by seat until it locks.

| | |
|---|---|
| Owners | The TeamMatch team (F1 accounts, F2 projects, F3 deck, F4 review and chat) |
| Status | v1.0: foundations, tokens and 9 components are built. Role card, applicant card and form fields are specced, not built. |
| Last reviewed | Oct 22, 2026 |

## How the docs are organised

The system is built in layers. Each layer only uses the ones above it.

| Layer | What it holds | Where |
|---|---|---|
| Principles | The rules behind every decision, plus voice and wording | [principles.md](principles.md) |
| Foundations | Colour, type, layout, shape, depth, motion, accessibility | [foundations/](foundations/) |
| Tokens | Every raw value, in one machine-readable file | [tokens.json](tokens.json) |
| Components | Reusable UI pieces: anatomy, props, states, do and don't | [components/](components/README.md) |
| Patterns | How components combine for a job: the deck, review, forms, confirmations | [patterns/](patterns/) |
| Screens | Wireframes for all 25 screens, plus the main flows | [screens/](screens/README.md) |
| Process | How we change the system, review UI work and keep it consistent | [process.md](process.md) |
| Decisions | Why things are the way they are | [decisions.md](decisions.md) |

## Reading order

**New to the project:** principles → foundations/color → foundations/layout → components/README → patterns/swipe-deck → screens.

**Building a screen:**
1. Find the screen in [screens/README.md](screens/README.md) and open its wireframe.
2. Read the pattern it uses (for example [patterns/swipe-deck.md](patterns/swipe-deck.md)).
3. Use the components in `frontend/src/components/ui/`, following their docs in [components/](components/README.md).
4. Check the result against the [UI review checklist](process.md#ui-review-checklist).

**Coding agents:** follow [process.md, "Working with coding agents"](process.md#working-with-coding-agents). In short:
- Use tokens and existing components; never raw hex values or one-off styles.
- If the docs don't cover a case, stop and ask rather than invent.

## Rules that never bend

1. **Lime means yes.** `apply` is only for apply, matched skills, filled seats and progress. Nothing else is lime.
2. **One CTA per view.** The primary button is a white pill on dark and an ink pill on light. Violet is never a button fill.
3. **The safe choice is the primary button** in every confirmation. Destructive actions are red text, never a filled red button.
4. **Every swipe has a button, and every button has a key.** Dragging is never the only way to do something.
5. **Show the team filling up.** Anywhere a project appears, show how many seats are filled.
6. **Use tokens.** No hex values, pixel values or durations in components that aren't in [tokens.json](tokens.json).
7. **Both themes, phone width, keyboard.** A UI change isn't done until it works in dark and light, at 375 px wide, and with the keyboard alone.
8. **Explain the consequence.** Helper text says what will happen, not what the field is.

## Where it lives in code

| What | Path |
|---|---|
| Tokens as CSS variables and Tailwind theme | `frontend/src/app/globals.css` |
| Fonts (Fraunces, Geist, Geist Mono) | `frontend/src/app/layout.tsx` |
| Components | `frontend/src/components/ui/` |
| Live reference page | `/design-system` (run `pnpm --dir frontend dev`, then open `localhost:3000/design-system`) |

Tailwind utilities come straight from the tokens: `bg-surface`, `text-muted`, `bg-apply`, `text-on-apply`, `border-pass`, `rounded-card`, `shadow-card`, `font-display`, `duration-base`, `ease-standard`.
