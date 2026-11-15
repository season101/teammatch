"""Projects list and search (F2-03, F2-07): keyword, skill, empty results and Clear search."""

import re

import pytest
from playwright.sync_api import Page, expect

from projects_support import (  # noqa: F401
    add_role,
    make_api_user,
    make_project,
    open_project,
    signed_in_state,
    tag,
)

T = tag()


@pytest.fixture(scope="module")
def world(make_api_user):
    """Owner A (open Docker project + a draft), owner B (archived one + open Machine Learning one),
    and a viewer. Every title/pitch/role carries a token unique to this run."""
    global T
    T = tag()  # per build of this fixture, in case pytest builds it twice in one session
    a_user, a = make_api_user("Proj BrowseA")
    b_user, b = make_api_user("Proj BrowseB")
    viewer = make_api_user("Proj Viewer")
    alpha = make_project(a, f"Alpha zqa{T}", f"Pitch about marmalade{T} for everyone.")
    role_a = add_role(a, alpha["id"], f"Wrangler{T}", ("Docker",))
    assert a.send("POST", f"/api/v1/projects/{alpha['id']}/publish/").status == 200
    draft = make_project(a, f"Draft zqd{T}", "A draft that nobody should find.")
    add_role(a, draft["id"], "Draft role", ("Docker",))
    old = make_project(b, f"Archived zqx{T}", "Old news.")
    add_role(b, old["id"], "Old role", ("Machine Learning",))
    assert b.send("POST", f"/api/v1/projects/{old['id']}/publish/").status == 200
    assert b.send("POST", f"/api/v1/projects/{old['id']}/close/").status == 200
    beta = make_project(b, f"Beta zqb{T}", "Something with numbers.")
    add_role(b, beta["id"], f"Modeler{T}", ("Machine Learning",))
    assert b.send("POST", f"/api/v1/projects/{beta['id']}/publish/").status == 200
    return {
        "alpha": alpha,
        "beta": beta,
        "draft": draft,
        "archived": old,
        "role_a": role_a,
        "a_user": a_user,
        "viewer": viewer,
    }


@pytest.fixture(scope="module")
def browser_context_args(browser_context_args, world):
    return {**browser_context_args, "storage_state": signed_in_state(world["viewer"][1])}


@pytest.fixture
def projects(page: Page, world):
    page.goto("/projects")
    expect(page.get_by_role("searchbox", name="Search projects")).to_be_visible()
    return page


def search(page, text):
    page.get_by_role("searchbox", name="Search projects").fill(text)


def link(page, project):
    return page.get_by_role("link", name=project["title"])


def test_list_shows_open_projects_with_owner_roles_and_pitch(projects, world):
    alpha = world["alpha"]
    expect(link(projects, alpha)).to_be_visible()
    card = projects.get_by_role("listitem").filter(has=link(projects, alpha))
    expect(card).to_contain_text(f"by {world['a_user'].name}")
    expect(card).to_contain_text("1 open role")
    expect(card).to_contain_text(f"marmalade{T}")


def test_drafts_and_archived_projects_are_not_listed(projects, world):
    expect(link(projects, world["alpha"])).to_be_visible()
    expect(link(projects, world["draft"])).to_have_count(0)
    expect(link(projects, world["archived"])).to_have_count(0)


def test_clicking_a_card_opens_the_project(projects, world):
    link(projects, world["alpha"]).click()
    expect(projects).to_have_url(re.compile(rf"/projects/{world['alpha']['id']}$"))
    expect(projects.get_by_role("heading", name=world["alpha"]["title"], level=1)).to_be_visible()


def test_search_matches_title(projects, world):
    search(projects, f"zqa{T}")
    expect(link(projects, world["alpha"])).to_be_visible()
    expect(link(projects, world["beta"])).to_have_count(0)


def test_search_matches_pitch_ignoring_case(projects, world):
    search(projects, f"MARMALADE{T}".upper())
    expect(link(projects, world["alpha"])).to_be_visible()
    expect(link(projects, world["beta"])).to_have_count(0)


def test_search_matches_open_role_title(projects, world):
    search(projects, f"modeler{T}")
    expect(link(projects, world["beta"])).to_be_visible()
    expect(link(projects, world["alpha"])).to_have_count(0)


def test_search_matches_a_required_skill_of_an_open_role(projects, world):
    search(projects, "Machine Learning")
    expect(link(projects, world["beta"])).to_be_visible()
    expect(link(projects, world["alpha"])).to_have_count(0)
    search(projects, "docker")
    expect(link(projects, world["alpha"])).to_be_visible()
    expect(link(projects, world["beta"])).to_have_count(0)


def test_search_never_finds_drafts_or_archived(projects, world):
    search(projects, f"zqd{T}")
    expect(projects.get_by_text(re.compile("Nothing matches"))).to_be_visible()
    search(projects, f"zqx{T}")
    expect(projects.get_by_text(re.compile("Nothing matches"))).to_be_visible()


def test_no_results_show_clear_search_which_restores_the_list(projects, world):
    search(projects, f"nothing-like-this-{T}")
    expect(projects.get_by_text(f"Nothing matches “nothing-like-this-{T}”")).to_be_visible()
    expect(link(projects, world["alpha"])).to_have_count(0)
    projects.get_by_role("button", name="Clear search").click()
    expect(projects.get_by_role("searchbox", name="Search projects")).to_have_value("")
    expect(link(projects, world["alpha"])).to_be_visible()
    expect(link(projects, world["beta"])).to_be_visible()
    expect(projects.get_by_text(re.compile("Nothing matches"))).to_have_count(0)


def test_blank_search_is_the_whole_list(projects, world):
    search(projects, "   ")
    expect(link(projects, world["alpha"])).to_be_visible()
    expect(projects.get_by_text(re.compile("Nothing matches"))).to_have_count(0)


def test_clearing_the_box_by_hand_restores_the_list(projects, world):
    search(projects, f"zqa{T}")
    expect(link(projects, world["beta"])).to_have_count(0)
    search(projects, "")
    expect(link(projects, world["beta"])).to_be_visible()


def test_search_with_special_characters_does_not_break(projects):
    search(projects, "100% [c++] \\ ' \" <b>")
    expect(projects.get_by_text(re.compile("Nothing matches"))).to_be_visible()
    projects.get_by_role("button", name="Clear search").click()
    expect(projects.get_by_role("searchbox", name="Search projects")).to_have_value("")


def test_api_search_and_filters(world):
    client = world["viewer"][1]
    hits = client.send("GET", f"/api/v1/projects/?q=zqb{T}").json()["results"]
    assert [p["id"] for p in hits] == [world["beta"]["id"]], [(p["id"], p["title"]) for p in hits]
    skill = client.send("GET", "/api/v1/projects/?q=Machine%20Learning").json()["results"]
    assert world["beta"]["id"] in [p["id"] for p in skill]
    assert world["archived"]["id"] not in [p["id"] for p in skill]


def test_projects_page_signed_out_redirects_to_login(browser):
    page = browser.new_context(base_url="http://localhost:3000").new_page()
    page.goto("/projects")
    expect(page).to_have_url(re.compile(r"/login"))


def test_mine_tab_on_a_phone_shows_only_my_own_projects(browser, world):
    context = browser.new_context(
        base_url="http://localhost:3000",
        viewport={"width": 390, "height": 844},
        storage_state=signed_in_state(world["viewer"][1]),
    )
    page = context.new_page()
    page.goto("/projects")
    page.get_by_role("tab", name="Mine").click()
    expect(page.get_by_text("No projects yet").filter(visible=True)).to_be_visible()
    context.close()
