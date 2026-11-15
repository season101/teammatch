"""Apply from the project page (#172, PR #208): who sees Apply, the applied state, note limit."""

import re

import pytest
from playwright.sync_api import expect

from projects_support import (  # noqa: F401
    add_role,
    make_api_user,
    make_project,
    open_project,
    signed_in_state,
    tag,
)

BASE = "http://localhost:3000"


@pytest.fixture(scope="module")
def world(make_api_user):
    owner_user, owner = make_api_user("Proj ApplyOwner")
    cand_user, cand = make_api_user("Proj ApplyCand")
    project, roles = open_project(
        owner, f"Apply {tag()}", roles=(("Python",), ("Python",), ("Python",))
    )
    return {
        "owner": owner,
        "cand": cand,
        "cand_user": cand_user,
        "project": project,
        "roles": roles,
    }


@pytest.fixture
def cand(make_api_user):
    """A fresh candidate per test, so no test depends on what another one applied to."""
    return make_api_user("Proj ApplyCand")[1]


def page_for(browser, client):
    context = browser.new_context(base_url=BASE, storage_state=signed_in_state(client))
    return context, context.new_page()


def role_card(page, role):
    return page.get_by_role("listitem").filter(has=page.get_by_role("heading", name=re.compile(re.escape(role["title"]))))


def test_candidate_sees_apply_on_every_open_role(browser, world, cand):
    context, page = page_for(browser, cand)
    page.goto(f"/projects/{world['project']['id']}")
    expect(page.get_by_role("heading", name=world["project"]["title"], level=1)).to_be_visible()
    for role in world["roles"]:
        expect(page.get_by_role("button", name=f"Apply to {role['title']}")).to_be_visible()
    expect(page.get_by_role("button", name="Edit details")).to_have_count(0)
    expect(page.get_by_role("button", name="Add a role")).to_have_count(0)
    expect(page.get_by_role("button", name="Close project")).to_have_count(0)
    context.close()


def test_owner_sees_no_apply_on_own_project(browser, world):
    context, page = page_for(browser, world["owner"])
    page.goto(f"/projects/{world['project']['id']}")
    expect(page.get_by_role("heading", name=world["project"]["title"], level=1)).to_be_visible()
    expect(page.get_by_role("button", name=re.compile(r"^Apply"))).to_have_count(0)
    expect(page.get_by_label(re.compile("Note to the owner"))).to_have_count(0)
    context.close()


def test_apply_from_project_page_shows_applied_state_and_persists(browser, world, cand):
    role = world["roles"][0]
    context, page = page_for(browser, cand)
    page.goto(f"/projects/{world['project']['id']}")
    page.get_by_role("button", name=f"Apply to {role['title']}").click()
    card = role_card(page, role)
    expect(card.get_by_text("Applied")).to_be_visible()
    expect(card.get_by_role("button", name=re.compile("^Apply"))).to_have_count(0)
    # the other roles can still be applied to
    expect(page.get_by_role("button", name=f"Apply to {world['roles'][1]['title']}")).to_be_visible()
    page.reload()
    expect(role_card(page, role).get_by_text("Applied")).to_be_visible()
    page.goto("/applications")
    expect(page.get_by_text(role["title"]).first).to_be_visible()
    context.close()


def test_apply_with_a_note_sends_the_note(browser, world, cand):
    role = world["roles"][1]
    context, page = page_for(browser, cand)
    page.goto(f"/projects/{world['project']['id']}")
    role_card(page, role).get_by_label("Note to the owner (optional)").fill("I love testing")
    expect(page.get_by_text("14/300 characters")).to_be_visible()
    page.get_by_role("button", name=f"Apply to {role['title']}").click()
    expect(role_card(page, role).get_by_text("Applied")).to_be_visible()
    apps = world["owner"].send("GET", f"/api/v1/roles/{role['id']}/applications/").json()
    results = apps["results"] if isinstance(apps, dict) else apps
    assert any(a.get("note") == "I love testing" for a in results), results
    context.close()


def test_note_is_limited_to_300_characters(browser, world, cand):
    context, page = page_for(browser, cand)
    page.goto(f"/projects/{world['project']['id']}")
    note = page.get_by_label("Note to the owner (optional)").first
    note.fill("n" * 400)
    expect(note).to_have_value("n" * 300)
    expect(page.get_by_text("300/300 characters")).to_be_visible()
    context.close()


def test_applying_twice_is_refused_by_the_api(world, cand):
    role = world["roles"][0]
    first = cand.send("POST", "/api/v1/applications/", {"role": role["id"], "note": ""})
    assert first.status == 201
    again = cand.send("POST", "/api/v1/applications/", {"role": role["id"], "note": ""})
    assert again.status == 409


def test_owner_cannot_apply_to_own_role_over_the_api(world):
    r = world["owner"].send("POST", "/api/v1/applications/", {"role": world["roles"][2]["id"], "note": ""})
    assert r.status in (403, 409), r.text()


def test_apply_error_is_shown_when_the_role_is_gone(browser, make_api_user):
    # The page is open, the owner closes the project, then the candidate presses Apply.
    _, owner = make_api_user("Proj ApplyGone")
    _, cand = make_api_user("Proj ApplyGoneCand")
    project, roles = open_project(owner, f"Gone {tag()}")
    context, page = page_for(browser, cand)
    page.goto(f"/projects/{project['id']}")
    expect(page.get_by_role("button", name=f"Apply to {roles[0]['title']}")).to_be_visible()
    assert owner.send("POST", f"/api/v1/projects/{project['id']}/close/").status == 200
    page.get_by_role("button", name=f"Apply to {roles[0]['title']}").click()
    expect(page.get_by_role("alert")).to_be_visible()
    expect(page.get_by_text("Applied", exact=True)).to_have_count(0)
    context.close()


def test_filled_role_shows_no_apply_on_a_locked_project(browser, make_api_user):
    _, owner = make_api_user("Proj ApplyLockO")
    _, cand = make_api_user("Proj ApplyLockC")
    _, other = make_api_user("Proj ApplyLockX")
    project, roles = open_project(owner, f"LockedApply {tag()}")
    app = cand.send("POST", "/api/v1/applications/", {"role": roles[0]["id"], "note": ""}).json()
    assert owner.send("POST", f"/api/v1/applications/{app['id']}/like/").status == 200
    assert cand.send("POST", f"/api/v1/applications/{app['id']}/commit/").status in (200, 201)
    context, page = page_for(browser, other)
    page.goto(f"/projects/{project['id']}")
    expect(page.get_by_text("This team is locked. Every role is filled.")).to_be_visible()
    expect(page.get_by_role("button", name=re.compile(r"^Apply"))).to_have_count(0)
    context.close()


def test_draft_roles_cannot_be_applied_to(make_api_user):
    _, owner = make_api_user("Proj ApplyDraft")
    _, cand = make_api_user("Proj ApplyDraftC")
    project = make_project(owner, f"DraftApply {tag()}")
    role = add_role(owner, project["id"], "Draft role")
    r = cand.send("POST", "/api/v1/applications/", {"role": role["id"], "note": ""})
    assert r.status in (400, 403, 404, 409), r.text()
