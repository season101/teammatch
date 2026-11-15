"""Projects: publish (BR-06, BR-14), close/archive (F2-05) and read-only archived and locked projects (BR-13)."""

import re

import pytest
from playwright.sync_api import Page, expect

from projects_support import (  # noqa: F401
    add_role,
    apply_to,
    make_api_user,
    make_project,
    open_project,
    skill_ids,
    tag,
)


def as_user(page: Page, client):
    page.context.add_cookies(client.request.storage_state()["cookies"])


def mine_tab(page: Page):
    page.get_by_role("tab", name="Mine").click()


def test_publish_without_roles_is_refused_with_a_message(page: Page, make_api_user):
    _, client = make_api_user("Proj NoRoles")
    project = make_project(client, f"NoRoles {tag()}")
    as_user(page, client)
    page.goto(f"/projects/{project['id']}")
    page.get_by_role("button", name="Publish project").click()
    expect(page.get_by_role("alert").filter(has_text="Add at least one role before publishing.")).to_be_visible()
    expect(page.get_by_text("draft · by")).to_be_visible()
    r = client.send("POST", f"/api/v1/projects/{project['id']}/publish/")
    assert r.status == 409 and "project_needs_roles" in r.text()


def test_publish_with_a_role_opens_the_project(page: Page, make_api_user):
    _, client = make_api_user("Proj Publish")
    project = make_project(client, f"Publish {tag()}")
    add_role(client, project["id"], "Only role")
    as_user(page, client)
    page.goto(f"/projects/{project['id']}")
    page.get_by_role("button", name="Publish project").click()
    expect(page.get_by_text("Published. Your project is now open for applications.")).to_be_visible()
    expect(page.get_by_text("open · by")).to_be_visible()
    expect(page.get_by_role("button", name="Publish project")).to_have_count(0)
    # it is in the browse list now
    page.goto("/projects")
    expect(page.get_by_role("link", name=project["title"])).to_be_visible()


def test_published_project_can_be_published_again_only_as_409(make_api_user):
    _, client = make_api_user("Proj Republish")
    project, _ = open_project(client, f"Twice {tag()}")
    r = client.send("POST", f"/api/v1/projects/{project['id']}/publish/")
    assert r.status == 409 and "project_not_draft" in r.text()


def test_second_publish_is_refused_while_one_is_open_br14(page: Page, make_api_user):
    _, client = make_api_user("Proj BR14")
    first, _ = open_project(client, f"First open {tag()}")
    second = make_project(client, f"Second draft {tag()}")
    add_role(client, second["id"], "Role two")
    as_user(page, client)
    page.goto(f"/projects/{second['id']}")
    page.get_by_role("button", name="Publish project").click()
    expect(
        page.get_by_role("alert").filter(
            has_text="You already have an open project. Close it or wait until it locks."
        )
    ).to_be_visible()
    expect(page.get_by_text("draft · by")).to_be_visible()
    # not in the browse list
    page.goto("/projects")
    expect(page.get_by_role("link", name=first["title"])).to_be_visible()
    expect(page.get_by_role("link", name=second["title"])).to_have_count(0)


def test_closing_the_open_project_lets_the_second_publish(page: Page, make_api_user):
    _, client = make_api_user("Proj BR14 Close")
    first, _ = open_project(client, f"First {tag()}")
    second = make_project(client, f"Second {tag()}")
    add_role(client, second["id"], "Role two")
    assert client.send("POST", f"/api/v1/projects/{second['id']}/publish/").status == 409
    assert client.send("POST", f"/api/v1/projects/{first['id']}/close/").status == 200
    as_user(page, client)
    page.goto(f"/projects/{second['id']}")
    page.get_by_role("button", name="Publish project").click()
    expect(page.get_by_text("Published. Your project is now open for applications.")).to_be_visible()


def test_mine_note_explains_a_new_project_stays_a_draft(page: Page, make_api_user):
    _, client = make_api_user("Proj Note")
    open_project(client, f"Noted {tag()}")
    as_user(page, client)
    page.goto("/projects")
    mine_tab(page)
    expect(page.get_by_text("You have an open project, so a new one stays a draft").filter(visible=True)).to_be_visible()


def test_owner_with_a_seat_on_another_team_cannot_publish(make_api_user):
    # BR-14 second half: filling a role on someone else's open project uses the term's one seat.
    _, boss = make_api_user("Proj SeatBoss")
    _, member = make_api_user("Proj SeatMember")
    _, roles = open_project(boss, f"Seat {tag()}", roles=(("Python",), ("Python",)))
    app = apply_to(member, roles[0]["id"])
    assert boss.send("POST", f"/api/v1/applications/{app['id']}/like/").status == 200
    assert member.send("POST", f"/api/v1/applications/{app['id']}/commit/").status in (200, 201)
    mine = make_project(member, f"Member own {tag()}")
    add_role(member, mine["id"], "r")
    r = member.send("POST", f"/api/v1/projects/{mine['id']}/publish/")
    assert r.status == 409 and "owner_has_a_spot" in r.text(), r.text()


def test_close_asks_first_and_keep_cancels(page: Page, make_api_user):
    _, client = make_api_user("Proj CloseAsk")
    project, _ = open_project(client, f"CloseAsk {tag()}")
    as_user(page, client)
    page.goto(f"/projects/{project['id']}")
    page.get_by_role("button", name="Close project").click()
    dialog = page.get_by_role("dialog", name="Close this project?")
    expect(dialog).to_be_visible()
    dialog.get_by_role("button", name="Keep project").click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_text("open · by")).to_be_visible()


def test_close_moves_it_to_archived_group_in_mine_and_is_read_only(page: Page, make_api_user):
    _, client = make_api_user("Proj Archive")
    project, _ = open_project(client, f"Archive {tag()}")
    as_user(page, client)
    page.goto(f"/projects/{project['id']}")
    mine_tab(page)
    expect(page.get_by_role("region", name="Open").get_by_text(project["title"])).to_be_visible()
    page.get_by_role("button", name="Close project").click()
    page.get_by_role("dialog", name="Close this project?").get_by_role("button", name="Close project").click()
    # without a reload: the status line, the Mine groups and the controls all change
    expect(page.get_by_text("archived · by")).to_be_visible()
    archived = page.get_by_role("region", name="Archived")
    expect(archived.get_by_role("link", name=re.compile(re.escape(project["title"])))).to_be_visible()
    expect(page.get_by_role("region", name="Open")).to_have_count(0)
    for name in ("Edit details", "Close project", "Add a role", "Edit role", "Delete role", "Publish project"):
        expect(page.get_by_role("button", name=name)).to_have_count(0)
    # and after a reload, from the Archived row
    page.goto("/projects")
    mine_tab(page)
    page.get_by_role("region", name="Archived").get_by_role("link", name=re.compile(re.escape(project["title"]))).click()
    expect(page.get_by_text("archived · by")).to_be_visible()
    expect(page.get_by_role("button", name="Add a role")).to_have_count(0)
    expect(page.get_by_role("button", name="Edit details")).to_have_count(0)


def test_archived_project_refuses_changes_over_the_api(make_api_user):
    _, client = make_api_user("Proj ArchiveApi")
    project, roles = open_project(client, f"ArchApi {tag()}")
    assert client.send("POST", f"/api/v1/projects/{project['id']}/close/").status == 200
    patch = client.send("PATCH", f"/api/v1/projects/{project['id']}/", {"title": "nope"})
    assert patch.status == 409, patch.text()
    add = client.send(
        "POST",
        f"/api/v1/projects/{project['id']}/roles/",
        {"title": "x", "required_skills": [skill_ids(client)["Python"]]},
    )
    assert add.status == 409
    assert client.send("PATCH", f"/api/v1/roles/{roles[0]['id']}/", {"title": "nope"}).status == 409
    assert client.send("DELETE", f"/api/v1/roles/{roles[0]['id']}/").status == 409
    assert client.send("POST", f"/api/v1/projects/{project['id']}/publish/").status == 409
    # closing twice is refused too
    assert client.send("POST", f"/api/v1/projects/{project['id']}/close/").status == 409


def test_archived_project_leaves_browse_and_search(page: Page, make_api_user):
    _, client = make_api_user("Proj ArchiveList")
    project, _ = open_project(client, f"ArchList {tag()}")
    page.context.add_cookies(client.request.storage_state()["cookies"])
    page.goto("/projects")
    expect(page.get_by_role("link", name=project["title"])).to_be_visible()
    assert client.send("POST", f"/api/v1/projects/{project['id']}/close/").status == 200
    page.reload()
    expect(page.get_by_role("heading", name="Open projects", exact=False).or_(page.get_by_role("searchbox", name="Search projects"))).to_be_visible()
    expect(page.get_by_role("link", name=project["title"])).to_have_count(0)


def test_closing_withdraws_pending_applications(make_api_user):
    _, owner = make_api_user("Proj CloseWithdraw")
    _, cand = make_api_user("Proj CloseCand")
    project, roles = open_project(owner, f"CloseW {tag()}")
    app = apply_to(cand, roles[0]["id"])
    assert owner.send("POST", f"/api/v1/projects/{project['id']}/close/").status == 200
    mine = cand.send("GET", "/api/v1/applications/mine/").json()
    results = mine["results"] if isinstance(mine, dict) else mine
    status = next(a["status"] for a in results if a["id"] == app["id"])
    assert status == "withdrawn"


def test_a_draft_can_be_closed_over_the_api(make_api_user):
    _, client = make_api_user("Proj CloseDraft")
    project = make_project(client, f"CloseDraft {tag()}")
    assert client.send("POST", f"/api/v1/projects/{project['id']}/close/").status == 200


def test_locked_project_is_read_only_and_closing_it_is_refused(page: Page, make_api_user):
    # BR-13 says locked projects can still be archived by the owner. The code refuses (409,
    # ensure_project_editable) and the page shows no Close button. Recorded here as is.
    _, owner = make_api_user("Proj Locked")
    _, cand = make_api_user("Proj LockedCand")
    project, roles = open_project(owner, f"Locked {tag()}")
    app = apply_to(cand, roles[0]["id"])
    assert owner.send("POST", f"/api/v1/applications/{app['id']}/like/").status == 200
    assert cand.send("POST", f"/api/v1/applications/{app['id']}/commit/").status in (200, 201)
    detail = owner.send("GET", f"/api/v1/projects/{project['id']}/").json()
    assert detail["status"] == "locked"
    as_user(page, owner)
    page.goto(f"/projects/{project['id']}")
    expect(page.get_by_text("This team is locked. Every role is filled.")).to_be_visible()
    for name in ("Edit details", "Close project", "Add a role", "Edit role", "Delete role", "Publish project"):
        expect(page.get_by_role("button", name=name)).to_have_count(0)
    close = owner.send("POST", f"/api/v1/projects/{project['id']}/close/")
    assert close.status == 409, f"close on a locked project: {close.status} {close.text()}"
    assert owner.send("PATCH", f"/api/v1/projects/{project['id']}/", {"title": "x"}).status == 409
    page.goto("/projects")
    mine_tab(page)
    expect(page.get_by_role("region", name="Locked").get_by_text(project["title"])).to_be_visible()
