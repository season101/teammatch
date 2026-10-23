# How we work with the design system

This page covers how we keep three people's screens (and our coding agents' output) looking and behaving like one product. We follow the way most product teams run a design system, scaled down to a three-person class project.

## The model
1. **Tokens are the single source of truth** for every value. They live in [tokens.json](tokens.json), mirrored in `frontend/src/app/globals.css`. Nothing else defines a colour, size, radius, shadow or duration.
2. **Components are built from tokens only** (`frontend/src/components/ui/`). Each has a doc in [components/](components/README.md) and an entry on `/design-system`.
3. **Patterns combine components** for a job (the deck, review, forms). Each has a doc in [patterns/](patterns/).
4. **Screens are built from patterns and components**, laid out per the [wireframes](screens/README.md).
5. **Docs and code change together.** A pull request that changes how something looks or behaves updates its doc in the same pull request.

When you need something new, go up the layers in order: is there a component for it? A pattern? A token? Only add something new when the answer is no. Add it at the lowest layer that makes sense.

## Definition of done for UI work
A UI pull request is done when:
- [ ] It matches the wireframe for the screen, or the pull request says why it differs.
- [ ] It uses existing components and token utilities only. No hex values, no arbitrary sizes, no restyled components.
- [ ] Loading, empty and error states are handled ([patterns/feedback-states.md](patterns/feedback-states.md)).
- [ ] It works in **dark and light**, at **375px** and at desktop width.
- [ ] It works with the **keyboard alone**, and focus is visible.
- [ ] Icon-only buttons have names, and results are announced.
- [ ] Copy follows the [voice rules](principles.md#voice-and-wording) and the [words we use](principles.md#words-we-use).
- [ ] Screenshots are in the pull request: phone and desktop, dark and light.
- [ ] Docs are updated if anything about a component or pattern changed.

## UI review checklist
For the reviewer of a UI pull request. If something fails, comment with the doc link.
1. **One decision per screen, one CTA.** Is it obvious what to do next?
2. **Colour jobs.**
   - Lime only for yes, apply, filled or progress.
   - Rose only for pass or errors.
   - Violet only for focus or selection.
   - No filled red or violet buttons.
3. **Type roles.**
   - Fraunces only for titles and role titles.
   - Mono for numbers that get compared.
   - Sentence case.
4. **Spacing** from the scale. Gaps, not stacked margins.
5. **States:** hover, focus, disabled, loading, empty, error.
6. **Accessibility:**
   - Keyboard path.
   - Labels.
   - Contrast. Run the page in light theme too.
7. **Team strip and match %** wherever a project or role appears.

## Changing the system
**Small fixes** (a wrong value, a typo, a missing state): just open a pull request, label it `design`, and update the doc.

**Real changes** (a new component, a new token, a different behaviour):
1. Open an issue labelled `design` with the problem, the proposal and a sketch or screenshot.
2. Get one teammate's 👍 on the issue. If it touches another epic's screens, get that epic's owner too.
3. In the pull request, change the tokens, components and docs together:
   - Update `tokens.json` and `globals.css` in the same commit.
   - Add or update the component doc and the `/design-system` page.
   - Add a line to [decisions.md](decisions.md) with the date and why.

**Versioning.** The system is versioned in this folder's README ("v1.0"):
- Bump the minor version for additions, like a new component or token.
- Bump the major version for anything that changes existing screens, like a renamed token or a removed variant.
- Mention the bump in the pull request title.

## Working with coding agents
Several of us use coding agents. To keep their output consistent, point your agent at this folder and hold it to the same rules:

1. **Read first:** [README.md](README.md), then the docs for the screen, pattern and components involved, before writing UI code.
2. **Don't invent values.** Use token utilities (`bg-surface`, `text-muted`, `rounded-card`, `duration-base`). If a value isn't in [tokens.json](tokens.json), stop and ask.
3. **Don't invent components.** Use `frontend/src/components/ui/`. If none fits, write the component doc first and ask for review, as for any teammate.
4. **Don't guess behaviour.** If the docs don't say what happens (a missing state, an unclear flow), stop and ask. Don't make it up. Then add the answer to the docs.
5. **Follow the words.** Use the terms in [principles.md](principles.md#words-we-use) in UI copy and in code names.
6. **Check before saying done:** the [definition of done](#definition-of-done-for-ui-work) applies to agent-written code too, screenshots included.

The repo doesn't ship agent config files; they're gitignored as local tooling. Point your own agent's instructions at `docs/design/README.md` and this section rather than copying rules into them, so there's one place to update. A two-line pointer is enough:

```text
Before any UI work, read docs/design/README.md and follow docs/design/process.md
("Working with coding agents"). Use tokens and frontend/src/components/ui/ only.
```

## What is still to build
| Item | Notes |
|---|---|
| RoleCard, ApplicantCard | Specced in [components/](components/README.md) |
| Swipe deck behaviour | Gesture, keys, undo and announcements, per [patterns/swipe-deck.md](patterns/swipe-deck.md) |
| Form fields, EmptyState | Specced |
| Toast provider | Queue, auto-dismiss, one live region |
| Modal `escapeVariant` | Ghost escape, for logout |
| Desktop shell | Sidebar modes and the keyboard legend |
| Automated accessibility checks | axe in the Playwright e2e suite for each main screen |
| Screenshot tests | Visual regression for `/design-system` in both themes |
| Moving existing screens over | `/feed`, `/applicants`, `/projects`, `/profile`, sign-up and login onto these components |
