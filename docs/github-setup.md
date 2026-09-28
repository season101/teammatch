# GitHub setup

One-time setup for the repo owner. Run these yourself and check each result before the next one.

## 1. Create the repo and push

In GitHub Desktop: **Publish repository**, name `teammatch`, uncheck "Keep this code private". Or:

```bash
gh repo create teammatch --public --source . --push
```

## 2. Labels

```bash
gh label create "type: story" -c 1d76db
gh label create "type: task" -c 5319e7
gh label create "type: bug" -c d73a4a
gh label create "epic: F1 accounts" -c 2f5bea
gh label create "epic: F2 projects" -c b7791f
gh label create "epic: F3 swipe" -c 2b7a4b
gh label create "epic: F4 match-chat" -c 8e3fb0
gh label create "epic: platform" -c 6a737d
```

## 3. Protect main

Settings → Branches → Add rule for `main` (or a ruleset):

- Require a pull request before merging, 1 approval
- Require status checks: `detect`, `secrets` (add `backend`, `frontend`, `docker` once code exists)
- Require linear history
- Block force pushes

Settings → General → Pull Requests: allow **squash merging** only, and turn on "Automatically delete head branches".

## 4. Project board

```bash
gh project create --owner @me --title "TeamMatch"
```

Then in the project's settings add fields:

| Field | Type | Values |
|---|---|---|
| Status | single select | Backlog, Ready, In progress, In review, Done |
| Sprint | iteration | S1 10/6, S2 10/22, S3 11/5 (2 weeks each) |
| Epic | single select | F1, F2, F3, F4, Platform |
| Estimate | number | hours |
| Hrs Left | number | update before each stand-up |

Link the repo to the project (Project → ... → Settings → Manage access / Link repository), and add a Board view grouped by Status and a Table view grouped by Sprint.

## 5. Teammates

Settings → Collaborators → add each teammate with **Write** access.

## 6. Actions and packages

- Actions are on by default. The Release workflow pushes images to GHCR on a `v*` tag.
- After the first release, open each package (teammatch-api, teammatch-web) → Package settings → set visibility to **Public** so the server can pull without logging in.
