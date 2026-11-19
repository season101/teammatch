"""Projects: create a draft, title/pitch limits, and the F2-12 repository link and More details."""

import os
import re

import pytest
from playwright.sync_api import Page, expect

from projects_support import PITCH, make_api_user, make_project, signed_in_state, tag  # noqa: F401

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:3000").rstrip("/")
NOT_GITHUB = "Enter a link that starts with https://github.com/"


@pytest.fixture(scope="module")
def owner(make_api_user):
    return make_api_user("Proj Create")


@pytest.fixture(scope="module")
def browser_context_args(browser_context_args, owner):
    # Every test's browser starts signed in as this module's owner (drafts are unlimited).
    return {**browser_context_args, "storage_state": signed_in_state(owner[1])}


@pytest.fixture
def owner_page(page: Page):
    page.goto("/projects/new")
    expect(page.get_by_role("heading", name="New project")).to_be_visible()
    return page


def fill_basics(page, title="Create test", pitch=PITCH):
    page.get_by_label("Title").fill(title)
    page.get_by_label("Pitch").fill(pitch)


def submit(page):
    page.get_by_role("button", name="Create project").click()


def test_create_draft_happy_path(owner_page):
    title = f"Draft {tag()}"
    fill_basics(owner_page, title, "Build a thing for the class demo.")
    submit(owner_page)
    expect(owner_page.get_by_role("heading", name="Project created")).to_be_visible()
    expect(owner_page.get_by_text(f"“{title}” was saved as a draft")).to_be_visible()
    owner_page.get_by_role("link", name="Add roles").click()
    expect(owner_page).to_have_url(re.compile(r"/projects/\d+$"))
    expect(owner_page.get_by_role("heading", name=title, level=1)).to_be_visible()
    expect(owner_page.get_by_role("main").get_by_text("Draft", exact=True)).to_be_visible()
    expect(owner_page.get_by_text("Build a thing for the class demo.")).to_be_visible()
    expect(owner_page.get_by_text("No roles yet.")).to_be_visible()


def test_empty_form_shows_required_errors(owner_page):
    submit(owner_page)
    expect(owner_page.get_by_text("Title is required.")).to_be_visible()
    expect(owner_page.get_by_text("Pitch is required.")).to_be_visible()
    expect(owner_page).to_have_url(re.compile(r"/projects/new$"))


def test_whitespace_only_fields_are_required(owner_page):
    fill_basics(owner_page, "   ", "   \n  ")
    submit(owner_page)
    expect(owner_page.get_by_text("Title is required.")).to_be_visible()
    expect(owner_page.get_by_text("Pitch is required.")).to_be_visible()


def test_error_clears_when_typing(owner_page):
    submit(owner_page)
    owner_page.get_by_label("Title").fill("x")
    expect(owner_page.get_by_text("Title is required.")).to_have_count(0)
    expect(owner_page.get_by_text("Pitch is required.")).to_be_visible()


def test_failed_submit_moves_focus_to_first_invalid_field(owner_page):
    submit(owner_page)
    expect(owner_page.get_by_label("Title")).to_be_focused()


def test_title_limited_to_100_with_counter(owner_page):
    owner_page.get_by_label("Title").fill("t" * 130)
    expect(owner_page.get_by_label("Title")).to_have_value("t" * 100)
    expect(owner_page.get_by_text("100/100 characters")).to_be_visible()


def test_pitch_limited_to_2000_with_counter(owner_page):
    owner_page.get_by_label("Pitch").fill("p" * 2100)
    expect(owner_page.get_by_label("Pitch")).to_have_value("p" * 2000)
    expect(owner_page.get_by_text("2000/2000 characters")).to_be_visible()


def test_title_and_pitch_at_the_limit_are_saved(owner_page):
    title = ("T" + tag()).ljust(100, "x")
    fill_basics(owner_page, title, "p" * 2000)
    submit(owner_page)
    expect(owner_page.get_by_role("heading", name="Project created")).to_be_visible()
    owner_page.get_by_role("link", name="Add roles").click()
    expect(owner_page.get_by_role("heading", name=title, level=1)).to_be_visible()


def test_api_rejects_overlong_title_and_pitch(owner):
    client = owner[1]
    too_long_title = client.send(
        "POST", "/api/v1/projects/", {"title": "t" * 101, "pitch": PITCH}
    )
    assert too_long_title.status == 400
    too_long_pitch = client.send(
        "POST", "/api/v1/projects/", {"title": "ok", "pitch": "p" * 2001}
    )
    assert too_long_pitch.status == 400
    too_long_details = client.send(
        "POST", "/api/v1/projects/", {"title": "ok", "pitch": PITCH, "details": "d" * 2001}
    )
    assert too_long_details.status == 400
    blank = client.send("POST", "/api/v1/projects/", {"title": "", "pitch": ""})
    assert blank.status == 400


def test_details_counter_and_limit(owner_page):
    box = owner_page.get_by_label("More details (optional)")
    box.fill("d" * 2100)
    expect(box).to_have_value("d" * 2000)
    expect(owner_page.get_by_text("2000/2000 characters").nth(0)).to_be_visible()


@pytest.mark.parametrize(
    "bad",
    [
        "http://github.com/me/proj",
        "https://gitlab.com/me/proj",
        "github.com/me/proj",
        "https://github.com/",
        "https://github.com.evil.io/me/proj",
        "https://github.com@evil.io/me/proj",
        "not a link",
        "ftp://github.com/me/proj",
    ],
)
def test_repo_link_must_be_github_https(owner_page, bad):
    title, pitch, details = f"Repo {tag()}", "Pitch stays put.", "Details stay put."
    fill_basics(owner_page, title, pitch)
    owner_page.get_by_label("More details (optional)").fill(details)
    owner_page.get_by_label("GitHub repository (optional)").fill(bad)
    submit(owner_page)
    error = owner_page.get_by_role("alert").filter(has_text=NOT_GITHUB)
    expect(error).to_be_visible()
    # other fields keep their values and nothing was created
    expect(owner_page.get_by_label("Title")).to_have_value(title)
    expect(owner_page.get_by_label("Pitch")).to_have_value(pitch)
    expect(owner_page.get_by_label("More details (optional)")).to_have_value(details)
    expect(owner_page.get_by_role("heading", name="Project created")).to_have_count(0)
    expect(owner_page.get_by_label("GitHub repository (optional)")).to_have_attribute(
        "aria-invalid", "true"
    )


def test_repo_error_clears_on_edit_and_then_saves(owner_page):
    fill_basics(owner_page, f"Repo fix {tag()}")
    repo = owner_page.get_by_label("GitHub repository (optional)")
    repo.fill("https://gitlab.com/a/b")
    submit(owner_page)
    expect(owner_page.get_by_text(NOT_GITHUB)).to_be_visible()
    repo.fill("https://github.com/a/b")
    expect(owner_page.get_by_text(NOT_GITHUB)).to_have_count(0)
    submit(owner_page)
    expect(owner_page.get_by_role("heading", name="Project created")).to_be_visible()


def test_api_repo_link_error_code(owner):
    client = owner[1]
    bad = client.send(
        "POST", "/api/v1/projects/", {"title": "x", "pitch": PITCH, "repo_url": "http://github.com/a/b"}
    )
    assert bad.status == 400
    assert NOT_GITHUB in bad.text()
    ok = client.send(
        "POST", "/api/v1/projects/", {"title": "x", "pitch": PITCH, "repo_url": "https://github.com/a/b"}
    )
    assert ok.status == 201


def test_empty_extras_show_nothing_on_project_page(owner_page):
    fill_basics(owner_page, f"Plain {tag()}")
    submit(owner_page)
    owner_page.get_by_role("link", name="Add roles").click()
    expect(owner_page.get_by_role("heading", name="Roles")).to_be_visible()
    expect(owner_page.get_by_role("link", name="View the code")).to_have_count(0)
    expect(owner_page.get_by_text("More from the owner")).to_have_count(0)


def test_filled_extras_show_on_project_page(owner_page):
    fill_basics(owner_page, f"Extras {tag()}")
    owner_page.get_by_label("GitHub repository (optional)").fill("https://github.com/latech/teammatch")
    owner_page.get_by_label("More details (optional)").fill("Line one.\nLine two.")
    submit(owner_page)
    owner_page.get_by_role("link", name="Add roles").click()
    link = owner_page.get_by_role("link", name="View the code")
    expect(link).to_be_visible()
    expect(link).to_have_attribute("href", "https://github.com/latech/teammatch")
    expect(link).to_have_attribute("target", "_blank")
    expect(link).to_have_attribute("rel", re.compile("noopener"))
    expect(owner_page.get_by_role("heading", name="More from the owner")).to_be_visible()
    expect(owner_page.get_by_text("Line one.")).to_be_visible()
    expect(owner_page.get_by_text("Line two.")).to_be_visible()


def test_repo_link_opens_in_new_tab(owner_page):
    fill_basics(owner_page, f"NewTab {tag()}")
    owner_page.get_by_label("GitHub repository (optional)").fill("https://github.com/latech/teammatch")
    submit(owner_page)
    owner_page.get_by_role("link", name="Add roles").click()
    # Don't load github.com: just check the click asks for a popup.
    owner_page.context.route("https://github.com/**", lambda route: route.abort())
    with owner_page.expect_popup() as popup:
        owner_page.get_by_role("link", name="View the code").click()
    assert popup.value is not None
    expect(owner_page).to_have_url(re.compile(r"/projects/\d+$"))


def test_whitespace_around_values_is_trimmed(owner_page):
    fill_basics(owner_page, f"  Trim {tag()}  ", "  trimmed pitch  ")
    owner_page.get_by_label("GitHub repository (optional)").fill("  https://github.com/a/b  ")
    submit(owner_page)
    expect(owner_page.get_by_role("heading", name="Project created")).to_be_visible()
    owner_page.get_by_role("link", name="Add roles").click()
    expect(owner_page.get_by_role("link", name="View the code")).to_have_attribute(
        "href", "https://github.com/a/b"
    )


def test_create_another_resets_the_form(owner_page):
    fill_basics(owner_page, f"First {tag()}")
    owner_page.get_by_label("GitHub repository (optional)").fill("https://github.com/a/b")
    submit(owner_page)
    owner_page.get_by_role("button", name="Create another project").click()
    expect(owner_page.get_by_label("Title")).to_have_value("")
    expect(owner_page.get_by_label("Pitch")).to_have_value("")
    expect(owner_page.get_by_label("GitHub repository (optional)")).to_have_value("")


def test_drafts_can_be_created_one_after_another(owner):
    # BR-14 limits open projects, not drafts.
    client = owner[1]
    before = len(client.send("GET", "/api/v1/projects/mine/").json())
    make_project(client)
    make_project(client)
    assert len(client.send("GET", "/api/v1/projects/mine/").json()) == before + 2


def test_edit_details_updates_title_pitch_repo_and_details(owner_page):
    fill_basics(owner_page, f"Before {tag()}")
    submit(owner_page)
    owner_page.get_by_role("link", name="Add roles").click()
    owner_page.get_by_role("button", name="Edit details").click()
    new_title = f"After {tag()}"
    owner_page.get_by_label("Title").fill(new_title)
    owner_page.get_by_label("Pitch").fill("A new pitch.")
    owner_page.get_by_label("GitHub repository (optional)").fill("https://github.com/x/y")
    owner_page.get_by_label("More details (optional)").fill("Some more words.")
    owner_page.get_by_role("button", name="Save changes").click()
    expect(owner_page.get_by_role("heading", name=new_title, level=1)).to_be_visible()
    expect(owner_page.get_by_text("A new pitch.")).to_be_visible()
    expect(owner_page.get_by_role("link", name="View the code")).to_be_visible()
    expect(owner_page.get_by_text("Some more words.")).to_be_visible()
    # clearing both hides them again
    owner_page.get_by_role("button", name="Edit details").click()
    owner_page.get_by_label("GitHub repository (optional)").fill("")
    owner_page.get_by_label("More details (optional)").fill("")
    owner_page.get_by_role("button", name="Save changes").click()
    expect(owner_page.get_by_role("button", name="Edit details")).to_be_visible()
    expect(owner_page.get_by_role("link", name="View the code")).to_have_count(0)
    expect(owner_page.get_by_text("More from the owner")).to_have_count(0)


def test_edit_details_bad_repo_keeps_other_fields(owner_page):
    fill_basics(owner_page, f"EditBad {tag()}")
    submit(owner_page)
    owner_page.get_by_role("link", name="Add roles").click()
    owner_page.get_by_role("button", name="Edit details").click()
    owner_page.get_by_label("Title").fill("Changed title")
    owner_page.get_by_label("More details (optional)").fill("Kept details")
    owner_page.get_by_label("GitHub repository (optional)").fill("https://bitbucket.org/a/b")
    owner_page.get_by_role("button", name="Save changes").click()
    expect(owner_page.get_by_role("alert").filter(has_text=NOT_GITHUB)).to_be_visible()
    expect(owner_page.get_by_label("Title")).to_have_value("Changed title")
    expect(owner_page.get_by_label("More details (optional)")).to_have_value("Kept details")


def test_edit_details_cancel_discards(owner_page):
    title = f"Cancel {tag()}"
    fill_basics(owner_page, title)
    submit(owner_page)
    owner_page.get_by_role("link", name="Add roles").click()
    owner_page.get_by_role("button", name="Edit details").click()
    owner_page.get_by_label("Title").fill("Never saved")
    owner_page.get_by_role("button", name="Cancel").click()
    expect(owner_page.get_by_role("heading", name=title, level=1)).to_be_visible()


def test_edit_details_empty_title_is_refused(owner_page):
    fill_basics(owner_page, f"EditEmpty {tag()}")
    submit(owner_page)
    owner_page.get_by_role("link", name="Add roles").click()
    owner_page.get_by_role("button", name="Edit details").click()
    owner_page.get_by_label("Title").fill("")
    owner_page.get_by_role("button", name="Save changes").click()
    expect(owner_page.get_by_text("Title is required.")).to_be_visible()


def test_new_project_while_signed_out_redirects_to_login(browser):
    page = browser.new_context(base_url=BASE, storage_state=None).new_page()
    page.goto("/projects/new")
    expect(page).to_have_url(re.compile(r"/login\?next=%2Fprojects%2Fnew"))


def test_signing_in_after_redirect_returns_to_new_project(browser, owner, sign_in):
    page = browser.new_context(base_url=BASE, storage_state=None).new_page()
    page.goto("/projects/new")
    expect(page).to_have_url(re.compile(r"/login"))
    sign_in(page, owner[0])
    expect(page).to_have_url(re.compile(r"/projects/new$"))
    expect(page.get_by_role("heading", name="New project")).to_be_visible()
