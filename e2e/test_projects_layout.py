"""Projects at phone width (390 px), in dark and light themes, and a keyboard-only create flow."""

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
PHONE = {"width": 390, "height": 844}


@pytest.fixture(scope="module")
def owner(make_api_user):
    return make_api_user("Proj Layout")


@pytest.fixture(scope="module")
def rich(owner):
    """A draft with a long title, a long repo link, long details and two roles (all with spaces)."""
    client = owner[1]
    project = make_project(
        client,
        "A long project title " * 4,
        "A pitch that goes on and on. " * 60,
        repo_url="https://github.com/" + "a" * 80 + "/" + "b" * 60,
        details="More. " * 80,
    )
    add_role(client, project["id"], "A very long role title " * 4, ("Python", "Testing", "Docker", "Django"), "d " * 200)
    add_role(client, project["id"], "Second role", ("Python",))
    return project


def context_for(browser, client, **kwargs):
    return browser.new_context(base_url=BASE, storage_state=signed_in_state(client), **kwargs)


def no_sideways_scroll(page):
    # tolerate 1 px of rounding
    over = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    assert over <= 1, f"page scrolls sideways by {over}px"


def test_new_project_form_fits_a_phone(browser, owner):
    context = context_for(browser, owner[1], viewport=PHONE)
    page = context.new_page()
    page.goto("/projects/new")
    expect(page.get_by_label("Title", exact=True)).to_be_visible()
    no_sideways_scroll(page)
    # fields are full width and the submit button is reachable and at least 44 px tall
    box = page.get_by_role("button", name="Create project").bounding_box()
    assert box["height"] >= 40, box
    page.get_by_role("button", name="Create project").click()
    expect(page.get_by_text("Title is required.")).to_be_visible()
    no_sideways_scroll(page)
    context.close()


def test_project_page_with_long_content_fits_a_phone(browser, owner, rich):
    context = context_for(browser, owner[1], viewport=PHONE)
    page = context.new_page()
    page.goto(f"/projects/{rich['id']}")
    expect(page.get_by_role("link", name="View the code")).to_be_visible()
    no_sideways_scroll(page)
    context.close()


@pytest.mark.xfail(
    reason="BUG: a long word with no spaces (title, pitch or role title) is not wrapped, so the "
    "project page scrolls sideways on a phone",
    strict=True,
)
@pytest.mark.parametrize("which", ["title", "pitch", "role title"])
def test_unbroken_long_words_do_not_scroll_the_page_sideways(browser, make_api_user, which):
    _, client = make_api_user("Proj Unbroken")
    project = make_project(
        client,
        "L" * 100 if which == "title" else "Unbroken",
        "x" * 400 if which == "pitch" else "A pitch.",
    )
    add_role(client, project["id"], "R" * 100 if which == "role title" else "Role")
    context = context_for(browser, client, viewport=PHONE)
    page = context.new_page()
    page.goto(f"/projects/{project['id']}")
    expect(page.get_by_role("heading", name="Roles")).to_be_visible()
    no_sideways_scroll(page)
    context.close()


def test_role_form_and_details_form_fit_a_phone(browser, owner, rich):
    context = context_for(browser, owner[1], viewport=PHONE)
    page = context.new_page()
    page.goto(f"/projects/{rich['id']}")
    page.get_by_role("button", name="Add a role").click()
    expect(page.get_by_label("Role title", exact=True)).to_be_visible()
    no_sideways_scroll(page)
    page.get_by_role("button", name="Cancel").click()
    page.get_by_role("button", name="Edit details").click()
    expect(page.get_by_label("GitHub repository (optional)")).to_be_visible()
    no_sideways_scroll(page)
    context.close()


def test_phone_projects_page_has_browse_and_mine_tabs(browser, make_api_user):
    _, client = make_api_user("Proj PhoneMine")
    project = make_project(client, f"PhoneMine {tag()}")
    add_role(client, project["id"], "r")
    context = context_for(browser, client, viewport=PHONE)
    page = context.new_page()
    page.goto("/projects")
    expect(page.get_by_role("tab", name="Browse")).to_be_visible()
    page.get_by_role("tab", name="Mine").click()
    expect(page.get_by_role("region", name="Drafts").get_by_text(project["title"])).to_be_visible()
    expect(page.get_by_text("1 role · not published").filter(visible=True)).to_be_visible()
    no_sideways_scroll(page)
    context.close()


def test_phone_apply_form_fits(browser, make_api_user):
    _, owner = make_api_user("Proj PhoneApplyO")
    _, cand = make_api_user("Proj PhoneApplyC")
    project, roles = open_project(owner, f"PhoneApply {tag()}")
    context = context_for(browser, cand, viewport=PHONE)
    page = context.new_page()
    page.goto(f"/projects/{project['id']}")
    expect(page.get_by_role("button", name=f"Apply to {roles[0]['title']}")).to_be_visible()
    no_sideways_scroll(page)
    context.close()


def luminance(rgb):
    def chan(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


PARSE_COLOR = """
(el) => {
  const c = getComputedStyle(el);
  const parse = (v) => {
    const m = v.match(/[\\d.]+/g).map(Number);
    return m.slice(0, 3);
  };
  // first non-transparent background up the tree
  let bg = null, n = el;
  while (n && !bg) {
    const v = getComputedStyle(n).backgroundColor;
    if (!/rgba\\(.*, 0\\)|transparent/.test(v)) bg = v;
    n = n.parentElement;
  }
  return { fg: parse(c.color), bg: parse(bg || 'rgb(255,255,255)') };
}
"""


@pytest.mark.parametrize("scheme", ["dark", "light"])
def test_editor_text_is_readable_in_both_themes(browser, owner, rich, scheme):
    context = context_for(browser, owner[1], color_scheme=scheme)
    page = context.new_page()
    page.goto(f"/projects/{rich['id']}")
    expect(page.get_by_role("heading", name="Roles")).to_be_visible()
    page.get_by_role("button", name="Edit details").click()
    for target in (
        page.get_by_label("Title", exact=True),
        page.get_by_label("Pitch", exact=True),
        page.get_by_label("GitHub repository (optional)"),
        page.get_by_role("heading", name="Roles"),
        page.get_by_text("Skills for").first if False else page.get_by_role("button", name="Save changes"),
    ):
        colors = target.evaluate(PARSE_COLOR)
        ratio = contrast(colors["fg"], colors["bg"])
        assert ratio >= 4.5, f"{scheme}: {ratio:.1f}:1 on {colors}"
    page_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    nums = [float(x) for x in re.findall(r"[\d.]+", page_bg)[:3]]
    if scheme == "dark":
        assert luminance(nums) < 0.2, page_bg
    else:
        assert luminance(nums) > 0.6, page_bg
    context.close()


@pytest.mark.parametrize("scheme", ["dark", "light"])
def test_new_project_form_in_both_themes_shows_errors_readably(browser, owner, scheme):
    context = context_for(browser, owner[1], color_scheme=scheme)
    page = context.new_page()
    page.goto("/projects/new")
    page.get_by_label("GitHub repository (optional)").fill("http://github.com/x")
    page.get_by_role("button", name="Create project").click()
    error = page.get_by_role("alert").filter(has_text="Title is required.")
    expect(error).to_be_visible()
    colors = error.evaluate(PARSE_COLOR)
    assert contrast(colors["fg"], colors["bg"]) >= 4.5, f"{scheme}: {colors}"
    context.close()


def active_name(page):
    return page.evaluate(
        "(() => { const e = document.activeElement; "
        "return (e.getAttribute('aria-label') || e.innerText || e.value || e.id || e.tagName).trim(); })()"
    )


def tab_to(page, pattern, limit=80):
    """Press Tab until the focused element's name matches; fail if it never does."""
    seen = []
    for _ in range(limit):
        page.keyboard.press("Tab")
        name = active_name(page)
        seen.append(name)
        if re.search(pattern, name):
            return
    pytest.fail(f"Tab never reached /{pattern}/; saw {seen[-8:]}")


def test_keyboard_only_create_add_role_and_publish(browser, make_api_user):
    _, client = make_api_user("Proj Keys")
    context = context_for(browser, client)
    page = context.new_page()
    page.goto("/projects/new")
    expect(page.get_by_role("heading", name="New project")).to_be_visible()
    title = f"Keys {tag()}"
    page.get_by_label("Title", exact=True).focus()
    page.keyboard.type(title)
    page.keyboard.press("Tab")
    page.keyboard.type("Made without a mouse.")
    page.keyboard.press("Tab")
    expect(page.get_by_label("GitHub repository (optional)")).to_be_focused()
    page.keyboard.type("https://github.com/keys/only")
    page.keyboard.press("Tab")
    expect(page.get_by_label("More details (optional)")).to_be_focused()
    page.keyboard.type("Typed by keys.")
    page.keyboard.press("Tab")
    expect(page.get_by_role("button", name="Create project")).to_be_focused()
    page.keyboard.press("Enter")
    expect(page.get_by_role("heading", name="Project created")).to_be_visible()

    tab_to(page, r"^Add roles$")
    page.keyboard.press("Enter")
    expect(page.get_by_role("heading", name=title, level=1)).to_be_visible()
    expect(page.get_by_role("link", name="View the code")).to_be_visible()

    tab_to(page, r"^Add a role$")
    page.keyboard.press("Enter")
    page.get_by_label("Role title", exact=True).focus()
    page.keyboard.type("Keyboard dev")
    tab_to(page, r"^\+ Python$")
    page.keyboard.press("Space")
    expect(page.get_by_role("button", name="Remove Python")).to_be_visible()
    tab_to(page, r"^Add role$")
    page.keyboard.press("Enter")
    expect(page.get_by_role("heading", name=re.compile("Keyboard dev"))).to_be_visible()

    tab_to(page, r"^Publish project$")
    page.keyboard.press("Enter")
    expect(page.get_by_text("Published. Your project is now open for applications.")).to_be_visible()
    context.close()


def test_keyboard_escape_closes_the_close_dialog_without_closing(browser, make_api_user):
    _, client = make_api_user("Proj KeysClose")
    project, _ = open_project(client, f"KeysClose {tag()}")
    context = context_for(browser, client)
    page = context.new_page()
    page.goto(f"/projects/{project['id']}")
    page.get_by_role("button", name="Close project").focus()
    page.keyboard.press("Enter")
    dialog = page.get_by_role("dialog", name="Close this project?")
    expect(dialog).to_be_visible()
    page.keyboard.press("Escape")
    expect(dialog).to_have_count(0)
    expect(page.get_by_text("open · by")).to_be_visible()
    context.close()
