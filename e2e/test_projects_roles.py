"""Projects: add, edit and delete roles, required skills, and role order (F2-04, F2-06, BR-06, BR-07)."""

import re

import pytest
from playwright.sync_api import Page, expect

from projects_support import (  # noqa: F401
    add_role,
    make_api_user,
    make_project,
    open_project,
    signed_in_state,
    skill_ids,
    tag,
)


@pytest.fixture(scope="module")
def owner(make_api_user):
    return make_api_user("Proj Roles")


@pytest.fixture(scope="module")
def browser_context_args(browser_context_args, owner):
    return {**browser_context_args, "storage_state": signed_in_state(owner[1])}


@pytest.fixture
def draft(owner):
    return make_project(owner[1], f"Roles {tag()}")


def fill_role(page, title, skill, description=""):
    page.get_by_label("Role title").fill(title)
    if description:
        page.get_by_label("Role description").fill(description)
    page.get_by_role("button", name=f"+ {skill}", exact=True).click()


def test_add_role_with_skill_and_description(page: Page, draft):
    page.goto(f"/projects/{draft['id']}")
    expect(page.get_by_text("No roles yet.")).to_be_visible()
    page.get_by_role("button", name="Add a role").click()
    role = f"Dev {tag()}"
    fill_role(page, role, "Python", "Writes the API.")
    page.get_by_role("button", name="Add role", exact=True).click()
    expect(page.get_by_role("heading", name=re.compile(role))).to_be_visible()
    expect(page.get_by_text("Writes the API.")).to_be_visible()
    expect(page.get_by_role("list", name=f"Skills for {role}").get_by_text("Python")).to_be_visible()
    expect(page.get_by_text("No roles yet.")).to_have_count(0)
    expect(page.get_by_role("button", name="Add a role")).to_be_visible()


def test_add_role_requires_title_and_a_skill(page: Page, draft):
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Add a role").click()
    page.get_by_role("button", name="Add role", exact=True).click()
    expect(page.get_by_text("Title is required.")).to_be_visible()
    expect(page.get_by_text("Pick at least one skill.")).to_be_visible()


def test_role_title_and_description_limits(page: Page, draft):
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Add a role").click()
    page.get_by_label("Role title").fill("r" * 130)
    expect(page.get_by_label("Role title")).to_have_value("r" * 100)
    page.get_by_label("Role description").fill("d" * 1100)
    expect(page.get_by_label("Role description")).to_have_value("d" * 1000)


def test_add_role_cancel_adds_nothing(page: Page, draft):
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Add a role").click()
    page.get_by_label("Role title").fill("Never added")
    page.get_by_role("button", name="Cancel").click()
    expect(page.get_by_text("Never added")).to_have_count(0)
    expect(page.get_by_text("No roles yet.")).to_be_visible()


def test_sidebar_mine_list_updates_right_after_adding_a_role(page: Page, draft):
    # PR #243: the Mine list kept saying "0 roles" until a reload.
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("tab", name="Mine").click()
    row = page.get_by_role("link", name=re.compile(re.escape(draft["title"])))
    expect(row).to_contain_text("0 roles · not published")
    page.get_by_role("button", name="Add a role").click()
    fill_role(page, f"Role {tag()}", "Python")
    page.get_by_role("button", name="Add role", exact=True).click()
    expect(row).to_contain_text("1 role · not published")
    page.get_by_role("button", name="Add a role").click()
    fill_role(page, f"Role {tag()}", "Python")
    page.get_by_role("button", name="Add role", exact=True).click()
    expect(row).to_contain_text("2 roles · not published")


def test_sidebar_mine_list_updates_after_deleting_a_role(page: Page, draft, owner):
    add_role(owner[1], draft["id"], "Keep")
    add_role(owner[1], draft["id"], "Drop")
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("tab", name="Mine").click()
    row = page.get_by_role("link", name=re.compile(re.escape(draft["title"])))
    expect(row).to_contain_text("2 roles")
    page.get_by_role("heading", name=re.compile("Drop")).locator("xpath=..").get_by_role(
        "button", name="Delete role"
    ).click()
    page.get_by_role("dialog", name="Delete this role?").get_by_role("button", name="Delete role").click()
    expect(row).to_contain_text("1 role · not published")


def test_edit_role_changes_title_description_and_skills(page: Page, draft, owner):
    add_role(owner[1], draft["id"], "Old title", ("Python",), "Old description")
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Edit role").click()
    page.get_by_label("Role title").fill("New title")
    page.get_by_label("Role description").fill("New description")
    # Python is selected; add Testing as well
    page.get_by_role("button", name="+ Testing", exact=True).click()
    page.get_by_role("button", name="Save role").click()
    expect(page.get_by_role("heading", name=re.compile("New title"))).to_be_visible()
    expect(page.get_by_text("New description")).to_be_visible()
    skills = page.get_by_role("list", name="Skills for New title")
    expect(skills.get_by_text("Python")).to_be_visible()
    expect(skills.get_by_text("Testing")).to_be_visible()


def test_edit_role_cannot_remove_all_skills(page: Page, draft, owner):
    add_role(owner[1], draft["id"], "One skill", ("Python",))
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Edit role").click()
    # the selected skill chip toggles off when pressed
    selected = page.get_by_role("button", name=re.compile(r"Python")).first
    selected.click()
    page.get_by_role("button", name="Save role").click()
    expect(page.get_by_text("Pick at least one skill.")).to_be_visible()


def test_edit_role_cancel_keeps_old_values(page: Page, draft, owner):
    add_role(owner[1], draft["id"], "Stays", ("Python",))
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Edit role").click()
    page.get_by_label("Role title").fill("Changed")
    page.get_by_role("button", name="Cancel").click()
    expect(page.get_by_role("heading", name=re.compile("Stays"))).to_be_visible()


def test_delete_role_asks_first_and_keep_cancels(page: Page, draft, owner):
    add_role(owner[1], draft["id"], "Maybe delete", ("Python",))
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Delete role").click()
    dialog = page.get_by_role("dialog", name="Delete this role?")
    expect(dialog).to_be_visible()
    dialog.get_by_role("button", name="Keep role").click()
    expect(dialog).to_have_count(0)
    expect(page.get_by_role("heading", name=re.compile("Maybe delete"))).to_be_visible()


def test_delete_role_removes_it(page: Page, draft, owner):
    add_role(owner[1], draft["id"], "Delete me", ("Python",))
    page.goto(f"/projects/{draft['id']}")
    page.get_by_role("button", name="Delete role").click()
    page.get_by_role("dialog", name="Delete this role?").get_by_role("button", name="Delete role").click()
    expect(page.get_by_role("heading", name=re.compile("Delete me"))).to_have_count(0)
    expect(page.get_by_text("No roles yet.")).to_be_visible()


def test_cannot_delete_last_role_of_open_project(page: Page, make_api_user):
    _, client = make_api_user("Proj LastRole")
    project, roles = open_project(client, f"Last {tag()}")
    page.context.add_cookies(client.request.storage_state()["cookies"])
    page.goto(f"/projects/{project['id']}")
    page.get_by_role("button", name="Delete role").click()
    page.get_by_role("dialog", name="Delete this role?").get_by_role("button", name="Delete role").click()
    expect(page.get_by_role("alert").filter(has_text="needs at least one role")).to_be_visible()
    expect(page.get_by_role("heading", name=re.compile(roles[0]["title"]))).to_be_visible()


def test_can_add_and_delete_roles_on_an_open_project(page: Page, make_api_user):
    _, client = make_api_user("Proj OpenEdit")
    project, roles = open_project(client, f"OpenEdit {tag()}", roles=(("Python",), ("Testing",)))
    page.context.add_cookies(client.request.storage_state()["cookies"])
    page.goto(f"/projects/{project['id']}")
    page.get_by_role("button", name="Add a role").click()
    extra = f"Extra {tag()}"
    fill_role(page, extra, "Python")
    page.get_by_role("button", name="Add role", exact=True).click()
    expect(page.get_by_role("heading", name=re.compile(extra))).to_be_visible()
    page.get_by_role("heading", name=re.compile(extra)).locator("xpath=..").get_by_role(
        "button", name="Delete role"
    ).click()
    page.get_by_role("dialog", name="Delete this role?").get_by_role("button", name="Delete role").click()
    expect(page.get_by_role("heading", name=re.compile(extra))).to_have_count(0)


def test_role_order_is_oldest_first_on_project_page_and_review_tabs(page: Page, make_api_user):
    # PR #245: the project page and Review's role tabs list roles in the order they were added.
    _, client = make_api_user("Proj Order")
    names = [f"First {tag()}", f"Second {tag()}", f"Third {tag()}"]
    project = make_project(client, f"Order {tag()}")
    for name in names:
        add_role(client, project["id"], name)
    assert client.send("POST", f"/api/v1/projects/{project['id']}/publish/").status == 200
    page.context.add_cookies(client.request.storage_state()["cookies"])

    page.goto(f"/projects/{project['id']}")
    headings = page.locator("main h3")
    expect(headings).to_have_count(3)
    for i, name in enumerate(names):
        expect(headings.nth(i)).to_contain_text(name)

    page.goto("/applicants")
    tabs = page.get_by_role("tablist", name=f"Roles of {project['title']}").get_by_role("tab")
    expect(tabs).to_have_count(3)
    for i, name in enumerate(names):
        expect(tabs.nth(i)).to_contain_text(name)

    mine = [r["title"] for r in client.send("GET", "/api/v1/projects/mine/").json()[0]["roles"]]
    assert mine == names
    detail = client.send("GET", f"/api/v1/projects/{project['id']}/").json()
    assert [r["title"] for r in detail["roles"]] == names


def test_role_order_survives_an_edit_of_the_first_role(page: Page, owner):
    client = owner[1]
    names = [f"A {tag()}", f"B {tag()}"]
    project = make_project(client, f"Reorder {tag()}")
    roles = [add_role(client, project["id"], n) for n in names]
    new_name = f"A edited {tag()}"
    ids = skill_ids(client)
    r = client.send("PATCH", f"/api/v1/roles/{roles[0]['id']}/", {"title": new_name, "required_skills": [ids["Python"]]})
    assert r.status == 200, r.text()
    page.goto(f"/projects/{project['id']}")
    expect(page.locator("main h3").nth(0)).to_contain_text(new_name)
    expect(page.locator("main h3").nth(1)).to_contain_text(names[1])


def test_api_role_without_skills_or_title_is_rejected(owner, draft):
    client = owner[1]
    no_skills = client.send(
        "POST", f"/api/v1/projects/{draft['id']}/roles/", {"title": "x", "required_skills": []}
    )
    assert no_skills.status == 400
    no_title = client.send(
        "POST",
        f"/api/v1/projects/{draft['id']}/roles/",
        {"title": "", "required_skills": [skill_ids(client)["Python"]]},
    )
    assert no_title.status == 400
    long_desc = client.send(
        "POST",
        f"/api/v1/projects/{draft['id']}/roles/",
        {"title": "x", "description": "d" * 1001, "required_skills": [skill_ids(client)["Python"]]},
    )
    assert long_desc.status == 400
    bad_skill = client.send(
        "POST", f"/api/v1/projects/{draft['id']}/roles/", {"title": "x", "required_skills": [999999999]}
    )
    assert bad_skill.status == 400


def test_roles_show_status_and_open_count_in_team_strip_text(page: Page, draft, owner):
    add_role(owner[1], draft["id"], "Status role")
    page.goto(f"/projects/{draft['id']}")
    expect(page.get_by_role("heading", name=re.compile("Status role"))).to_contain_text("open")
