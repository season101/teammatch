# Review queue

How an owner decides on applicants, one role at a time. It uses the [ApplicantCard](../components/applicant-card.md).

## Where it lives
| Screen size | Where |
|---|---|
| Phone | The **Review** tab. A project switcher at the top, role tabs under it. |
| Desktop | **Projects → Mine** in the sidebar. Pick a role, and its queue opens on the stage. |

## Layout
- **Role tabs** across the top ([Tabs](../components/tabs.md)), each with a count: "Mobile 3", "UI designer 0", "Backend ✓".
- **A line above the card** says where you are: "Mobile developer · 1 of 3 waiting".
- **The card:** one ApplicantCard, centred, with Pass · Details · Like.

## Order
Match % first, then the oldest application. Benched candidates are never shown.

## Keys (desktop)
| Key | Action |
|---|---|
| ← | Pass |
| → | Like |
| ↑ / ↓ | Open / close the full profile |
| Space | Next section of the profile |
| Esc | Close the panel |

The legend at the bottom shows these keys while the queue is on the stage, but only the ones that work: ← and → today. ↑, ↓, Space and Esc join it with the Details panel, which isn't built yet.

The keys follow Settings → Keyboard shortcuts. They never fire while typing, on a role tab or behind a dialog, and a held key decides once.

## What happens on Like
1. The application becomes an offer. The role stays open, and you can like more than one person for it.
2. A status line: "Offer sent to Riley Chen. The role stays open until someone commits." The queue moves to the next applicant.
3. Riley shows under **Offers out**, below the card, as Waiting.

## Like and Pass don't wait for the server
- The card leaves on the press: a like drops toward Offers out, a pass slides left, both in `exit`. The next applicant comes in at the same time, and the buttons and keys stay live.
- If the server refuses (the applicant was already decided), the card and the Offers out list go back to how they were, and the reason shows above the card.
- A second press within 250ms of a decision is ignored. It's a double tap, not a choice about the next person.

## Someone with a spot elsewhere
An applicant who holds a seat on another open project this term (`committed_elsewhere`) stays in the queue with a grey avatar and a "Has a spot elsewhere" tag. Their details keep full contrast, so only the avatar greys out. Like and → are off, and the Like button says why to screen readers. Pass still works. Owning an open project doesn't count: they can still be liked ([DD-33](../decisions.md)).

## What happens when someone commits
1. The role is filled by the first person to commit, and its tab gets a tick.
2. The role shows "Riley Chen committed", and the other people on it as Closed or Declined.
3. **If that was the last open role,** the team locks. Every member's other applications and offers are withdrawn, every member is benched until the term ends, and team chat opens ([feedback-states.md](feedback-states.md#its-a-team)).

See the [commit flow](commit-flow.md).

## Empty role
"No one's waiting for UI Designer." The CTA is Edit role. A ghost link, Delete role, opens a confirmation ([confirmations.md](confirmations.md)). Deleting the last open role locks the team with the people already in.
