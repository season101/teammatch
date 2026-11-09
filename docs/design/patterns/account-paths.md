# Account paths

**Planned, not built yet.** This is the guide for [F1-10](../../product/backlog.md#f1-10-reset-a-forgotten-password), [F1-12](../../product/backlog.md#f1-12-add-google-or-a-password-from-settings), [F1-13](../../product/backlog.md#f1-13-offer-a-password-to-google-only-accounts-at-sign-in) and [F1-14](../../product/backlog.md#f1-14-never-verified-account-can-sign-in-with-google). F1-10 is in review.

Someone who starts with email and password can add Google. Someone who starts with Google can add a password. Either one can reset a password they forgot.

Screens are numbered 35 to 46 in [screens/README.md](../screens/README.md#account-paths-planned), and the full journey is [flow 5](../screens/flows.md#5-planned-adding-a-way-to-sign-in).

## The rules

| Rule | What it means |
|---|---|
| One email, one account | `ACCOUNT_UNIQUE_EMAIL`, as today. A second way to sign in never makes a second account. |
| School emails only | BR-01 applies on every form. A non-school email gets the domain message, not "Check your inbox". |
| Signed out, a password goes through email | Opening the emailed link proves the person owns the inbox. |
| Signed in, a password doesn't | Settings saves it directly, with no current password and no link. |
| Connect needs the same email | The Google account's email has to match the TeamMatch email ([DD-36](../decisions.md)). |
| Google is for students | `@latech.edu` staff aren't on Google, so they don't get a Connect button. |
| One sign-in exception | An account with Google and no password gets a prompt instead of the single error ([DD-37](../decisions.md)). |
| Never verified, then Google | Google proves the inbox, so the person is signed in and the email is verified. The old password is still wiped ([DD-38](../decisions.md)). |

## Account states

| Account | `has_usable_password` | Google in `account/providers` | Signs in with | Settings shows |
|---|---|---|---|---|
| Email | true | no | Email and password | Screen 42 |
| Google | false | yes | Google | Screen 43 |
| Both | true | yes | Either | Screen 45 |
| Staff (`@latech.edu`) | true | no | Email and password | Screen 42, no Connect button |

## What to build, screen by screen

| # | Screen | Where | What changes | Code | Story |
|---|---|---|---|---|---|
| 35 | Forgot password? link | `/login` | Link under the password field, 44px tall. | `frontend/src/features/accounts/sign-in-form.tsx` | F1-10 |
| 36 | Forgot password | `/reset-password` | Email form. | `forgot-password-form.tsx` | F1-10 |
| 37 | Check your inbox | `/reset-password` | Same screen for every school email. | `forgot-password-form.tsx` | F1-10 |
| 38 | Set a password | `/reset-password/<key>` | Checks the key on load, then asks for the password. | `reset-password-form.tsx` | F1-10 |
| 39 | Password saved | `/reset-password/<key>` | Points to sign in. | `reset-password-form.tsx` | F1-10 |
| 40 | Link expired | `/reset-password/<key>` | Offers a new link. | `reset-password-form.tsx` | F1-10 |
| 41 | Google-only prompt | `/login` | Replaces the error when the server answers `google_only_account`. Set a password runs the same request as screen 36, then shows screen 37. | `sign-in-form.tsx`, `backend/apps/accounts/adapter.py` | F1-13 |
| 42 | Ways to sign in, email account | `/settings` | New section under the title. Connect starts the Google redirect. | `frontend/src/app/(app)/settings/page.tsx`, `allauth.ts` | F1-12 |
| 43 | Ways to sign in, Google account | `/settings` | Same section. Set a password opens screen 44. | `settings/page.tsx` | F1-12 |
| 44 | Set a password in Settings | `/settings` | Inline form. | `settings/page.tsx` | F1-12 |
| 45 | Both ways on | `/settings` | Same section, after a save or a connect. | `settings/page.tsx` | F1-12 |
| 46 | Can't connect that account | `/settings` | Alert above the section, from `?error=` on the way back. | `settings/page.tsx`, `backend/apps/accounts/adapter.py` | F1-12 |

## Server calls

All of these sit under `/_allauth/browser/v1/` and go in `frontend/src/features/accounts/allauth.ts`.

| Action | Call | Answer |
|---|---|---|
| Who's signed in, has a password | `GET auth/session` | `data.user.has_usable_password` |
| Is Google linked | `GET account/providers` | A list, with `provider.id` of `google` |
| Send the link | `POST auth/password/request` with `email` | 200 for any school email, 400 `email_domain_not_allowed` otherwise |
| Check the key | `GET auth/password/reset` with an `X-Password-Reset-Key` header | 200 good, 400 expired or used |
| Save with the key | `POST auth/password/reset` with `key` and `password` | 401 means it worked: a reset doesn't sign you in |
| Save while signed in | `POST account/password/change` with `new_password` | 200, still signed in |
| Connect Google | Form POST to `auth/provider/redirect` with `process: "connect"` and `callback_url: "/settings"` | Back to `/settings`, with `?error=<code>` if refused |

New on the server:

- F1-12: in `SocialAccountAdapter.pre_social_login`, when `sociallogin.state["process"]` is `connect`, refuse a Google email that isn't the signed-in user's, with `google_email_mismatch`.
- F1-13: in `AccountAdapter.authenticate`, when the sign-in failed and the account has Google and no password, raise `google_only_account`.
- F1-14: mark the address verified after allauth's password wipe, for example on the `social_account_added` signal. `pre_social_login` runs before the wipe, and the wipe skips a verified address.

## Components

Reuse what's there. Nothing new is needed.

| Component | How it's used |
|---|---|
| `AuthLayout`, `StatusIcon` | Screens 35 to 41, like the sign-up and verify pages. |
| `buttonClasses` | `cta` for the one main action, `secondary` for Connect and Set a password, `ghost` for text buttons. |
| `card`, `sectionHeading` | Screens 42 to 46. Both are already in `settings/page.tsx`. |

## Copy

| Where | Text |
|---|---|
| Forgot password (36) | **Forgot your password?** Or signed up with Google and want one? We'll email you a link. Button: Send link. |
| Check your inbox (37) | We sent an email to {email} with the next step. |
| Set a password (38) | **Set a password.** You'll use it with your school email. If you signed up with Google, that keeps working too. |
| Password saved (39) | **Password saved.** Sign in with your school email and new password. If you use Google, that still works. Button: Go to sign in. |
| Link expired (40) | **This link has expired.** Each link works once. Send yourself a new one. Button: Send a new link. |
| Google-only prompt (41) | This email signs in with Google. Want to set a password too? Button: Set a password. |
| Ways to sign in (42 to 45) | Rows: Email and password, Google. States: On, Connected, Not set up, Not connected. |
| Set a password in Settings (44) | Sign in with {email} and this password. Google keeps working. |
| Can't connect (46) | That Google account uses a different email. Use the one for {email}. |
| Expired verification link | Say to sign in to get a new one, and link to `/login` (F1-14). |

Two emails need their own text in `backend/templates/account/email/`, extending `base_message.txt`. `password_reset_key_message.txt` covers a forgotten password and a Google account adding one. `account_already_exists_message.txt` covers someone who already has an account, including through Google. Both link to `{{ password_reset_url }}`.

## Edge cases

| Case | What happens |
|---|---|
| A school email with no account | Screen 37 as usual. The server emails a link to sign up. |
| The key check can't run (500, 429, no network) | Show the form and let the save decide. Only a 400 means expired. |
| The key expires while the page is open | The save returns a `key` error, so show screen 40. |
| A reset on an unverified email | The reset doesn't verify it. Signing in then sends a new verification link. |
| Wrong password, or an email with no account | The single "Email or password is incorrect." (F1-02) |
| No password and no Google link | The same single message. |
| A Google account already on another TeamMatch account | `?error=connected_other`. Nothing links. |
| A Google account that isn't a school account | `?error=google_account_not_allowed`. Nothing links. |
| Never verified, then Connect from Settings | Can't happen: an unverified account can't sign in to reach Settings. |

## Keyboard and accessibility

- Enter submits every form, and Tab reaches every control with a visible focus ring.
- Standalone links and buttons are at least 44px tall. Links inside a sentence are exempt.
- Errors use `role="alert"`, and the Check your inbox text uses `role="status"`.
- The screens are drawn in dark at phone width. Check both themes and the usual [UI review checklist](../process.md#ui-review-checklist) when building.

## Build order

1. F1-10: finish the reset pages and the two emails.
2. F1-14: small and separate. It can go any time.
3. F1-12: the Settings section, Set a password, then Connect with the same-email check.
4. F1-13: needs F1-10's pages.

## Docs to update with the code

Change these in the pull request that ships the behaviour, and remove "Planned" from this page when the last one is in:

- `docs/architecture/api.md`: the new calls under [Server calls](#server-calls)
- `docs/architecture/flows.md`: `process: "connect"` in part 2
- `docs/architecture/google-sign-in.md`: the table under "Password and Google on one account"
- `docs/product/use-cases.md`: UC-02
- `docs/product/prd.md`: section 5, next to the F1-09 deferral
