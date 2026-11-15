"""Projects: who can see and change what. Another user's draft, edit rights, signed-out redirects."""

import re

import pytest
from playwright.sync_api import expect

from projects_support import (  # noqa: F401
    PITCH,
    add_role,
    make_api_user,
    make_project,
    open_project,
    signed_in_state,
    skill_ids,
    tag,
)

BASE = "http://localhost:3000"


@pytest.fixture(scope="module")
def world(make_api_user):
    owner_user, owner = make_api_user("Proj PermOwner")
    other_user, other = make_api_user("Proj PermOther")
    draft = make_project(owner, f"PermDraft {tag()}")
    draft_role = add_role(owner, draft["id"], "Draft role")
    return {"owner": owner, "other": other, "draft": draft, "draft_role": draft_role}


@pytest.fixture(scope="module")
def open_one(make_api_user):
    _, owner = make_api_user("Proj PermOpen")
    project, roles = open_project(owner, f"PermOpen {tag()}")
    return {"owner": owner, "project": project, "role": roles[0]}


def test_another_users_draft_is_not_found(world):
    # GET gives 404, so a draft's existence is not revealed on read.
    r = world["other"].send("GET", f"/api/v1/projects/{world['draft']['id']}/")
    assert r.status == 404


def test_another_users_draft_page_says_not_found(browser, world):
    context = browser.new_context(base_url=BASE, storage_state=signed_in_state(world["other"]))
    page = context.new_page()
    page.goto(f"/projects/{world['draft']['id']}")
    expect(page.get_by_text("We couldn't find that project.")).to_be_visible()
    expect(page.get_by_text(world["draft"]["title"])).to_have_count(0)
    context.close()


def test_another_users_draft_is_not_in_lists(world):
    other = world["other"]
    listed = other.send("GET", "/api/v1/projects/").json()["results"]
    assert world["draft"]["id"] not in [p["id"] for p in listed]
    mine = other.send("GET", "/api/v1/projects/mine/").json()
    assert world["draft"]["id"] not in [p["id"] for p in mine]


def test_cannot_change_someone_elses_draft(world):
    other, pid, rid = world["other"], world["draft"]["id"], world["draft_role"]["id"]
    ids = skill_ids(other)
    # #256: writes on someone else's draft are 404, like a read (403 is for open or locked ones).
    assert other.send("PATCH", f"/api/v1/projects/{pid}/", {"title": "hijack"}).status == 404
    assert other.send("POST", f"/api/v1/projects/{pid}/publish/").status == 404
    assert other.send("POST", f"/api/v1/projects/{pid}/close/").status == 404
    add = other.send(
        "POST", f"/api/v1/projects/{pid}/roles/", {"title": "x", "required_skills": [ids["Python"]]}
    )
    assert add.status == 404
    assert other.send("PATCH", f"/api/v1/roles/{rid}/", {"title": "x"}).status == 404
    assert other.send("DELETE", f"/api/v1/roles/{rid}/").status == 404
    still = world["owner"].send("GET", f"/api/v1/projects/{pid}/").json()
    assert still["title"] == world["draft"]["title"] and still["status"] == "draft"


def test_cannot_change_someone_elses_open_project(open_one, world):
    other, pid, rid = world["other"], open_one["project"]["id"], open_one["role"]["id"]
    assert other.send("PATCH", f"/api/v1/projects/{pid}/", {"title": "hijack"}).status == 403
    assert other.send("POST", f"/api/v1/projects/{pid}/close/").status == 403
    assert other.send("PATCH", f"/api/v1/roles/{rid}/", {"title": "x"}).status == 403
    assert other.send("DELETE", f"/api/v1/roles/{rid}/").status == 403
    assert other.send("GET", f"/api/v1/projects/{pid}/").status == 200


def test_open_project_page_has_no_owner_controls_for_others(browser, open_one, world):
    context = browser.new_context(base_url=BASE, storage_state=signed_in_state(world["other"]))
    page = context.new_page()
    page.goto(f"/projects/{open_one['project']['id']}")
    expect(page.get_by_role("heading", name=open_one["project"]["title"], level=1)).to_be_visible()
    for name in ("Edit details", "Close project", "Add a role", "Edit role", "Delete role", "Publish project"):
        expect(page.get_by_role("button", name=name)).to_have_count(0)
    context.close()


def test_other_users_archived_project_is_not_found(make_api_user, world):
    _, owner = make_api_user("Proj PermArch")
    project, _ = open_project(owner, f"PermArch {tag()}")
    assert owner.send("POST", f"/api/v1/projects/{project['id']}/close/").status == 200
    assert world["other"].send("GET", f"/api/v1/projects/{project['id']}/").status == 404


def test_owner_sees_own_draft(browser, world):
    context = browser.new_context(base_url=BASE, storage_state=signed_in_state(world["owner"]))
    page = context.new_page()
    page.goto(f"/projects/{world['draft']['id']}")
    expect(page.get_by_role("heading", name=world["draft"]["title"], level=1)).to_be_visible()
    expect(page.get_by_role("button", name="Publish project")).to_be_visible()
    context.close()


def test_project_page_signed_out_redirects_to_login(browser, open_one):
    page = browser.new_context(base_url=BASE).new_page()
    page.goto(f"/projects/{open_one['project']['id']}")
    expect(page).to_have_url(re.compile(r"/login\?next="))


def test_new_project_page_signed_out_redirects_to_login(browser):
    page = browser.new_context(base_url=BASE).new_page()
    page.goto("/projects/new")
    expect(page).to_have_url(re.compile(r"/login\?next=%2Fprojects%2Fnew"))
    expect(page.get_by_role("heading", name="New project")).to_have_count(0)


def test_api_is_closed_to_signed_out_visitors(api, open_one):
    anon = api()
    assert anon.send("GET", "/api/v1/projects/").status == 401
    assert anon.send("GET", f"/api/v1/projects/{open_one['project']['id']}/").status == 401
    assert anon.send("POST", "/api/v1/projects/", {"title": "x", "pitch": PITCH}).status == 401
    assert anon.send("GET", "/api/v1/projects/mine/").status == 401


def test_unknown_and_malformed_project_ids(browser, world):
    context = browser.new_context(base_url=BASE, storage_state=signed_in_state(world["other"]))
    page = context.new_page()
    page.goto("/projects/999999999")
    expect(page.get_by_text("We couldn't find that project.")).to_be_visible()
    page.goto("/projects/abc")
    expect(page.get_by_text("That project address isn't valid.")).to_be_visible()
    assert world["other"].send("GET", "/api/v1/projects/999999999/").status == 404
    context.close()


def test_creating_a_project_needs_the_team_rules_accepted(playwright, base_url, verify_link):
    # #256: the API holds the Team rules for any client. A fresh account that skipped them gets 403.
    from urllib.parse import unquote

    from conftest import ALLAUTH, Api, User
    from projects_support import tag as new_tag

    user = User(email=f"e2e.proj.norules.{new_tag()}@latech.edu", password=f"e2e-{new_tag()}{new_tag()}", name="x")
    client = Api(playwright, base_url)
    try:
        assert client.send("POST", f"{ALLAUTH}/auth/signup", {"email": user.email, "password": user.password}).status == 401
        key = unquote(verify_link(user.email).rsplit("/verify-email/", 1)[1])
        assert client.send("POST", f"{ALLAUTH}/auth/email/verify", {"key": key}).status == 200
        r = client.send("POST", "/api/v1/projects/", {"title": "x", "pitch": PITCH})
        assert r.status == 403 and "rules_not_accepted" in r.text(), (r.status, r.text())
    finally:
        client.close()


def test_owner_cannot_forge_owner_status_or_term_on_create(make_api_user):
    user, client = make_api_user("Proj Mass")
    r = client.send(
        "POST",
        "/api/v1/projects/",
        {"title": f"Mass {tag()}", "pitch": PITCH, "status": "open", "owner": 1, "term": 1},
    )
    assert r.status == 201
    body = r.json()
    assert body["status"] == "draft"
    me = client.send("GET", "/api/v1/projects/mine/").json()
    assert [p["id"] for p in me] == [body["id"]]
    patch = client.send("PATCH", f"/api/v1/projects/{body['id']}/", {"status": "open"})
    assert client.send("GET", f"/api/v1/projects/{body['id']}/").json()["status"] == "draft", patch.text()
