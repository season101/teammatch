# Sprint 3 report

> **DRAFT for Weibo (PL-11 owner) to review.** Facts below come from GitHub (board, issues, pull requests, releases) as of the evening of Nov 15. Anything marked `TODO(team)` needs the team's graded Google Sheet or a decision. Update the "In review" list before submitting.

Sprint 3 runs Nov 5–17, 2026 and is due at 2 pm on Tue Nov 17. Check-ins were Nov 9, Nov 12, Nov 15 and Nov 17. Dates below are Central time.

**Goal:** locked teams chat in real time, avatars upload, the app installs as a PWA, the feed ranks by skill fit with undo, and the golden path has an end-to-end test.

**Result:** TODO(team) fill in once the pull requests in review are merged or dropped. As of Nov 15: chat (F4-08, F4-09), the installable PWA (F2-08), skill-fit ranking (F3-04) and undo (F3-10) are on `main` and live. Avatar upload (F1-07) and the golden-path end-to-end test (PL-08) merged on the night of Nov 14–15; the extra e2e coverage is still in review.

| | |
|---|---|
| Stories closed | See [Done](#done); the board's Hrs Left is stale, so the hours are counted from board estimates (below) |
| Pull requests | 59 merged by the team (Dependabot excluded) since Nov 5, as of the evening of Nov 15: Sijan 53, Weibo 5, Shree 1 |
| Tests | TODO(team): backend and frontend counts and CI status on `main` at the last merge |
| Releases | v2.2.0 (Nov 7), v3.0.0 (Nov 12), v3.1.0 and v3.1.1 (Nov 15); v3.1.1 is live at https://teammatch.sijancodes.com |

## Burn-down

TODO(team): the chart comes from the team sheet's **Sprint 3 Burndown** tab. Export it as `docs/planning/sprint-3-burndown.svg`, then replace this line with an image link to it (as the Sprint 2 report does) and paste the numbers below. The image link is left out for now because the wiki sync fails on a link to a missing file.

| Date | Hours left | Ideal |
|---|---|---|
| TODO(team) | TODO(team) | TODO(team) |

Notes for whoever fills it in:

- The board holds only today's Hrs Left, not a daily history. Many closed issues still show their full hours left (for example F4-10: 4.5, UI-06: 3.5, F1-12: 3), so the board cannot be used as it stands. Rebuild from the day each issue closed, as in the [Sprint 2 report](sprint-2-report.md).
- The plan in [sprint-plan.md](sprint-plan.md) had Weibo, Shree and Sijan's slot D at 10 h each and Sijan's slot C at 8 h (18 h for Sijan in all). Stories were added during the sprint (the account-paths, commit-flow and redesign work), so the board's S3 total is higher than the plan. TODO(team): state the planned total used for the chart.

## Done

Merge dates are the pull request's merge day. The hours are the board estimate, not time logged.

| Story | Owner | Board hours | Done | Pull requests |
|---|---|---|---|---|
| F4-08 Team chat over WebSocket (#42) | Sijan | 6 | Nov 7 | #185, #187, #188, #189, #191, #192 |
| F4-09 Chat history and reconnect (#43) | Sijan | 2 | Nov 7 | #185, #193 |
| F3-11 See passed roles again (#194) | Sijan | 1 | Nov 7 | #195 |
| F4-10 Commit to one offer, API (#203) | Weibo | 4.5 | Nov 11 | #216 |
| F4-11 Commit to one offer, screens (#204) | Weibo | 2.5 | Nov 12 | #228 |
| UI-05 Team lock chat link (#206) | Sijan | 0.25 | Nov 11 | #219 |
| UI-06 Deck fits a phone (#207) | Sijan | 3.5 | Nov 11 | #217 |
| F3-10 Undo last pass (#34) | Sijan | 2 | Nov 13 | #232, #237 |
| F1-10 Reset a forgotten password (#135) | Weibo | 2 | Nov 14 | #198 |
| F1-12 Add Google or a password from Settings (#199) | Weibo | 3 | Nov 14 | #236, #238 |
| F1-14 Never-verified account can sign in with Google (#201) | Weibo | 1 | Nov 14 | #234 |
| Apply from the project page (#172) | Shree | 1.5 | Nov 14 | #208, #238 |
| PL-17 Speed quick wins (#205) | Weibo | 1.25 | Nov 14 | #235, #239 |

Those 13 issues add up to 30.5 board hours. F3-10 isn't assigned to an iteration on the board; the other twelve are S3.

Merged on `main` but the issue is still open on the board. TODO(team): confirm the acceptance criteria and close, or say what is missing.

| Story | Owner | Board hours | Pull requests |
|---|---|---|---|
| F3-04 Rank roles by skill overlap (#32) | Sijan | 2 | #226 |
| F2-07 Search by keyword and filter by skill (#24) | Shree | not in S3 on the board | #226, #230 |
| F2-08 Installable PWA (#23) | Shree | 3 | #227 (Sijan wrote it) |

Also done, not in the plan:

| Item | Owner | Done | Pull requests |
|---|---|---|---|
| v3.0.0 redesign: labelled nav with count badges, match badge and team progress on deck cards, shared empty states and skeletons, guided onboarding with team rules, error codes in API responses (DD-46) | Sijan | Nov 11–12 | #221 to #225, #229, #230 |
| Motion and UX review fixes: respond on press, animated exits, motion polish | Sijan | Nov 12 | #231, #233 |
| Docs for the new work: commit flow, account paths, deck details screens and build guides, DD-40, PWA install check | Sijan | Nov 7–11 | #196, #202, #215, #218, #220 |
| Chat fixes: forged cursor 404, non-members refused, `/ws` slash through Next, sockets kept open past the Redis timeout | Sijan | Nov 7 | #186, #187, #191, #192 |
| Sprint 2 report and burn-down (PL-11, #47) | Sijan | Nov 8 | #197 |

BUF-A3 (#15) and BUF-C3 (#35), the two 2 h buffers, were closed as not planned on Nov 9.

## Merged on the night of Nov 14–15

These merged after the Done table above was written. They are on `main` and not yet in a release tag: v3.1.1 is still the latest, so they ship with the next one. Hours are board estimates where the board has them. TODO(team): close the issues and set Done on the board.

| Story | Owner | Pull requests |
|---|---|---|
| F1-13 Offer a password to Google-only accounts at sign-in (#200), 1.5 h | Weibo | #246 |
| F1-07 Upload an avatar (#13), 4 h | Shree | #249 |
| F1-15 GitHub and LinkedIn on profiles (#212) | none on the board | #258 |
| F1-16 Upload a resume (#213) | none on the board | #254 |
| F1-17 Read a resume in the app (#214) | none on the board | #255 |
| F2-12 Repository link and more details on projects (#211) | none on the board | #244 |
| F3-13 Role details page (#210) | none on the board | #250 |
| PL-07 Admin moderation (#14), 2 h | Sijan | #256 |
| PL-08 Golden-path end-to-end test (#54), 4 h | Sijan | #248, #257, #263, plus accounts and ui coverage #264, #265 |

The pull requests were opened by Sijan, including the ones for Weibo's and Shree's stories; the Owner column is the board assignee. Also merged: fixes before the demo (#242 verifying your email signs you in, #243 sidebar, team and theme state, #245 and #247 Review keys, legends, focus and applicants with a spot elsewhere, #253 role skill cap, apply throttle and Redis cache, #259 term edges), ops safety (#252) and a certifi bump (#240).

### In review

Open pull requests, not merged: Playwright coverage for projects (#260), profiles (#261) and teams (#262). No deck coverage pull request is open yet. TODO(team): update this list if more test pull requests open or these merge before submitting.

## Not done yet

| Item | Status |
|---|---|
| F2-10 Responsive pass (#25) | Open, 3.25 h left on the board. TODO(team): confirm whether any of it landed in the redesign. |
| PL-06 Final release and deploy (#51) | Open, 1 h left. v3.1.1 is live; the work merged on Nov 14–15 is in no tag yet, so a final tag and deploy is still to come. |
| PL-09 Final README and docs (#55) | Draft in the pull request that carries this report; the README now lists the work merged on Nov 15. |
| PL-11 Burn chart and sprint report (#48) | This report is a draft. The chart still needs the sheet's numbers. |
| Board tidy | Hrs Left is stale on closed issues, and several merged items sit under "In review" or "Backlog". Fix it and mirror it to the sheet before submitting. |

## Retro

TODO(team): replace with what the team discussed. These points are from the board, pull requests and releases, not from a team discussion.

What went well:
- Chat, the PWA, undo, skill-fit ranking and the commit-to-one-offer flow all reached production, in four releases.
- Weibo's account work (password reset, Settings sign-in methods, the Google fix) and Shree's Apply-from-project merged on Nov 14 with a review each.
- Docs for the next build (commit flow, account paths, deck details) were written before the code.

What didn't:
- 37 of the 59 pull requests merged with no review from someone other than the author, all of them Sijan's (37 of Sijan's 53). All six of Weibo's and Shree's were reviewed. This is the same gap as Sprint 2, and it got bigger.
- 24 pull requests were over 400 changed lines (#185, #188, #189, #198, #215, #216, #221, #225, #226, #227, #228, #230, #231, #236, #244, #248, #249, #250, #254, #255, #256, #258, #259, #264), including generated client files.
- Merging was uneven: 21 of 59 on Nov 15 alone (after midnight) and 11 on Nov 12, and Shree's and Weibo's work mostly landed on Nov 14, three days before the deadline. Weibo's issues were closed on Nov 14, so the board spent most of the sprint showing them open.
- The board drifted from `main`: merged stories still in "In review" or "Ready", Hrs Left not updated, and F3-10 and F2-07 outside the sprint.
- Avatar upload, the profile and project details work and PL-08 all merged in the last night, two days before the deadline, rather than spread across the sprint. PL-14 was dropped in favour of PL-08.

