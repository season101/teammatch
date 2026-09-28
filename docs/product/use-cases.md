# TeamMatch - Use Cases

Business rules (BR-xx) are defined in [prd.md](prd.md#7-business-rules). Backlog stories are in [backlog.md](backlog.md).

| ID | Use case | Primary actor | Epic | Stories |
|---|---|---|---|---|
| UC-01 | Sign up with email | Candidate / Owner | F1 | F1-01, F1-02 |
| UC-02 | Sign in with Google | Candidate / Owner | F1 | F1-05 |
| UC-03 | Reject disallowed email domain | System | F1 | F1-06 |
| UC-04 | Edit profile, skills, avatar | Candidate / Owner | F1 | F1-03, F1-04, F1-07 |
| UC-05 | Create project with roles | Owner | F2 | F2-01, F2-02 |
| UC-06 | Browse and search projects | Candidate | F2 | F2-03, F2-04, F2-07 |
| UC-07 | Swipe right to apply | Candidate | F3 | F3-02, F3-03, F3-04, F3-10 |
| UC-08 | Swipe left to pass | Candidate | F3 | F3-05, F3-10 |
| UC-09 | Withdraw application | Candidate | F3 | F3-06 |
| UC-10 | Review applicants (like / pass) | Owner | F4 | F4-01, F4-02, F4-04, F4-05 |
| UC-11 | Team auto-lock, auto-withdraw, retire | System | F4 | F4-03, F4-05, F4-07, F1-08 |
| UC-12 | Team chat | Team member | F4 | F4-08, F4-09 |
| UC-13 | Delete unfillable role | Owner | F2 | F2-06 |
| UC-14 | Moderate content | Admin | Platform | PL-07 |

---

## UC-01 Sign up with email

- **Actor:** Candidate or Owner (new user)
- **Preconditions:** User is not signed in. Email is not already registered.
- **Main flow:**
  1. User opens the sign-up page and enters email and password.
  2. System checks the email domain (UC-03).
  3. System checks password strength and creates the account.
  4. System sends a verification email.
  5. User clicks the link; account is verified and user is signed in.
  6. System sends user to profile setup (UC-04).
- **Alternate flows:**
  - 2a. Domain not allowed: see UC-03.
  - 3a. Email already registered: show "account exists, sign in instead" without revealing more.
  - 3b. Weak password: show the password rules and stay on the form.
  - 5a. Link expired: user can request a new verification email.
- **Postconditions:** `User` and empty `Profile` exist; user has a session.

## UC-02 Sign in with Google

- **Actor:** Candidate or Owner
- **Preconditions:** Google provider is configured. User is not signed in.
- **Main flow:**
  1. User clicks "Continue with Google".
  2. System redirects to Google; user picks an account and consents.
  3. Google redirects back with the user's verified email.
  4. System checks the email domain (UC-03).
  5. If no account exists, system creates `User` + `Profile`; if one exists with the same verified email, it links the Google account.
  6. User is signed in and sent to the feed (or profile setup if the profile is empty).
- **Alternate flows:**
  - 2a. User cancels at Google: return to sign-in page with a short message.
  - 4a. Domain not allowed: see UC-03.
- **Postconditions:** User has a session; Google account is linked.

## UC-03 Reject disallowed email domain

- **Actor:** System (triggered by UC-01, UC-02)
- **Preconditions:** `ALLOWED_EMAIL_DOMAINS` is set.
- **Main flow:**
  1. System reads the domain part of the email, lowercased.
  2. Domain is not in the allowlist.
  3. System rejects the sign-up or sign-in and shows "TeamMatch is only open to accounts from: latech.edu".
- **Alternate flows:**
  - 2a. Domain is allowed: continue the calling use case.
  - 1a. Allowlist empty: all domains allowed (local dev only; prod requires it set).
- **Postconditions:** No account or session is created for a rejected email.

## UC-04 Edit profile, skills, avatar

- **Actor:** Signed-in user
- **Preconditions:** User is signed in.
- **Main flow:**
  1. User opens "My profile".
  2. User edits display name, bio, and major.
  3. User picks skills from the shared skill list.
  4. User uploads an avatar: the client sends the image to the API, which checks it and saves it to storage. (Presigned direct uploads are future.)
  5. System saves and shows the updated profile.
- **Alternate flows:**
  - 4a. File is not an image or is over 2 MB: rejected by the API.
  - 4b. Upload fails: profile keeps the old avatar; user can retry.
  - 3a. Skill not in list: user can't add it (admin manages skills).
- **Postconditions:** Profile and skills updated. Skill changes affect feed ranking right away.

## UC-05 Create project with roles

- **Actor:** Owner
- **Preconditions:** Signed in, not retired, an active term exists.
- **Main flow:**
  1. Owner clicks "New project" and enters title and pitch.
  2. System saves the project as `draft` in the current term.
  3. Owner adds one or more roles, each with title, description, and required skills.
  4. Owner clicks "Publish".
  5. System sets status to `open`; roles appear in candidates' feeds.
- **Alternate flows:**
  - 4a. Project has no roles: publish is blocked (BR-06).
  - 1a. Missing title or pitch: validation errors shown.
  - 3a. Owner removes a role while still in draft: role is deleted.
- **Postconditions:** Project is `open` with at least one `open` role.

## UC-06 Browse and search projects

- **Actor:** Candidate
- **Preconditions:** Signed in.
- **Main flow:**
  1. Candidate opens "Projects".
  2. System lists open projects in the current term with their open roles.
  3. Candidate types a keyword and/or picks skills to filter.
  4. System returns matching projects, paginated.
  5. Candidate opens a project to see the pitch, owner, and each role.
- **Alternate flows:**
  - 4a. No results: show an empty state with a "clear filters" link.
  - 5a. Project locked since the list loaded: show it as locked, no apply buttons.
- **Postconditions:** None (read only).

## UC-07 Swipe right to apply

- **Actor:** Candidate
- **Preconditions:** Signed in, not retired, profile has at least one skill.
- **Main flow:**
  1. Candidate opens the feed.
  2. System shows a deck of open role cards the candidate has not applied to or passed, not on their own projects, ranked by skill overlap.
  3. Candidate swipes right (or presses the Apply button / right arrow).
  4. System shows an optional note field; candidate adds a note or skips.
  5. System creates a `pending` application; it shows in the owner's applicant list. (Live notification to the owner is future, F3-07.)
  6. Next card is shown.
- **Alternate flows:**
  - 5a. Already applied (race or double tap): system returns the existing application, no duplicate (BR-02).
  - 5b. Role was filled or project locked meanwhile: show "this role was just filled", skip the card.
  - 5c. Candidate is the owner: role never appears (BR-04); API rejects if called directly.
  - 2a. Deck empty: show "you're all caught up" and a link to browse.
- **Postconditions:** One `Application(pending)` for (candidate, role).

## UC-08 Swipe left to pass

- **Actor:** Candidate
- **Preconditions:** Signed in, feed showing a role card.
- **Main flow:**
  1. Candidate swipes left (or presses Pass / left arrow).
  2. System stores a `RoleDismissal` for (candidate, role).
  3. Next card is shown.
- **Alternate flows:**
  - 1a. Candidate taps "Undo" in the same session: dismissal removed, card returns (F3-10).
- **Postconditions:** Role no longer appears in the candidate's deck. Owner is not notified (BR-10).

## UC-09 Withdraw application

- **Actor:** Candidate
- **Preconditions:** Candidate has a `pending` application.
- **Main flow:**
  1. Candidate opens "My applications".
  2. Candidate clicks "Withdraw" on a pending application and confirms.
  3. System sets status to `withdrawn`; it disappears from the owner's queue.
- **Alternate flows:**
  - 2a. Application already liked: withdraw button not shown; API rejects (BR-11).
  - 2b. Application already passed or withdrawn: nothing to do.
- **Postconditions:** Application is `withdrawn`. The candidate cannot re-apply to the same role (BR-02).

## UC-10 Review applicants (like / pass)

- **Actor:** Owner
- **Preconditions:** Owner has an `open` project with at least one pending application.
- **Main flow:**
  1. Owner opens the review queue and picks a role.
  2. System shows pending applicants one at a time: name, avatar, major, skills (with matches highlighted), note.
  3. Owner likes an applicant.
  4. System sets the application to `liked`, sets the role to `filled` with `filled_by`, and sets the other pending applications for that role to `passed`.
  5. System runs the team-lock check (UC-11).
  6. Applicant sees the application as `liked` in My applications. (Live notification is future, F3-07.)
- **Alternate flows:**
  - 3a. Owner passes: application set to `passed`, next applicant shown.
  - 4a. Applicant got retired by another team a moment ago: like rejected with "this person just joined another team"; applicant removed from queue.
  - 2a. No pending applicants for the role: empty state.
- **Postconditions:** Role filled or applicant passed. Lock check has run.

## UC-11 Team auto-lock, auto-withdraw, retire

- **Actor:** System (triggered by UC-10 like, or UC-13 role delete)
- **Preconditions:** A role on an `open` project just changed.
- **Main flow:**
  1. In one transaction, system locks the project row and checks that every role is `filled`.
  2. System sets the project to `locked`, creates a `Team` and a `Membership` for the owner and each `filled_by` user.
  3. For each member, system sets all other `pending` applications in the term to `withdrawn` (BR-08).
  4. For each member, system sets `profile.retired_until = term.end`.
  5. System opens the team chat room; members see the team on their next page load. (Live "team formed" notification is future, F3-07.)
- **Alternate flows:**
  - 1a. Some roles still open: nothing happens.
  - 1b. Two likes commit at the same time: the row lock makes the second one see the updated state; only one `Team` is created.
- **Postconditions:** Project `locked`, `Team` exists, members retired, no pending applications left for members.

## UC-12 Team chat

- **Actor:** Team member
- **Preconditions:** Signed in, member of a locked team.
- **Main flow:**
  1. Member opens the team page.
  2. Client loads recent message history over HTTP and opens a WebSocket to the team room.
  3. Server checks the session and team membership on connect.
  4. Member sends a message; server saves it and broadcasts it to everyone connected.
  5. Other members see it without refreshing.
- **Alternate flows:**
  - 3a. Not a member: connection refused (BR-12).
  - 4a. Empty or too-long message (over 2000 characters): rejected.
  - 2a. Connection drops: client reconnects with backoff and reloads missed messages.
- **Postconditions:** `ChatMessage` stored and delivered.

## UC-13 Delete unfillable role

- **Actor:** Owner
- **Preconditions:** Owner's project is `open` and the role is `open`.
- **Main flow:**
  1. Owner opens the project and clicks "Delete role" on an open role, then confirms.
  2. System sets pending applications for that role to `withdrawn` (applicants see it in My applications; live notification is future, F3-07).
  3. System deletes the role.
  4. System runs the team-lock check (UC-11).
- **Alternate flows:**
  - 1a. Role already filled: delete not allowed.
  - 3a. It was the only role and nothing is filled: project goes back to `draft`.
- **Postconditions:** Role gone; project may be locked.

## UC-14 Moderate content

- **Actor:** Admin
- **Preconditions:** Admin has staff access to Django admin.
- **Main flow:**
  1. Admin signs in to `/admin`.
  2. Admin searches users, projects, or messages.
  3. Admin archives an inappropriate project or deactivates a user.
  4. Admin manages the skill list and terms.
- **Alternate flows:**
  - 3a. Deactivated user is in a locked team: team stays, user can no longer sign in.
- **Postconditions:** Content hidden from the app; action recorded in the admin log.
