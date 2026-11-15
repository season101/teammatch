# End-to-end tests

Playwright tests, in Python with pytest, against a running stack. `test_smoke.py` signs in a seeded student and loads the deck (PL-14). `test_golden_path.py` is the demo from start to finish with two people in two browsers at once (PL-08): an owner and a candidate sign up, verify and onboard, the owner posts a project with one role, the candidate applies from the deck, the owner likes them, the candidate commits, both see "It's a Team!" and they chat.

CI runs them on every push to `main`, nightly, on demand, and on pull requests that change `e2e/`, the workflow, `compose.local.yml` or local settings ([e2e.yml](../.github/workflows/e2e.yml)). A failed run uploads a trace, screenshot and video for each failed test as the `e2e-test-results` artifact. Open a trace with `uv run playwright show-trace <trace.zip>`.

## Run them locally

1. In the repo's `.env`, set `EMAIL_FILE_PATH=/app/.e2e-mail`, and `SEED_CANDIDATE_EMAIL` and `SEED_CANDIDATE_PASSWORD` for the smoke test. With `EMAIL_FILE_PATH` set, the api writes each email to a file in `backend/.e2e-mail/` instead of the console, and the tests read verification links from there. Leave it empty to get console mail back.
2. Start the stack and add the sample data:

   ```sh
   make up && make seed
   ```

3. Install the browser once, then run the tests:

   ```sh
   cd e2e && uv run playwright install chromium && cd ..
   make e2e                  # or: make e2e args="-x test_smoke.py"
   ```

Add `--headed --slowmo 300` to `args` to watch it happen.

The web app has to be on port 3000, as local settings only trust CSRF from there. Other ports can move. To run against a second stack (`docker compose -p <name> --env-file <file>`), point the tests at it:

| Variable | Default | What it is |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` | where the web app is |
| `E2E_ENV_FILE` | `../.env` | where `SEED_CANDIDATE_*` come from, if they aren't in the environment |
| `E2E_MAIL_DIR` | `../backend/.e2e-mail` | where the api writes email |
| `E2E_CHROMIUM_PATH` | Playwright's own | a Chromium you already have, instead of `playwright install` |

## Add a test

Add a `test_<something>.py` file here. The fixtures in [conftest.py](conftest.py) set up the common parts, so a test only has to do the part it checks:

```python
from playwright.sync_api import Page, expect


def test_owner_sees_an_empty_review_queue(page: Page, verified_user, sign_in):
    owner = verified_user("Olive Owner", skills=["Python"])  # signed up over the API, onboarded
    sign_in(page, owner)
    page.goto("/applicants")
    expect(page.get_by_text("You don't own any projects yet.")).to_be_visible()
```

| Fixture | What it gives you |
|---|---|
| `page` | a page in a fresh browser context (from pytest-playwright) |
| `make_user(name)` | a new `User` (email, password, name) on an allowed domain, not signed up |
| `verified_user(name, skills=..., onboarded=True)` | a `User` signed up and verified over the API. Fast. `onboarded=False` leaves Team rules, info and skills to the test |
| `sign_up(page, user)` | sign up and open the verification link through the UI, which signs you in. Ends on Team rules |
| `onboard(page, user, skill)` | Team rules, info, one skill and the coach marks through the UI. Ends on the deck |
| `sign_in(page, user)` | sign in through the UI |
| `verify_link(email)` | the newest verification link sent to that address |
| `two_pages()` | `(owner_page, candidate_page)`, each with its own cookies, for two people at once |
| `api()` | an HTTP client with its own session, for setup: `api().sign_in(user).send("POST", "/api/v1/...")` |
| `seed_candidate` | the stack's `SEED_CANDIDATE_*` account. Don't change its applications or team: other tests read it |

A few rules keep the tests reliable:

- Find things the way a person does: `get_by_role`, `get_by_label`, `get_by_text`. No CSS classes or test ids.
- Give every user, project and message a unique name (`make_user` does this for users). The database is shared and lives on between runs.
- Set up through the API with `verified_user` and `api()` unless the setup is what the test checks. Signing up through the UI takes about 10 seconds per user.
- Wait with `expect(...)`, never with `time.sleep`. It retries for up to 30 seconds, as the dev server compiles each page on its first visit.
