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

The legend at the bottom shows these keys while the queue is on the stage.

## What happens on Like
1. The application becomes an offer. The role stays open, and you can like more than one person for it.
2. A status line: "Offer sent to Riley Chen. The role stays open until someone commits." The queue moves to the next applicant.
3. Riley shows under **Offers out**, below the card, as Waiting.

## What happens when someone commits
1. The role is filled by the first person to commit, and its tab gets a tick.
2. The role shows "Riley Chen committed", and the other people on it as Closed or Declined.
3. **If that was the last open role,** the team locks. Every member's other applications and offers are withdrawn, every member is benched until the term ends, and team chat opens ([feedback-states.md](feedback-states.md#its-a-team)).

See the [commit flow](commit-flow.md).

## Empty role
"No one's waiting for UI Designer." The CTA is Edit role. A ghost link, Delete role, opens a confirmation ([confirmations.md](confirmations.md)). Deleting the last open role locks the team with the people already in.
