# Design decisions

Why the system is the way it is. Add a row when a decision changes how something looks or behaves. Newest at the bottom. If a decision is reversed, add a new row that says so; don't edit the old one.

| # | Date | Decision | Why |
|---|---|---|---|
| DD-01 | Oct 21, 2026 | Dark theme first, light fully supported | A dark stage keeps attention on the one card in front of you. Light is there for daytime use and for anyone who prefers it. |
| DD-02 | Oct 21, 2026 | The match unit is a role card, with no photos | We match people to roles by skill. Photos would invite judging people on looks. |
| DD-03 | Oct 21, 2026 | Every project shows a team strip | The goal is a full team, so progress toward it should always be visible |
| DD-04 | Oct 21, 2026 | Lime means yes and nothing else; the primary button is white or ink, never violet | One meaning per colour keeps the screen readable at a glance |
| DD-05 | Oct 21, 2026 | Apply is a solid lime button, Pass a ringed one | Size alone didn't make the two choices distinct enough |
| DD-06 | Oct 21, 2026 | Destructive actions are red text behind a confirmation whose primary button is the safe choice | Makes the irreversible choice deliberate |
| DD-07 | Oct 21, 2026 | Light-mode status colours darkened (pass `#C42339`, info `#0870A6`, undo `#8A6406`, success `#0B7A54`, apply-text `#3F6600`) | The earlier values were 3.1–3.9:1 on light surfaces, under the 4.5:1 minimum |
| DD-08 | Oct 21, 2026 | Role title on the card cover; the card body shows why you fit and the team so far | The card body was mostly empty; this fills it with what people decide on |
| DD-09 | Oct 21, 2026 | Key caps use Geist, not Geist Mono | Geist Mono has no arrow glyphs, so arrows fell back to a tiny font |
| DD-10 | Oct 21, 2026 | No profile links field in the MVP. Profile strength = major 20%, skills 40%, bio 20%, avatar 20% | No data field exists for links; skills matter most for matching |
| DD-11 | Oct 21, 2026 | Wrong-domain error: "Use your @latech.edu email to sign in." (or "sign up") | Says how to fix it |
| DD-12 | Oct 21, 2026 | Google sign-ups skip email verification but still see Team rules | Everyone agrees to the same rules |
| DD-13 | Oct 21, 2026 | "Explore by vibe" filtering moves to later | It needs a tag field on projects, which isn't in the MVP. Browse and search cover discovery for now. |
| DD-14 | Oct 21, 2026 | Projects holds Browse \| Mine on phone and desktop | One home for finding projects and managing your own |
| DD-15 | Oct 21, 2026 | An owner can have only one open project at a time | Avoids an owner's teams competing with each other and simplifies benching |
| DD-16 | Oct 21, 2026 | A plain Apply sends no note; Shift+→ or a long press adds one (280 characters) | Keeps swiping fast; the note is there when it matters |
| DD-17 | Oct 21, 2026 | Undo only brings back the last pass | Re-applying to a role is blocked (BR-02), so an apply can't be undone from the deck |
| DD-18 | Oct 21, 2026 | When a role fills, its other pending applicants become passed | Matches UC-10; `flows.md` was updated to agree |
| DD-19 | Oct 21, 2026 | Owners review under Projects → Mine on desktop, with ← Pass, → Like, ↑ Profile | Keeps review next to the project it belongs to |
| DD-20 | Oct 21, 2026 | Match % = share of the role's required skills the candidate has, rounded | Simple, explainable, and matches how the deck is ranked |
| DD-21 | Oct 22, 2026 | Roles have no hours estimate; the card meta line shows the term instead | There's no hours field on Role. Revisit if owners ask for it. |
| DD-22 | Oct 22, 2026 | The UI says "Filled" for an application stored as `liked` | "Filled" says what happened to the seat; "liked" is the owner's action |
| DD-23 | Oct 22, 2026 | "It's a Team!" shows to the owner right away and to each member on their next visit, once per team | There are no live notifications in the MVP |
| DD-24 | Oct 22, 2026 | Email verification links last 3 days | The auth library's default; the expired-link screen says so and offers a new link |
| DD-25 | Oct 22, 2026 | Violet fills that carry text use `primary-strong` (`#6A47FF`) | White on the lighter dark-theme violet is 4.3:1, just under the minimum |
| DD-26 | Oct 22, 2026 | The application note is 300 characters, replacing the 280 in DD-16 | The backend and F3-02 already allow 300 |
| DD-27 | Oct 22, 2026 | "It's a Team!" seen-state is stored on the server: `Membership.seen_at`, set by `POST /api/v1/teams/{id}/seen/` | Shows exactly once per member, on any device |
| DD-28 | Oct 22, 2026 | One open project per owner is enforced by the API as BR-14, not only in the UI | A UI-only rule can be bypassed by calling the API directly |
