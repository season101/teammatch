# ADR 0007: Google sign-in trusts only LA Tech's Google Workspace

- Status: Accepted
- Date: 2026-10-25
- Refines: [ADR 0002](0002-allauth-headless-auth.md)

## Context

ADR 0002 chose allauth with Google as a social provider, behind an email domain allowlist. Checking LA Tech's domains on 2026-10-23 showed two kinds of school address. Students' @email.latech.edu is LA Tech's Google Workspace, signed in through LA Tech's CAS. Staff @latech.edu isn't on Google at all. Anyone can make a personal Google account with a @latech.edu address, and Google checks that address only once, when the account is made. Google says it vouches for an address only when the ID token has `hd` set and `email_verified` true, or the address is Gmail.

## Decision

- Accept a Google sign-in only when the ID token's `hd` is `email.latech.edu` and `email_verified` is true. Then apply `ALLOWED_EMAIL_DOMAINS` as for any sign-in.
- Staff (@latech.edu) use email and password, with our verification email.
- A Google sign-in with the same verified email as an existing account signs in to that account and links Google (allauth email authentication with auto-connect).
- Send `hd=email.latech.edu` in the sign-in request so students go straight to LA Tech's login. It is a hint only; the token decides.

## Consequences

- LA Tech decides who has a Google account, its password and Duo. Graduates lose Google sign-in.
- LA Tech can block the app for some accounts, for example under-18 students. They use email signup.
- Linking by email is safe because Google vouches for these addresses. allauth also wipes the password of an unverified account it links, so someone who registered a student's address first loses access.
- The required `hd` lives in settings, so another school changes a setting, not code.
- How it works and how to fix it: [Google Sign-In](../google-sign-in.md).

## Alternatives considered

- **Any Google account with an allowed email domain:** lets in personal Google accounts on @latech.edu, whose mailbox Google doesn't control.
- **Personal Google accounts plus our own verification email:** works, but adds a step for the few staff who can already use a password.
- **Sign in with Microsoft:** both domains are in LA Tech's Microsoft tenant, but university tenants usually need admin approval for apps. Untested, and a second provider for a class project.
- **LA Tech's CAS directly:** LA Tech IT would have to register TeamMatch as a CAS or SAML service.
