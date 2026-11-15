"""Setup helpers for the deck tests.

Sign-ups are throttled (20 a minute per IP) and the stack is shared with other test sessions, so
users are pooled for the whole run: owners are freed by closing their project after each test,
candidates are cleaned (passes cleared, applications withdrawn). A test's roles are unique by
tag, and `isolate` passes on everything else, so other sessions' projects don't matter.
"""

import re
import uuid
from dataclasses import dataclass, field
from urllib.parse import unquote

import pytest
from conftest import ALLAUTH, EMAIL_DOMAIN, Api, User
from playwright.sync_api import Page, expect


def tag():
    return uuid.uuid4().hex[:6]


@dataclass
class Account:
    user: User
    client: Api
    dirty: bool = False  # committed somewhere: never reused


@dataclass
class Proj:
    owner: Account
    id: int
    title: str
    roles: dict = field(default_factory=dict)  # role title -> id

    @property
    def client(self):
        return self.owner.client

    def role_id(self, title):
        return self.roles[title]


class Pool:
    def __init__(self, playwright, base_url, verify_link):
        self._pw, self._url, self._verify = playwright, base_url, verify_link
        self.skill_by_name = None
        self.free_owners: list[Account] = []
        self.candidates: dict[tuple, Account] = {}
        self.clients: list[Api] = []

    # -- accounts -----------------------------------------------------------
    def _new_account(self, name, skills):
        client = Api(self._pw, self._url)
        self.clients.append(client)
        slug = re.sub(r"[^a-z]+", ".", name.lower()).strip(".")
        t = uuid.uuid4().hex[:8]
        user = User(
            email=f"e2e.deck.{slug}.{t}@{EMAIL_DOMAIN}",
            password=f"e2e-{uuid.uuid4().hex}",
            name=f"{name} {t}",
        )
        signup = client.send(
            "POST", f"{ALLAUTH}/auth/signup", {"email": user.email, "password": user.password}
        )
        assert signup.status == 401, f"sign-up {user.email}: {signup.status} {signup.text()}"
        key = unquote(self._verify(user.email).rsplit("/verify-email/", 1)[1])
        assert client.send("POST", f"{ALLAUTH}/auth/email/verify", {"key": key}).status == 200
        ids = self.skills(client)
        assert client.send("POST", "/api/v1/me/rules/accept/").ok
        saved = client.send(
            "PATCH",
            "/api/v1/me/profile/",
            {"display_name": user.name, "major": user.major, "skill_ids": [ids[s] for s in skills]},
        )
        assert saved.ok, saved.text()
        return Account(user, client)

    def skills(self, client):
        if self.skill_by_name is None:
            rows = client.send("GET", "/api/v1/skills/").json()
            self.skill_by_name = {s["name"]: s["id"] for s in rows}
        return self.skill_by_name

    def candidate(self, skills, fresh=False):
        key = tuple(sorted(skills))
        acct = None if fresh else self.candidates.get(key)
        if acct is None or acct.dirty:
            acct = self._new_account("Deck Cand", list(skills))
            if not fresh:
                self.candidates[key] = acct
        return acct

    def owner(self, fresh=False):
        if not fresh:
            while self.free_owners:
                acct = self.free_owners.pop()
                if not acct.dirty:
                    return acct
        return self._new_account("Deck Owner", ["Python"])

    def close(self):
        for c in self.clients:
            c.close()


@pytest.fixture(scope="session")
def pool(playwright, base_url, verify_link):
    p = Pool(playwright, base_url, verify_link)
    yield p
    p.close()


class Deck:
    def __init__(self, pool: Pool):
        self.pool = pool
        self._owned: list[Proj] = []
        self._used: list[Account] = []

    # -- setup --------------------------------------------------------------
    def candidate(self, skills=("Python",), fresh=False) -> Account:
        acct = self.pool.candidate(skills, fresh)
        self._used.append(acct)
        return acct

    def project(self, roles, *, title=None, pitch=None, publish=True, fresh=False) -> Proj:
        """roles: [(role title, [skill names])]. Each project gets its own owner (BR-14)."""
        owner = self.pool.owner(fresh)
        if fresh:
            owner.dirty = True
        title = title or f"DeckProj {tag()}"
        client = owner.client
        made = client.send(
            "POST", "/api/v1/projects/", {"title": title, "pitch": pitch or f"Pitch for {title}."}
        )
        assert made.ok, made.text()
        proj = Proj(owner=owner, id=made.json()["id"], title=title)
        self._owned.append(proj)
        ids = self.pool.skill_by_name
        for role_title, skills in roles:
            r = client.send(
                "POST",
                f"/api/v1/projects/{proj.id}/roles/",
                {
                    "title": role_title,
                    "description": f"Does {role_title}.",
                    "required_skills": [ids[s] for s in skills],
                },
            )
            assert r.ok, r.text()
            proj.roles[role_title] = r.json()["id"]
        if publish:
            p = client.send("POST", f"/api/v1/projects/{proj.id}/publish/")
            assert p.ok, p.text()
        return proj

    def feed(self, acct: Account):
        """Every role in the candidate's deck, in order, across pages."""
        out, url = [], "/api/v1/feed/"
        while url:
            body = acct.client.send("GET", url).json()
            out += body["results"]
            url = body["next"]
        return out

    def isolate(self, acct: Account, keep):
        """Pass on every role in the deck that isn't in `keep` (ids), so the deck is only yours."""
        keep = set(keep)
        for role in self.feed(acct):
            if role["id"] not in keep:
                # 409: the role was filled or closed meanwhile (other sessions clean up).
                acct.client.send("POST", f"/api/v1/roles/{role['id']}/dismiss/")
        return self.feed(acct)

    def apply(self, acct: Account, role_id, note=""):
        r = acct.client.send("POST", "/api/v1/applications/", {"role": role_id, "note": note})
        assert r.ok, r.text()
        return r.json()

    def commit(self, proj: Proj, role_title, acct: Account):
        """Candidate applies, owner likes, candidate commits. The candidate holds a seat for good."""
        app = self.apply(acct, proj.role_id(role_title))
        assert proj.client.send("POST", f"/api/v1/applications/{app['id']}/like/").ok
        r = acct.client.send("POST", f"/api/v1/applications/{app['id']}/commit/")
        assert r.ok, r.text()
        acct.dirty = proj.owner.dirty = True

    # -- cleanup ------------------------------------------------------------
    def cleanup(self):
        for proj in self._owned:
            owner = proj.owner
            if owner.dirty:
                continue
            owner.client.send("POST", f"/api/v1/projects/{proj.id}/close/")
            if owner not in self.pool.free_owners:
                self.pool.free_owners.append(owner)
        # Candidates aren't cleaned: every test's roles are new, and keeping their passes on
        # other sessions' roles saves isolate() hundreds of requests next time.


@pytest.fixture
def deck(pool):
    d = Deck(pool)
    yield d
    d.cleanup()


# -- page helpers -------------------------------------------------------------
def apply_button(page: Page, role_title: str):
    return page.get_by_role("button", name=re.compile(rf"^Apply to {re.escape(role_title)} on "))


def pass_button(page: Page, role_title: str):
    return page.get_by_role("button", name=f"Pass on {role_title}", exact=True)


def expect_top(page: Page, role_title: str):
    expect(apply_button(page, role_title)).to_be_visible()


def login(page: Page, acct: Account, coach=True):
    """Signed in without the form (it's throttled): the API session's cookies go in the browser.
    The first-deck coach marks are marked seen unless coach=False."""
    if coach:
        page.add_init_script("localStorage.setItem('teammatch:coach-seen', '1')")
    page.context.add_cookies(acct.client.request.storage_state()["cookies"])


def open_deck(page: Page, deck: Deck, acct: Account, keep, top=None, coach=True):
    """Isolate the candidate's deck to `keep`, sign in, load it, wait for the top card."""
    keep = set(keep)
    login(page, acct, coach)
    # Other sessions post roles all the time: retry until the deck held only `keep` while it loaded.
    for _ in range(6):
        for _ in range(4):
            if all(r["id"] in keep for r in deck.isolate(acct, keep)):
                break
        page.goto("/feed")
        if top:
            try:
                expect(apply_button(page, top)).to_be_visible(timeout=6_000)
            except AssertionError:
                continue  # a stranger's role was on top
        else:
            page.wait_for_load_state("networkidle")
        if all(r["id"] in keep for r in deck.feed(acct)):
            return page
    if top:
        expect_top(page, top)
    return page


def set_shortcuts(page: Page, on: bool):
    page.goto("/settings")
    switch = page.get_by_role("switch", name=re.compile("Keyboard shortcuts"))
    expect(switch).to_be_visible()
    if switch.is_checked() != on:
        switch.click()
    expect(switch).to_be_checked(checked=on)
