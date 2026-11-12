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
| DD-29 | Oct 22, 2026 | The landing page opens with a splash: about 1.7 seconds, once per tab session, CSS only, always dark. It's skipped with reduced motion or without JavaScript. | A brand moment that never delays content: the page is painted underneath and the splash only covers it |
| DD-30 | Oct 25, 2026 | Replaces DD-11: the wrong-domain error is "Use your @latech.edu or @email.latech.edu email." on sign-up, sign-in, password reset and add-email, and it names every domain in `ALLOWED_EMAIL_DOMAINS` | Students use @email.latech.edu and staff use @latech.edu. One server message serves every form, so it can't say "sign in" or "sign up". |
| DD-31 | Nov 8, 2026 | Planned with F4-10: a like is an offer, and the seat fills when the candidate commits. The UI says "Offer" for `liked` and "Committed" for `committed`, replacing DD-22 once it ships | Someone liked by several projects should get to choose the team they join |
| DD-32 | Nov 8, 2026 | Planned with F4-10: an owner can like several people for one role and the first to commit gets it. Offers don't expire | A role is never stuck waiting on someone who doesn't answer, and we don't need a timer |
| DD-33 | Nov 8, 2026 | Planned with F4-10: someone who owns an open project can be liked, but has to close it before committing | Today they can apply, but a like on them is refused. The decision now sits with the person who can act on it |
| DD-34 | Nov 8, 2026 | Planned with F4-11: in the final confirm, Commit is the primary button and "Keep my options" is a ghost button that gets focus first. It's the one exception to "the safe choice is the primary button" | Committing is what the person came to do, and red text would read as a warning. Starting focus on the safe button keeps Enter from committing by accident |
| DD-35 | Nov 8, 2026 | Planned with F1-12: Settings gets a Ways to sign in section, with Connect Google and Set a password | Someone who signed up one way can add the other, and still get in if one stops working |
| DD-36 | Nov 8, 2026 | Planned with F1-12: Connect Google only links a Google account with the same email as the TeamMatch account, and the button is hidden for @latech.edu staff | Today any school Google account can link to any account. Staff aren't on Google |
| DD-37 | Nov 8, 2026 | Planned with F1-13: signing in with the email of a Google-only account shows "This email signs in with Google. Want to set a password too?" It's the one exception to F1-02's single error. Wrong passwords and unknown emails keep that error | Otherwise these students only ever see "incorrect". It does reveal which emails are Google-only, which we accepted because saying yes only emails a link to the inbox owner |
| DD-38 | Nov 8, 2026 | Planned with F1-14: Continue with Google on a never-verified password account signs the person in and marks the email verified. The old password is still wiped | Google proves the inbox is theirs, but anyone could have registered that address and set the password |
| DD-39 | Nov 9, 2026 | Proposed, needs team OK. Planned with F3-13: tapping a deck card opens the existing project page, focused on that role. Back returns to the deck on the same card | The project page already has the project, roles and team, and it covers #172. A new page would repeat all of that |
| DD-40 | Nov 11, 2026 | Agreed. UI-06 (#217) took the note box off the deck card, and F3-13 puts it on the details page. Shift + → and long press no longer open a note. Replaces the note part of DD-16 | A swipe right applies with no note, and every card can stay the same size |
| DD-41 | Nov 9, 2026 | Proposed, needs team OK. Planned with F2-12: the GitHub repository link is optional on every project, with a hint that it's for software projects | A separate "software project" switch adds a step and a field for no gain |
| DD-42 | Nov 9, 2026 | Proposed, needs team OK. Planned with F1-16: a resume can be opened by its owner and by owners of projects the person applied to, and nobody else | Anything wider puts a student's personal details in front of the whole class |
| DD-43 | Nov 9, 2026 | Proposed, needs team OK. Planned with F1-15 and F1-16: profile strength adds GitHub +5%, LinkedIn +5% and resume +10%, and the photo stops counting. Replaces the links and avatar parts of DD-10 | It fills the 20% waiting on photo upload and still tops out at 100%. A student without GitHub can reach 95% |
| DD-44 | Nov 9, 2026 | Proposed, needs team OK. Planned with F1-17: resumes are read inside the app, with pages drawn by PDF.js | Phone browsers don't reliably show a PDF embedded in a page. PDF.js only loads when someone opens a resume |
| DD-45 | Nov 9, 2026 | Proposed, needs team OK. Sprint 3 does UI-06, F3-13, F2-12 and F1-15 first. Resume upload (F1-16) and the viewer (F1-17) are the first stories to move out if time runs short | Upload is the first real file upload in the app, so it's the most new work |
| DD-46 | Nov 11, 2026 | The desktop sidebar is a labelled nav column (Discover, Projects, Review, Teams, Profile, Settings) beside the 320px list column, replacing the violet strip with three mode icons. Review is its own row, replacing DD-19's "under Projects → Mine". Count badges show offers on Discover and applicants waiting on Review | The mode icons had no labels and Review took three clicks to reach. Handshake's labelled sidebar with a list beside it fits what our sidebar already lists |
| DD-47 | Nov 11, 2026 | Onboarding is one question per screen on every screen size: Team rules, Confirm your info, Pick your skills, then coach marks on the first deck. A null rules_accepted_at sends any signed-in user to Team rules | One decision at a time, and Handshake's question-per-screen flow tested well as a model. Existing accounts agree once on their next visit |
