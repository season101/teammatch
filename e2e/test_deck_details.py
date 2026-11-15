"""F3-13: the role details page (the project page focused on one role), opened from the deck."""

import re

from deck_support import (  # noqa: F401
    apply_button,
    deck,
    expect_top,
    login,
    open_deck,
    pass_button,
    pool,
    tag,
)
from playwright.sync_api import Page, expect


def two_roles(deck, t, **kw):
    cand = deck.candidate(["Python"])
    proj = deck.project(
        [(f"First {t}", ["Python"]), (f"Second {t}", ["Python", "Figma"])],
        pitch=f"Pitch text {t}",
        **kw,
    )
    ids = [proj.role_id(f"First {t}"), proj.role_id(f"Second {t}")]
    return cand, proj, ids


def focus_deck(page: Page):
    page.get_by_role("group", name="Deck of open roles").focus()


def expect_details(page: Page, proj, role_id, title):
    expect(page).to_have_url(re.compile(rf"/projects/{proj.id}\?role={role_id}$"))
    expect(page.get_by_role("heading", level=1, name=title)).to_be_visible()


def test_tapping_the_card_opens_the_role(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    page.get_by_role("article").first.click(position={"x": 60, "y": 150})
    expect_details(page, proj, ids[0], f"First {t}")
    expect(page.get_by_text(f"Pitch text {t}")).to_be_visible()
    expect(page.get_by_text(f"Second {t}, open")).to_be_visible()  # team so far
    expect(page.get_by_role("link", name="Back to the deck")).to_be_visible()


def test_up_arrow_opens_the_role(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[0], f"First {t}")


def test_enter_on_the_deck_opens_the_role(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("Enter")
    expect_details(page, proj, ids[0], f"First {t}")


def test_view_details_link_opens_the_role(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    page.get_by_role("link", name=f"View details for First {t}").click()
    expect_details(page, proj, ids[0], f"First {t}")


def test_details_show_role_skills_description_and_matches(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowLeft")  # the Second role is now on top
    expect_top(page, f"Second {t}")
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[1], f"Second {t}")
    skills = page.get_by_role("list", name=f"Skills for Second {t}")
    expect(skills).to_contain_text("Python")
    expect(skills).to_contain_text("Figma")
    expect(page.get_by_text(f"Does Second {t}.")).to_be_visible()
    expect(page.get_by_text(f"by {proj.owner.user.name}")).to_be_visible()


def test_back_returns_to_the_same_card(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowLeft")
    expect_top(page, f"Second {t}")
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[1], f"Second {t}")
    page.get_by_role("link", name="Back to the deck").click()
    expect(page).to_have_url(re.compile(r"/feed$"))
    expect_top(page, f"Second {t}")
    # The deck has focus again, so the arrow keys work at once.
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("status").filter(has_text=f"Applied to Second {t}")).to_be_attached()


def test_escape_and_browser_back_return_to_the_deck(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[0], f"First {t}")
    page.keyboard.press("Escape")
    expect(page).to_have_url(re.compile(r"/feed$"))
    expect_top(page, f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[0], f"First {t}")
    page.go_back()
    expect(page).to_have_url(re.compile(r"/feed$"))
    expect_top(page, f"First {t}")


def test_back_from_a_direct_link_goes_to_discover(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    deck.isolate(cand, ids)
    login(page, cand)
    page.goto(f"/projects/{proj.id}?role={ids[0]}")
    expect_details(page, proj, ids[0], f"First {t}")
    page.get_by_role("link", name="Back to the deck").click()
    expect(page).to_have_url(re.compile(r"/feed$"))


def test_apply_on_details_saves_with_a_note_and_returns_to_the_next_card(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[0], f"First {t}")
    page.get_by_role("button", name="Add a note").click()
    page.get_by_label("Note to the owner (optional)").fill(f"I love this {t}")
    expect(page.get_by_text(f"{len(f'I love this {t}')}/300 characters")).to_be_visible()
    apply_button(page, f"First {t}").click()
    expect(page).to_have_url(re.compile(r"/feed$"))
    expect_top(page, f"Second {t}")
    apps = cand.client.send("GET", "/api/v1/applications/mine/").json()
    apps = apps.get("results", apps) if isinstance(apps, dict) else apps
    mine = [a for a in apps if a["role"]["id"] == ids[0]]
    assert len(mine) == 1 and mine[0]["note"] == f"I love this {t}"


def test_apply_on_details_without_a_note(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[0], f"First {t}")
    apply_button(page, f"First {t}").click()
    expect(page).to_have_url(re.compile(r"/feed$"))
    expect_top(page, f"Second {t}")
    expect(page.get_by_role("button", name=re.compile(f"^Apply to First {t}"))).to_have_count(0)


def test_pass_on_details_saves_and_returns_to_the_next_card(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"First {t}")
    focus_deck(page)
    page.keyboard.press("ArrowUp")
    expect_details(page, proj, ids[0], f"First {t}")
    pass_button(page, f"First {t}").click()
    expect(page).to_have_url(re.compile(r"/feed$"))
    expect_top(page, f"Second {t}")
    assert ids[0] not in [r["id"] for r in deck.feed(cand)]


def test_note_is_limited_to_300_characters(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    deck.isolate(cand, ids)
    login(page, cand)
    page.goto(f"/projects/{proj.id}?role={ids[0]}")
    page.get_by_role("button", name="Add a note").click()
    box = page.get_by_label("Note to the owner (optional)")
    box.fill("x" * 400)
    expect(box).to_have_value("x" * 300)
    expect(page.get_by_text("300/300 characters")).to_be_visible()


def test_own_project_offers_no_apply_or_pass(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    login(page, proj.owner)
    page.goto(f"/projects/{proj.id}?role={ids[0]}")
    expect(page.get_by_role("heading", level=1, name=f"First {t}")).to_be_visible()
    expect(page.get_by_role("button", name=re.compile("^Apply to"))).to_have_count(0)
    expect(page.get_by_role("button", name=re.compile("^Pass on"))).to_have_count(0)


def test_applied_role_shows_applied_and_no_buttons(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    deck.apply(cand, ids[0])
    login(page, cand)
    page.goto(f"/projects/{proj.id}?role={ids[0]}")
    expect(page.get_by_role("heading", level=1, name=f"First {t}")).to_be_visible()
    expect(page.get_by_text("Applied", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name=re.compile("^Apply to"))).to_have_count(0)
    expect(page.get_by_role("button", name=re.compile("^Pass on"))).to_have_count(0)


def test_filled_role_offers_no_apply_or_pass(page, deck):
    t = tag()
    cand = deck.candidate(["Python"])
    taker = deck.candidate(["Python", "Docker"], fresh=True)
    proj = deck.project([(f"Gone {t}", ["Python"]), (f"Left {t}", ["Python"])], fresh=True)
    deck.commit(proj, f"Gone {t}", taker)
    rid = proj.role_id(f"Gone {t}")
    login(page, cand)
    page.goto(f"/projects/{proj.id}?role={rid}")
    expect(page.get_by_role("heading", level=1, name=f"Gone {t}")).to_be_visible()
    expect(page.get_by_text("This role is filled.")).to_be_visible()
    expect(page.get_by_text(f"{taker.user.name}, Gone {t}")).to_be_visible()
    expect(page.get_by_role("button", name=re.compile("^Apply to"))).to_have_count(0)


def test_unknown_role_falls_back_to_the_project_page(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    login(page, cand)
    page.goto(f"/projects/{proj.id}?role=999999999")
    expect(page.get_by_text(f"Pitch text {t}")).to_be_visible()
    # The whole project page, not a role's details: no role heading, no Back to the deck link.
    expect(page.get_by_role("heading", level=1, name=f"First {t}")).to_have_count(0)
    expect(page.get_by_role("link", name="Back to the deck")).to_have_count(0)
    expect(page.get_by_text(f"First {t}").first).to_be_visible()


def test_details_buttons_sit_above_the_phone_tab_bar(page, deck):
    t = tag()
    cand, proj, ids = two_roles(deck, t)
    page.set_viewport_size({"width": 390, "height": 844})
    deck.isolate(cand, ids)
    login(page, cand)
    page.goto(f"/projects/{proj.id}?role={ids[0]}")
    apply = apply_button(page, f"First {t}")
    expect(apply).to_be_visible()
    tabs = page.get_by_role("navigation", name="Main").last.bounding_box()
    box = apply.bounding_box()
    assert box["y"] + box["height"] <= tabs["y"] + 1, (box, tabs)
    assert box["x"] >= 0 and box["x"] + box["width"] <= 390
    assert page.evaluate("document.documentElement.scrollWidth") <= 390
