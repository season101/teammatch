# Screens

Wireframes for every screen at phone (375px) and desktop (1440px), with their key states. They're greyscale on purpose: they fix layout, content and behaviour, while colour and type come from the [foundations](../foundations/). Each image has a header with the screen's purpose, primary action and desktop keys.

- **Flows:** [flows.md](flows.md) shows how the screens connect.
- **Interactive board:** open [wireframes.html](wireframes.html) in a browser (it works offline) to browse every screen with a Phone / Desktop toggle.
- **Building one:** find the screen below, open its image, then read the pattern listed next to it.

## Public
| # | Screen | Wireframe | Pattern |
|---|---|---|---|
| 1 | Landing | [01-landing.png](img/01-landing.png) | [feedback states](../patterns/feedback-states.md#splash) (splash) |
| 2 | Sign in | [02-sign-in.png](img/02-sign-in.png) | [forms](../patterns/forms.md) |
| 3 | Sign up | [03-sign-up.png](img/03-sign-up.png) | [forms](../patterns/forms.md) |
| 4 | Verify email | [04-verify-email.png](img/04-verify-email.png) | [forms](../patterns/forms.md) |

## Onboarding
| # | Screen | Wireframe | Pattern |
|---|---|---|---|
| 5 | Team rules | [05-team-rules.png](img/05-team-rules.png) | [forms](../patterns/forms.md#onboarding-order) |
| 6 | Profile setup | [06-profile-setup.png](img/06-profile-setup.png) | [forms](../patterns/forms.md#phone-vs-desktop) |
| 7 | First deck, coach marks | [07-first-deck-coach-marks.png](img/07-first-deck-coach-marks.png) | [swipe deck](../patterns/swipe-deck.md#first-visit) |

## Candidate
| # | Screen | Wireframe | Pattern |
|---|---|---|---|
| 8 | Discover deck | [08-discover-deck.png](img/08-discover-deck.png) | [swipe deck](../patterns/swipe-deck.md) |
| 9 | Role details | [09-role-details-expanded.png](img/09-role-details-expanded.png) | [swipe deck](../patterns/swipe-deck.md) |
| 10 | Apply with a note | [10-apply-with-a-note.png](img/10-apply-with-a-note.png) | [swipe deck](../patterns/swipe-deck.md#apply-with-a-note) |
| 11 | My applications | [11-my-applications.png](img/11-my-applications.png) | [feedback states](../patterns/feedback-states.md#application-status-chips), [confirmations](../patterns/confirmations.md) |
| 12 | Explore by vibe (later) | [12-explore-by-vibe.png](img/12-explore-by-vibe.png) | Not in the MVP; see [decisions](../decisions.md) DD-13 |
| 13 | Browse and search projects | [13-browse-and-search-projects.png](img/13-browse-and-search-projects.png) | [navigation](../patterns/navigation.md) |
| 14 | Project detail | [14-project-detail.png](img/14-project-detail.png) | |

## Owner
| # | Screen | Wireframe | Pattern |
|---|---|---|---|
| 15 | My projects | [15-my-projects.png](img/15-my-projects.png) | [navigation](../patterns/navigation.md#desktop-sidebar-modes) |
| 16 | Create or edit a project | [16-create-or-edit-a-project.png](img/16-create-or-edit-a-project.png) | [forms](../patterns/forms.md#project-creation) |
| 17 | Review queue | [17-review-queue.png](img/17-review-queue.png) | [review queue](../patterns/review-queue.md) |
| 18 | Role filled toast | [18-role-filled-toast.png](img/18-role-filled-toast.png) | [feedback states](../patterns/feedback-states.md#role-filled) |
| 19 | It's a Team! | [19-it-s-a-team-celebration.png](img/19-it-s-a-team-celebration.png) | [feedback states](../patterns/feedback-states.md#its-a-team) |
| 20 | Delete role | [20-delete-unfillable-role-confirmation.png](img/20-delete-unfillable-role-confirmation.png) | [confirmations](../patterns/confirmations.md) |

## Team
| # | Screen | Wireframe | Pattern |
|---|---|---|---|
| 21 | Teams list | [21-teams-list.png](img/21-teams-list.png) | [navigation](../patterns/navigation.md) |
| 22 | Team chat | [22-team-chat.png](img/22-team-chat.png) | |
| 23 | Team page | [23-team-page.png](img/23-team-page.png) | |

## Me
| # | Screen | Wireframe | Pattern |
|---|---|---|---|
| 24 | Profile | [24-profile.png](img/24-profile.png) | [profile strength](../components/profile-strength.md), [forms](../patterns/forms.md) |
| 25 | Settings | [25-settings.png](img/25-settings.png) | [navigation](../patterns/navigation.md#desktop-sidebar-modes), [confirmations](../patterns/confirmations.md) |

## When a wireframe and a doc disagree
The pattern and component docs win on behaviour and styling; the wireframe wins on layout and content. Fix whichever is wrong in your pull request, and say so in its description.
