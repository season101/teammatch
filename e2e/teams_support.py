"""Setup helpers shared by the test_teams_*.py files: projects, applications, offers over the API.

Plain functions and one fixture, so the tests only drive the UI for the part they check.
"""

import re
import uuid
from dataclasses import dataclass, field

import pytest
from playwright.sync_api import Page, expect


@dataclass
class Project:
    owner: object
    client: object
    id: int
    title: str
    roles: dict = field(default_factory=dict)  # role title -> id


def tag():
    return uuid.uuid4().hex[:6]


@pytest.fixture
def patient_user(verified_user):
    """Kept as a name for verified_user (the sign-up rate limit is off on the shared stack)."""
    return verified_user


@pytest.fixture
def owned(api, patient_user):
    """owned("Olive", [("QA lead", ["Testing"]), ...], skills=["Python"]) -> Project, published.

    One fresh owner per call (BR-14: one open project per term). Role titles get a unique suffix.
    """

    def make(name, roles, *, skills=("Python",), publish=True, title=None):
        owner = patient_user(name, skills=skills)
        client = api().sign_in(owner)
        ids = {s["name"]: s["id"] for s in client.send("GET", "/api/v1/skills/").json()}
        t = tag()
        title = title or f"Teams {t}"
        created = client.send("POST", "/api/v1/projects/", {"title": title, "pitch": "Teams e2e."})
        assert created.ok, created.text()
        project = Project(owner, client, created.json()["id"], title)
        for role_title, needs in roles:
            full = f"{role_title} {t}"
            made = client.send(
                "POST",
                f"/api/v1/projects/{project.id}/roles/",
                {
                    "title": full,
                    "description": "Teams e2e role.",
                    "required_skills": [ids[s] for s in needs],
                },
            )
            assert made.ok, made.text()
            project.roles[full] = made.json()["id"]
        if publish:
            done = client.send("POST", f"/api/v1/projects/{project.id}/publish/")
            assert done.ok, done.text()
        return project

    return make


@pytest.fixture
def candidate(api, patient_user):
    """candidate("Cody", skills=["Python"]) -> (User, signed-in Api client)."""

    def make(name="Cody", *, skills=("Python",)):
        user = patient_user(name, skills=skills)
        return user, api().sign_in(user)

    return make


def role_id(project, prefix=None):
    """The id of the project's first role, or the one whose title starts with prefix."""
    for title, rid in project.roles.items():
        if prefix is None or title.startswith(prefix):
            return rid
    raise KeyError(prefix)


def role_title(project, prefix=None):
    for title in project.roles:
        if prefix is None or title.startswith(prefix):
            return title
    raise KeyError(prefix)


def apply(client, rid, note=""):
    """Apply to a role over the API; returns the application id."""
    response = client.send("POST", "/api/v1/applications/", {"role": rid, "note": note})
    assert response.status == 201, f"apply: {response.status} {response.text()}"
    return response.json()["id"]


def like(project, app_id):
    response = project.client.send("POST", f"/api/v1/applications/{app_id}/like/")
    assert response.ok, f"like: {response.status} {response.text()}"


def commit(client, app_id):
    return client.send("POST", f"/api/v1/applications/{app_id}/commit/")


def waiting(project, rid, status="pending"):
    response = project.client.send("GET", f"/api/v1/roles/{rid}/applications/?status={status}")
    assert response.ok, response.text()
    return response.json()["results"]


def my_apps(client):
    response = client.send("GET", "/api/v1/applications/mine/")
    assert response.ok, response.text()
    body = response.json()
    return body["results"] if isinstance(body, dict) else body


def team_of(client):
    return client.send("GET", "/api/v1/teams/mine/").json()["team"]


def open_review(page: Page, sign_in, user):
    sign_in(page, user)
    page.goto("/applicants")


def role_tab(page: Page, title):
    return page.get_by_role("tab", name=re.compile(rf"^{re.escape(title)}"))


def card(page: Page, name):
    return page.get_by_role("article", name=re.compile(rf"^Applicant {re.escape(name)} for"))


def finish_team(project, pairs):
    """Like and commit each (candidate client, role id) pair; the last one locks the team."""
    for client, rid in pairs:
        app_id = apply(client, rid)
        like(project, app_id)
        assert commit(client, app_id).ok


def assert_celebration(page: Page, title):
    dialog = page.get_by_role("dialog", name="It's a Team!")
    expect(dialog).to_be_visible()
    expect(dialog.get_by_text(title)).to_be_visible()
    return dialog
