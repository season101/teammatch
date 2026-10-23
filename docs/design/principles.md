# Principles

These are the tie-breakers. When two options both look fine, pick the one that follows these better.

## 1. One decision at a time
Each screen asks for one thing: apply or pass, like or pass, continue or skip. Everything else on the screen is quieter. On desktop, the role card stays phone-sized in the middle of a dark stage. The empty space around it keeps the eye on the decision.

## 2. Show the team filling up
The payoff in TeamMatch is a whole team locking, not one match. Every card, list row and notification that mentions a project says how close it is ("3 of 5 roles filled"). The team strip on each card does this at a glance.

## 3. Big moments get big; everything else stays calm
Fraunces display type and the spark gradient are kept for the landing hero, screen titles, role titles and the "It's a Team!" celebration. Everyday UI is Geist on dark surfaces. If everything is loud, nothing is.

## 4. Fast hands, fewer clicks
Swipe on touch, arrow keys on desktop, and a legend on screen that teaches the keys. Undoing a pass is one tap away. Forms ask only for what we use.

## 5. The safe choice is the primary button
When an action can't be undone (withdraw an application, delete a role), the button that keeps things as they are gets the CTA style. The destructive choice is red text. The one exception is logout: logging out isn't destructive, so Log out is the CTA there.

## 6. Explain the consequence, not the field
Helper text says what happens next: "Your skills decide which roles you see first." "Your name is shown to project owners." Labels say what a field is; helper text says why it matters.

## 7. Colour is earned
Each colour has one job:
- Lime means yes, apply, filled or progress.
- Rose means pass, error or destructive.
- Violet marks where you are: focus, the active tab, the current selection.
- White or ink marks the one action to take next.

If a colour means two things, it means nothing.

## Voice and wording

Short, warm and a little playful. Never mean, never guilt-tripping, never about how people look.

- **Sentence case everywhere.** Title case only for names ("CampusEats", "Fall 2026").
- **Buttons are verbs:** "Apply", "Send application", "Open team chat", "Delete role".
- **Numbers beat adjectives:** "86% match", "2 roles to go", "Benched until Dec 12".
- **Errors say how to fix it:** "Use your @latech.edu email to sign up." not "Invalid email".
- **Celebrate the team, not the person:** "It's a Team!", not "You matched!"
- **Talk to one person:** "you" and "your", never "the user".
- **No exclamation marks** except in "It's a Team!" and the welcome screen.

## Words we use

Use these terms in UI copy, code names and docs, so everyone means the same thing.

| Term | Meaning | Don't say |
|---|---|---|
| Project | An idea an owner posts, with roles to fill | Post, listing |
| Role | One seat on a project, with required skills ("Backend Developer") | Job, position |
| Owner | The student who posted the project | Creator, admin |
| Candidate | A student applying to roles | Applicant (except on the owner's review screen) |
| Apply / Pass | The candidate's two choices on a role card | Like / Nope (for candidates) |
| Like / Pass | The owner's two choices on an applicant | Accept / Reject |
| Filled | A role with a mutual like (stored as application status `liked`) | Matched, taken |
| Team locks | Every role is filled, so the project becomes a team | Completes, closes |
| Benched | Locked into a team until the term ends, so out of other decks | Retired (that's the data field `retired_until`) |
| Match % | Share of the role's required skills the candidate has | Score, compatibility |
