# ApplicantCard

The card an owner sees in a role's review queue: one candidate for one role. **Status: specced, not built.**

## Size and placement
Same frame as the [RoleCard](role-card.md): 3:4.6, `rounded-card`, 380 × 640 on desktop, full width on phone. It's centred on the stage under the review queue's role tabs.

## Anatomy
1. **Header band** (`surface-2`, not a project cover):
   - A 56px avatar, or the person's initials on a cover colour.
   - Name (Geist 24px semibold).
   - Major (muted).
2. **Fit line:** a [MatchBadge](match-badge.md) with its basis ("75% match · 3 of 4 skills") and a small profile strength figure ("Profile 80%").
3. **Skills:** chips, with the ones this role needs shown as matched, first.
4. **Note:** the application note in quotes, if there is one. If not, a muted "No note."
5. **Bio:** up to 4 lines, then "More".
6. **Action bar:** Pass (←), Details (↑, the full profile), Like (→). No undo.

## Behaviour
- **Queue order:** match %, then the oldest application first.
- **Like** fills the role. The card flies right, and a toast says "Backend Developer filled. 2 roles to go." If that was the last role, the "It's a Team!" screen opens ([patterns/feedback-states.md](../patterns/feedback-states.md#its-a-team)).
- **Pass** sets the application to passed and shows the next applicant.
- **When a role fills,** its other pending applicants become passed.
- **Benched candidates never appear.** If someone joins another team while the owner is looking, Like fails with "This person just joined another team." and the card moves on.

## Accessibility
- The region is labelled "Applicant Sam Student for Backend Developer, 75% match".
- Buttons read "Like Sam Student for Backend Developer" and "Pass on Sam Student".

## Do and don't
- **Do** lead with skills and the note, because that's what the owner decides on.
- **Don't** show photos larger than the avatar.
- **Don't** show anything about looks.
