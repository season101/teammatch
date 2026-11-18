"""Shared fixtures for the e2e tests. README.md lists them and shows how to add a test.

Most return a function, so a test reads like its steps: sign_in(page, user).
"""

import email
import os
import re
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote

import pytest
from dotenv import dotenv_values
from playwright.sync_api import Page, expect

REPO = Path(__file__).resolve().parent.parent
# The api container's EMAIL_FILE_PATH (/app/.e2e-mail) is backend/.e2e-mail through the bind mount.
MAIL_DIR = Path(os.environ.get("E2E_MAIL_DIR", REPO / "backend" / ".e2e-mail"))
# Same domains as ALLOWED_EMAIL_DOMAINS' default (BR-01).
EMAIL_DOMAIN = os.environ.get("E2E_EMAIL_DOMAIN", "latech.edu")
ALLAUTH = "/_allauth/browser/v1"

# The dev server compiles a page on its first visit, which can take a while.
expect.set_options(timeout=30_000)


@dataclass
class User:
    email: str
    password: str
    name: str
    major: str = "Computer Science"


@pytest.fixture(scope="session")
def base_url():
    return os.environ.get("E2E_BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture(scope="session")
def browser_type_launch_args(browser_type_launch_args):
    # A browser that's already installed, when `playwright install` would download one.
    if path := os.environ.get("E2E_CHROMIUM_PATH"):
        return {**browser_type_launch_args, "executable_path": path}
    return browser_type_launch_args


@pytest.fixture
def make_user():
    def make(name="E2E User"):
        slug = re.sub(r"[^a-z]+", ".", name.lower()).strip(".")
        tag = uuid.uuid4().hex[:8]
        return User(
            email=f"e2e.{slug}.{tag}@{EMAIL_DOMAIN}",
            password=f"e2e-{uuid.uuid4().hex}",
            name=f"{name} {tag}",
        )

    return make


def _messages():
    """Every mail the file backend wrote, newest file first."""
    files = sorted(MAIL_DIR.glob("*.log"), key=lambda f: f.stat().st_mtime, reverse=True)
    for file in files:
        # One file per connection; messages in it are split by a line of 79 dashes.
        for raw in reversed(file.read_text().split("\n" + "-" * 79 + "\n")):
            if raw.strip():
                yield email.message_from_string(raw)


def _body(message):
    return "".join(
        part.get_payload(decode=True).decode()
        for part in message.walk()
        if part.get_content_type() == "text/plain"
    )


@pytest.fixture(scope="session")
def verify_link():
    def find(address, timeout=15):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            for message in _messages():
                found = re.search(r"https?://\S+/verify-email/\S+", _body(message))
                if message["To"] == address and found:
                    return found.group(0)
            time.sleep(0.2)
        pytest.fail(
            f"No verification email for {address} in {MAIL_DIR} after {timeout} s. Is the stack "
            "running with EMAIL_FILE_PATH=/app/.e2e-mail (see README.md), or E2E_MAIL_DIR set?"
        )

    return find


class Api:
    """The API over HTTP with its own session, for setup a test isn't about."""

    def __init__(self, playwright, base_url):
        self.request = playwright.request.new_context(base_url=base_url)
        self.request.get(f"{ALLAUTH}/auth/session")  # sets the csrftoken cookie

    def send(self, method, path, data=None):
        cookies = self.request.storage_state()["cookies"]
        token = next(c["value"] for c in cookies if c["name"] == "csrftoken")
        return self.request.fetch(path, method=method, data=data, headers={"X-CSRFToken": token})

    def sign_in(self, user):
        response = self.send(
            "POST", f"{ALLAUTH}/auth/login", {"email": user.email, "password": user.password}
        )
        assert response.status == 200, (
            f"API sign-in for {user.email}: {response.status} {response.text()}"
        )
        return self

    def close(self):
        self.request.dispose()


@pytest.fixture
def api(playwright, base_url):
    """api() is a new signed-out Api; api().sign_in(user) a signed-in one. Closed after the test."""
    made = []

    def make():
        made.append(Api(playwright, base_url))
        return made[-1]

    yield make
    for client in made:
        client.close()


@pytest.fixture
def verified_user(api, make_user, verify_link):
    """verified_user("Ada", skills=["Python"]): fast setup over the API.

    onboarded=False leaves Team rules, info and skills for the test to do.
    """

    def make(name="E2E User", *, skills=("Python",), onboarded=True):
        user = make_user(name)
        client = api()
        signup = client.send(
            "POST", f"{ALLAUTH}/auth/signup", {"email": user.email, "password": user.password}
        )
        assert signup.status == 401, (
            f"sign-up for {user.email}: {signup.status} {signup.text()}"
        )  # 401: verify next
        key = unquote(verify_link(user.email).rsplit("/verify-email/", 1)[1])
        verified = client.send("POST", f"{ALLAUTH}/auth/email/verify", {"key": key})
        # 200: verified and signed in, as this session signed up (F1-01).
        assert verified.status == 200, f"verify {user.email}: {verified.status} {verified.text()}"
        if onboarded:
            ids = {s["name"]: s["id"] for s in client.send("GET", "/api/v1/skills/").json()}
            assert client.send("POST", "/api/v1/me/rules/accept/").ok
            profile = {
                "display_name": user.name,
                "major": user.major,
                "skill_ids": [ids[s] for s in skills],
            }
            saved = client.send("PATCH", "/api/v1/me/profile/", profile)
            assert saved.ok, f"profile for {user.email}: {saved.status} {saved.text()}"
        return user

    return make


@pytest.fixture(scope="session")
def seed_candidate():
    """The stack's SEED_CANDIDATE_* account (bootstrap makes it, seed_demo fills it)."""
    env_file = Path(os.environ.get("E2E_ENV_FILE", REPO / ".env")).expanduser()
    # A real dotenv parser, so quotes and inline comments read the way Compose reads them.
    # No ${VAR} interpolation (shortcut: Compose expands unquoted values; ours have none).
    # The environment wins.
    env = {**dotenv_values(env_file, interpolate=False), **os.environ}
    email_, password = env.get("SEED_CANDIDATE_EMAIL"), env.get("SEED_CANDIDATE_PASSWORD")
    if not (email_ and password):
        pytest.skip(f"SEED_CANDIDATE_EMAIL/PASSWORD not set (env or {env_file})")
    return User(email=email_, password=password, name="Sam Student")



def wait_hydrated(page):
    """Wait for React to attach to the form: Sign in before that submits natively and stays on /login."""
    page.wait_for_function(
        "() => { const f = document.querySelector('main form'); "
        "return !!f && Object.keys(f).some(k => k.startsWith('__reactProps')) }",
        timeout=10_000,
    )


@pytest.fixture(scope="session")
def sign_in():
    def do(page: Page, user: User):
        if "/login" not in page.url:
            page.goto("/login")
        wait_hydrated(page)
        page.get_by_label("School email").fill(user.email)
        page.get_by_role("button", name="Continue with email").click()
        page.get_by_label("Password").fill(user.password)
        page.get_by_role("button", name="Sign in", exact=True).click()
        expect(page).not_to_have_url(re.compile(r"/login"))

    return do


@pytest.fixture(scope="session")
def sign_up(verify_link):
    def do(page: Page, user: User):
        page.goto("/signup")
        page.get_by_label("School email").fill(user.email)
        page.get_by_role("button", name="Continue with email").click()
        page.get_by_label("Password").fill(user.password)
        page.get_by_role("button", name="Sign up").click()
        expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()

        page.goto(verify_link(user.email))
        page.get_by_role("button", name="Verify my email").click()
        # Verifying in the browser that signed up signs you in (F1-01): Continue, not Sign in.
        expect(page.get_by_role("heading", name="You're verified")).to_be_visible()
        page.get_by_role("link", name="Continue").click()
        # Continue goes to /feed, and its gate sends a new account to Team rules.
        expect(page).to_have_url(re.compile(r"/welcome/rules$"))

    return do


@pytest.fixture(scope="session")
def onboard():
    def do(page: Page, user: User, skill: str):
        expect(page.get_by_role("heading", name="Team rules")).to_be_visible()
        page.get_by_role("button", name="I agree").click()

        expect(page.get_by_role("heading", name="Confirm your info")).to_be_visible()
        page.get_by_label("Name", exact=True).fill(user.name)
        page.get_by_label("Major", exact=True).fill(user.major)
        page.get_by_role("button", name="Continue").click()

        expect(page.get_by_role("heading", name="What can you do?")).to_be_visible()
        page.get_by_role("button", name=f"+ {skill}", exact=True).click()
        page.get_by_role("button", name="Continue · 1 skill").click()

        # The first deck opens with coach marks (onboarding step 4).
        expect(page).to_have_url(re.compile(r"/feed"))
        page.get_by_role("dialog", name="One role at a time").get_by_role(
            "button", name="Got it"
        ).click()

    return do


@pytest.fixture
def two_pages(new_context):
    """Two people at once: separate cookies, each recorded like the default page."""

    def make():
        return new_context().new_page(), new_context().new_page()

    return make
