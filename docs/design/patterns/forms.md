# Forms and onboarding

Sign-up, profile setup and project creation. Fields follow [form-fields.md](../components/form-fields.md).

## Onboarding order
1. **Sign up** with an email from an allowed domain, or Google.
   - A wrong domain shows inline: "Use your @latech.edu or @email.latech.edu email."
2. **Verify email** (email sign-ups only).
   - "Check your inbox" screen with a resend link.
   - Links last 3 days. An expired link says so and offers a new one.
3. **Team rules** (everyone, including Google sign-ups). Four short rules, then "I agree":
   - Be honest about your skills.
   - Show up.
   - Respect people's time.
   - Speak up early.
4. **Profile setup:**
   - Required: name, major and at least one skill.
   - Optional: bio and avatar.
5. **First deck** with coach marks ([swipe-deck.md](swipe-deck.md#first-visit)).

## Phone vs desktop
| | Phone | Desktop |
|---|---|---|
| Structure | One question per screen | One page, two columns |
| Title | First-person sentence start: "My major is", "I'm good at" | "Set up your profile" |
| Progress | Thin bar at the top, plus a back chevron | None needed |
| Optional fields | Their own screens, with "Skip" until something is entered | Under an **Optional** divider |
| CTA | Full-width at the bottom, disabled until valid | At the end of the form, disabled until the required fields are valid |

On desktop the left column holds the fields and the right column the avatar and a live preview of how owners will see you.

## Skill picker
- A search field above a grid of pill chips. Selected chips use the `selected` variant.
- The CTA counts picks: "Continue · 3 skills".
- Popular skills for the term show first.

## Project creation
1. **Title and pitch.** Title up to 100 characters, pitch up to 2,000, each with a counter.
2. **Roles:**
   - Each role has a title, a description and required skills.
   - At least one role is needed before the project can open.
   - Roles are reordered by drag or with Space plus the arrow keys.
3. **Review and open.**
   - A project with no roles can't be opened, and the CTA explains why.
   - An owner with an open project can still start one as a draft; a note under "New project" says it can't be published until the open one is closed or locks.

## Validation
- Validate a field when it loses focus, and everything on submit.
- Errors show inline under the field, in `pass`, and say how to fix it.
- On submit with errors, move focus to the first invalid field.
- Leaving a form with unsaved changes asks first ([confirmations.md](confirmations.md)).
