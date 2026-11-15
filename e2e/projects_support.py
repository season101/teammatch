"""Setup helpers for the test_projects_*.py files: projects, roles and applications over the API."""

import re
import uuid
from urllib.parse import unquote

import pytest

from conftest import ALLAUTH, Api, User

PITCH = "A pitch long enough to read like a real project idea."


def tag():
    return uuid.uuid4().hex[:8]


def skill_ids(client):
    return {s["name"]: s["id"] for s in client.send("GET", "/api/v1/skills/").json()}


def make_project(client, title=None, pitch=PITCH, **extra):
    """A draft project. Returns the JSON."""
    title = title or f"Proj {tag()}"
    response = client.send("POST", "/api/v1/projects/", {"title": title, "pitch": pitch, **extra})
    assert response.status == 201, f"create project: {response.status} {response.text()}"
    return response.json()


def add_role(client, project_id, title=None, skills=("Python",), description=""):
    ids = skill_ids(client)
    body = {
        "title": title or f"Role {tag()}",
        "description": description,
        "required_skills": [ids[s] for s in skills],
    }
    response = client.send("POST", f"/api/v1/projects/{project_id}/roles/", body)
    assert response.status == 201, f"add role: {response.status} {response.text()}"
    return response.json()


def open_project(client, title=None, roles=(("Python",),), **extra):
    """Draft, roles (one per tuple of skill names), publish. Returns (project, [roles])."""
    project = make_project(client, title, **extra)
    made = [add_role(client, project["id"], skills=skills) for skills in roles]
    response = client.send("POST", f"/api/v1/projects/{project['id']}/publish/")
    assert response.status == 200, f"publish: {response.status} {response.text()}"
    return project, made


def apply_to(client, role_id, note=""):
    response = client.send("POST", "/api/v1/applications/", {"role": role_id, "note": note})
    assert response.status == 201, f"apply: {response.status} {response.text()}"
    return response.json()


# Users are made once per module, so a module of tests shares one owner where it can.
@pytest.fixture(scope="module")
def make_api_user(playwright, base_url, verify_link):
    """make("Name") -> (User, signed-in Api), onboarded with the given skills. Closed after the module."""
    made = []

    def make(name, skills=("Python",)):
        tag_ = uuid.uuid4().hex[:8]
        slug = re.sub(r"[^a-z]+", ".", name.lower()).strip(".")
        user = User(
            email=f"e2e.{slug}.{tag_}@latech.edu",
            password=f"e2e-{uuid.uuid4().hex}",
            name=f"{name} {tag_}",
        )
        client = Api(playwright, base_url)
        made.append(client)
        signup = client.send(
            "POST", f"{ALLAUTH}/auth/signup", {"email": user.email, "password": user.password}
        )
        assert signup.status == 401, f"sign-up: {signup.status} {signup.text()}"
        key = unquote(verify_link(user.email).rsplit("/verify-email/", 1)[1])
        assert client.send("POST", f"{ALLAUTH}/auth/email/verify", {"key": key}).status == 200
        ids = skill_ids(client)
        assert client.send("POST", "/api/v1/me/rules/accept/").ok
        profile = {"display_name": user.name, "major": user.major, "skill_ids": [ids[s] for s in skills]}
        saved = client.send("PATCH", "/api/v1/me/profile/", profile)
        assert saved.ok, saved.text()
        return user, client

    yield make
    for client in made:
        client.close()


def signed_in_state(client):
    """Playwright storage_state for a browser that is already signed in as this Api's user."""
    return client.request.storage_state()
