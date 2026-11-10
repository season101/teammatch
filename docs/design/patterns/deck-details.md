# Deck details and profile links

**Planned, not built yet.** This is the guide for UI-06 (#207), [F3-13](../../product/backlog.md#f3-13-role-details-page), [F2-12](../../product/backlog.md#f2-12-repository-link-and-more-details-on-projects), [F1-15](../../product/backlog.md#f1-15-github-and-linkedin-on-profiles), [F1-16](../../product/backlog.md#f1-16-upload-a-resume) and [F1-17](../../product/backlog.md#f1-17-read-a-resume-in-the-app). Its seven decisions, [DD-39 to DD-45](../decisions.md), are proposals the team hasn't agreed to yet. Confirm them before building, and update this page if any change.

Every deck card is the same size and shows a summary. Tapping it opens a details page with everything else, and Back returns to the same card. Owners can add a GitHub repository and more details to a project. Students can add GitHub, LinkedIn and a resume to their profile, and owners they apply to can read the resume inside the app.

Screens are numbered 47 to 53 in [screens/README.md](../screens/README.md#deck-details-planned), and the journeys are [flows 6 to 9](../screens/flows.md#6-planned-deck-to-details-and-back).

## Decisions to confirm

| # | Proposal | Why |
|---|---|---|
| DD-39 | The details page is the existing project page, focused on the tapped role | It already has the project, roles and team, and it covers #172. A new page would repeat all of that. |
| DD-40 | The note box moves from the card to the details page | A swipe right applies with no note, and the card stays clean. |
| DD-41 | The repository link is optional on every project, with a hint | A separate "software project" switch adds a step and a field for no gain. |
| DD-42 | A resume can be opened by its owner and by owners of projects the person applied to | Anything wider puts a student's personal details in front of the whole class. |
| DD-43 | Profile strength adds GitHub +5%, LinkedIn +5% and resume +10% | It fills the 20% that's waiting on photo upload and still tops out at 100%. A student without GitHub can reach 95%. |
| DD-44 | The resume viewer draws pages with PDF.js | Phone browsers don't reliably show a PDF embedded in a page. PDF.js only loads when someone opens a resume. |
| DD-45 | UI-06, F3-13, F2-12 and F1-15 go first. Resume upload (F1-16) and the viewer (F1-17) are the first to move out of Sprint 3 | Upload is the first real file upload in the app, so it's the most new work. |

## The rules

| Rule | What it means |
|---|---|
| One card size | Every card is the same height. Long text is cut off with an ellipsis, so nothing scrolls inside the card. |
| Buttons don't move | Pass and Apply sit in the same place on every card, just above the tab bar. |
| The deck never waits | Cards don't dim while a decision saves. A failed request brings the card back with its error, as today. |
| Applied means gone | An applied card is dropped from the `["feed"]` cache, so a refresh can't bring it back. |
| Back keeps your place | The details page returns to the deck on the same card. Opened from a link, it goes to Discover. |
| The note lives on the details page | Up to 300 characters, the limit in `note-field.tsx` today ([DD-40](../decisions.md)). |
| Links are checked on the server | Projects take only `https://github.com/...`. Profiles take only `https://github.com/...` and `https://linkedin.com/...` (with or without `www.`). |
| A resume is a private PDF | 5 MB or less, checked from the file itself. It's stored outside the public media storage and only sent after a permission check ([DD-42](../decisions.md)). |

## What to build, screen by screen

| # | Screen | Where | What changes | Code | Story |
|---|---|---|---|---|---|
| 47 | Discover deck | `/feed` | Fixed-height card with clamped text and a View details row. No note box. Pass and Apply pinned above the tab bar. No `busy` lock. | `frontend/src/features/feed/role-card.tsx`, `feed.tsx`, `queries.ts` | UI-06 |
| 48 | Role details | `/projects/<id>?role=<role id>` | The project page, scrolled to and focused on the tapped role, with Apply, Pass and the note at the bottom. | `frontend/src/app/(app)/projects/[id]/page.tsx`, `frontend/src/features/projects/project-editor.tsx`, `useApply` and `NoteField` from `features/feed` | F3-13 |
| 49 | Project form | `/projects/new`, project edit | Two optional fields after Pitch: GitHub repository and More details. | `frontend/src/features/projects/project-details-form.tsx`, `new-project-form.tsx` | F2-12 |
| 50 | Project page | `/projects/<id>` | View the code and More from the owner, each hidden when empty. | `project-editor.tsx` | F2-12 |
| 51 | Profile | `/profile` | GitHub and LinkedIn fields, the resume row, and new strength weights. Preview shows each as a link card. | `frontend/src/features/profiles/profile-form.tsx`, `profile-tabs.tsx` | F1-15, F1-16 |
| 52 | Review queue | `/applicants` | Up to three small cards on the applicant: GitHub, LinkedIn, Resume. Only what the person added. | `frontend/src/features/review/applicant-card.tsx` | F1-15, F1-16 |
| 53 | Resume viewer | `/profiles/<id>/resume` | New page: pages in one column, page count, zoom, Download. No access and won't display states. | New `frontend/src/features/profiles/resume-viewer.tsx` and its page | F1-17 |

The PNGs for 47 to 53 also show a loading skeleton for each screen. Use those shapes for the loading states.

## UI-06: what changes on the deck

This replaces the scope UI-06 (#207) had before. The issue is rewritten to match.

- The card gets a fixed height that fits a 390 × 844 phone with the tab bar. The pitch is clamped to three lines, and skills that don't fit on one row become "+2 more".
- `NoteField` leaves the card in `feed.tsx`. Shift + → and a long press no longer open a note; the note is on the details page (F3-13).
- Tapping the card, pressing ↑ or pressing Enter opens `/projects/<id>?role=<role id>`. Until F3-13 ships, that's the project page as it is.
- Remove the `busy` state in `feed.tsx`. The buttons and keys send each decision right away, and `gone` already handles the deck.
- In `useApply` (`frontend/src/features/feed/queries.ts`), drop the applied role from the `["feed"]` cache on success with `setQueryData`, as well as invalidating `["my-applications"]`. The details page relies on this too.

## Server changes

| Story | Change |
|---|---|
| F2-12 | `Project.repo_url` (`URLField`, blank) and `Project.details` (`TextField`, 2,000 characters, blank), with a migration. Both on `ProjectSerializer` and `ProjectDetailSerializer`. The serializer refuses a `repo_url` that isn't `https://github.com/...` with `repo_url_not_github`. |
| F1-15 | `Profile.github_url` and `Profile.linkedin_url` (`URLField`, blank), on `ProfileSerializer`, so they show on public profiles and in Review. Codes `github_url_invalid` and `linkedin_url_invalid`. |
| F1-16 | `Profile.resume` (`FileField`) on its own storage that isn't publicly readable, unlike `default`, which has `querystring_auth: False`. `ProfileSerializer` gets `has_resume` (a boolean), never the file's address. |
| F1-16 | `PUT /api/v1/me/profile/resume/` (multipart) and `DELETE` on the same path. Refuses files over 5 MB with `resume_too_big` and files that don't start with `%PDF-` with `resume_not_pdf`. Replacing or removing deletes the old file. |
| F1-16 | `GET /api/v1/profiles/<id>/resume/` streams the PDF with `Content-Type: application/pdf`, `Content-Disposition: inline`, `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`. `?download=1` sends it as an attachment. 403 for anyone who isn't the person or an owner of a project they applied to, 404 when there's no resume. |

Regenerate `backend/schema.yml` and `packages/api-client` in the same pull request as each change.

## Profile strength

`profileStrength` in `frontend/src/features/profiles/profile-tabs.tsx` becomes:

| Part | Today | Proposed |
|---|---|---|
| Major | 20 | 20 |
| Skills | 40 | 40 |
| Bio | 20 | 20 |
| Photo | 20, waiting on #13 | Not counted |
| GitHub | - | 5 |
| LinkedIn | - | 5 |
| Resume | - | 10 |

If photo upload ships too, the team picks new weights so the total stays at 100. Update [profile strength](../components/profile-strength.md) when this lands.

## Resume viewer

- Load `pdfjs-dist` with a dynamic import inside the viewer, so no other page pays for it. Bundle its worker; don't load it from a CDN.
- Fetch the file from `GET /api/v1/profiles/<id>/resume/` with the session cookie, then draw each page to a canvas in one scrolling column.
- Zoom goes from 50% to 200% in steps of 25%. The bar shows "1 of 2" for the page in view.
- Download links to the same address with `?download=1`, so it's permission checked too.
- 403 shows No access. A PDF.js error shows Won't display with Download instead.
- It works in a phone browser, a desktop browser and the installed app. Test the installed app on an iPhone, since it keeps its own cookies (see F2-08).

## Components

| Component | How it's used |
|---|---|
| `RoleCard` | Screen 47, now fixed height with clamped text. |
| `ActionButton` | Pass and Apply on screens 47 and 48. |
| `ProfileStrength` | Screen 51, with the new weights. |
| `buttonClasses`, `Chip` | As elsewhere. |
| New: link card | An icon, a title, the address and an arrow (↗ for a new tab, › for the viewer). Used on screens 48, 50, 51 and 52. Put it in `frontend/src/components/ui/link-card.tsx`. |

The GitHub, LinkedIn and file icons are inline SVGs with `aria-hidden="true"`. The text next to them names the link.

## Copy

| Where | Text |
|---|---|
| Card (47) | View details. Role, project, code and team. |
| Details back link (48) | Back to the deck |
| Repository field (49) | **GitHub repository (optional).** For software projects. Must be a github.com link. |
| Bad repository (49) | Enter a link that starts with https://github.com/ |
| More details field (49) | **More details (optional).** Counter: 0/2000. |
| Project and details pages (48, 50) | View the code, with the address under it. More from the owner. |
| Bad GitHub or LinkedIn (51) | Enter a link that starts with https://github.com/ (or https://linkedin.com/) |
| Resume, empty (51) | Add your resume. PDF, up to 5 MB. |
| Resume, added (51) | {file name}. Tap to read. Only owners you apply to can open it. Buttons: Replace, Remove. |
| Resume too big (51) | That file is over 5 MB. Choose a smaller PDF. |
| Not a PDF (51) | Only PDF files can be uploaded. |
| Viewer title (53) | {Name}'s resume |
| No access (53) | **You can't open this resume.** Only owners of projects {first name} applied to can read it. |
| Won't display (53) | **This file won't display here.** It may be damaged, or use something the viewer can't read. Button: Download instead. |

## Edge cases

| Case | What happens |
|---|---|
| The details page is opened from a link, not the deck | Back goes to Discover. |
| The role filled or closed while the details page was open | Apply shows the 409 message and the deck drops the card. |
| The project is my own, or I already applied | No Apply or Pass, as in #172. |
| An applied card comes back in a refetch | It can't: `useApply` removed it from `["feed"]`, and the server leaves it out (BR-02). |
| A decision fails | The card comes back with the error, as today. |
| The repository link is `http://` or has a different host | Refused on the server, shown on the field. |
| A file named `.pdf` that isn't a PDF | Refused, because the server checks the first bytes. |
| The person withdraws an application | The owner can still open the resume, since the person applied. Revisit if the team disagrees with DD-42. |
| The person removes their resume | Owners get 404 and see No access. |

## Keyboard and accessibility

- On the deck, ↑ and Enter open the details, ← and → still pass and apply. On the details page, Esc goes back.
- The card's View details row and every link card are at least 44px tall.
- Clamped text is only a summary: the full text is on the details page, and screen readers get the card's full text too.
- External links say "opens in a new tab" to screen readers.
- The viewer's page count uses `role="status"`, and zoom buttons have labels ("Zoom in", "Zoom out").
- Check both themes and the usual [UI review checklist](../process.md#ui-review-checklist) when building.

## Build order

1. UI-06: the deck changes. Nothing needed first.
2. F3-13: after UI-06, and after #172 (PR #208), which adds Apply to the project page.
3. F2-12: best before F3-13, so the details page has the repository from the start.
4. F1-15: on its own.
5. F1-16: after F1-15, since both change the profile form.
6. F1-17: after F1-16.

## Docs to update with the code

Change these in the pull request that ships the behaviour, and remove "Planned" from this page when the last one is in:

- `docs/architecture/api.md`: the new fields and resume endpoints under [Server changes](#server-changes)
- `docs/architecture/data-model.md`: the new `Project` and `Profile` fields
- `docs/design/patterns/swipe-deck.md`: the note and the fixed card height
- `docs/design/components/role-card.md`: the size and View details row
- `docs/design/components/profile-strength.md`: the new weights
