# Confirmations

When to stop and ask, and how. The component is [Modal](../components/modal.md).

## Ask only when
- The action can't be undone, or
- It affects someone else (an owner, a teammate).

Everything else just happens, with a toast or an Undo.

## How to write one
| Part | Rule | Example |
|---|---|---|
| Title | A question about the action | "Withdraw your application?" |
| Body | The consequence, in one or two lines | "The owner of CampusEats won't see you for Backend Developer anymore." |
| CTA | The safe choice | "Keep my application" |
| Escape | The risky choice, as danger text | "Withdraw" |

## The confirmations we have
| Action | Title | Body | CTA | Escape |
|---|---|---|---|---|
| Withdraw an application | Withdraw your application? | The owner won't see you for this role anymore. You can't apply to it again. | Keep my application | Withdraw |
| Delete a role | Delete this role? | Applicants waiting on it won't be considered. If it was the last open role, your team locks. | Keep role | Delete role |
| Leave unsaved changes | Leave without saving? | Your changes to this project will be lost. | Keep editing | Leave |
| Commit to an offer | Commit to CampusEats? | You take the Backend Developer seat. Your 2 other offers and 1 pending application close, and you can't undo this. | Commit to CampusEats | Keep my options (ghost, gets focus first) |
| Decline an offer | Decline this offer? | Olive can offer Backend Developer to someone else. You can't get this offer back. | Keep this offer | Decline |
| Commit while owning an open project | Close your project first? | You own Trail Finder, which is still open. You can only hold one spot this term, so close it before you commit to CampusEats. | Keep this offer | Go to Trail Finder (ghost link) |
| Log out | Log out of TeamMatch? | You can sign back in with the same email. | Log out | Cancel (ghost) |

Only pending applications show Withdraw. An offer is declined instead, and a committed seat can't be undone. The commit dialog is the one confirmation whose CTA is the risky choice ([DD-34](../decisions.md)).
