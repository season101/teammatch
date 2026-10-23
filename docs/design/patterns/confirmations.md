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
| Log out | Log out of TeamMatch? | You can sign back in with the same email. | Log out | Cancel (ghost) |

Filled applications can't be withdrawn, so the Withdraw action doesn't show on them.
