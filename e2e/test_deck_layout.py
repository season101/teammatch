"""Deck states and layout: closed deck after a commit, phone and desktop widths, dark theme."""

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
from playwright.sync_api import expect


def one_role(deck, t, skills=("Python",)):
    cand = deck.candidate(list(skills))
    proj = deck.project([(f"Lay {t}", ["Python"])], pitch="word " * 120)
    return cand, proj, proj.role_id(f"Lay {t}")


# ---- closed deck -----------------------------------------------------------------------------
def test_deck_closed_after_commit_with_roles_still_open(page, deck):
    t = tag()
    cand = deck.candidate(["Python"], fresh=True)
    proj = deck.project(
        [(f"Seat {t}", ["Python"]), (f"Other {t}", ["Python"])], title=f"Closed {t}", fresh=True
    )
    deck.commit(proj, f"Seat {t}", cand)
    login(page, cand)
    page.goto("/feed")
    expect(page.get_by_role("heading", name=f"You're committed to Closed {t}")).to_be_visible()
    expect(page.get_by_role("link", name="See your commitment")).to_be_visible()
    expect(page.get_by_role("button", name=re.compile("^(Apply to|Pass on)"))).to_have_count(0)
    page.get_by_role("link", name="See your commitment").click()
    expect(page).to_have_url(re.compile(r"/applications"))


def test_deck_closed_for_a_candidate_on_a_locked_team(page, deck):
    t = tag()
    cand = deck.candidate(["Python"], fresh=True)
    proj = deck.project([(f"Only {t}", ["Python"])], title=f"Locked {t}", fresh=True)
    deck.commit(proj, f"Only {t}", cand)
    login(page, cand)
    page.goto("/feed")
    expect(page.get_by_role("heading", name=f"You're on Locked {t}")).to_be_visible()
    expect(page.get_by_role("link", name="Open team chat").first).to_be_visible()
    expect(page.get_by_role("button", name=re.compile("^(Apply to|Pass on)"))).to_have_count(0)


def test_committed_candidate_cannot_apply_through_the_api(deck):
    t = tag()
    cand = deck.candidate(["Python"], fresh=True)
    proj = deck.project([(f"Seat {t}", ["Python"]), (f"Other {t}", ["Python"])], fresh=True)
    deck.commit(proj, f"Seat {t}", cand)
    elsewhere = deck.project([(f"Else {t}", ["Python"])])
    r = cand.client.send(
        "POST", "/api/v1/applications/", {"role": elsewhere.role_id(f"Else {t}"), "note": ""}
    )
    assert r.status == 409


# ---- widths ----------------------------------------------------------------------------------
def test_phone_buttons_are_reachable_above_the_tab_bar(page, deck):
    t = tag()
    cand, proj, rid = one_role(deck, t)
    page.set_viewport_size({"width": 390, "height": 844})
    open_deck(page, deck, cand, [rid], top=f"Lay {t}")
    tabs = page.get_by_role("navigation", name="Main").last.bounding_box()
    for button in (apply_button(page, f"Lay {t}"), pass_button(page, f"Lay {t}")):
        box = button.bounding_box()
        assert box["y"] + box["height"] <= tabs["y"] + 1, (box, tabs)
        assert box["x"] >= 0 and box["x"] + box["width"] <= 390
        assert box["width"] >= 44 and box["height"] >= 44
    assert page.evaluate("document.documentElement.scrollWidth") <= 390
    # And they actually click (nothing covers them).
    apply_button(page, f"Lay {t}").click()
    expect(page.get_by_role("status").filter(has_text=f"Applied to Lay {t}")).to_be_attached()


def test_phone_card_height_is_fixed_and_long_pitch_is_clamped(page, deck):
    t = tag()
    cand, proj, rid = one_role(deck, t)
    page.set_viewport_size({"width": 390, "height": 844})
    open_deck(page, deck, cand, [rid], top=f"Lay {t}")
    card = page.get_by_role("article").first
    box = card.bounding_box()
    assert 22 * 16 <= box["height"] <= 38 * 16 + 1
    assert card.evaluate("e => e.scrollHeight <= e.clientHeight + 1")


def test_small_phone_320_has_no_horizontal_scroll(page, deck):
    t = tag()
    cand, proj, rid = one_role(deck, t)
    page.set_viewport_size({"width": 320, "height": 640})
    open_deck(page, deck, cand, [rid], top=f"Lay {t}")
    assert page.evaluate("document.documentElement.scrollWidth") <= 320
    expect(apply_button(page, f"Lay {t}")).to_be_in_viewport()


def test_desktop_1440_deck_and_buttons(page, deck):
    t = tag()
    cand, proj, rid = one_role(deck, t)
    page.set_viewport_size({"width": 1440, "height": 900})
    open_deck(page, deck, cand, [rid], top=f"Lay {t}")
    expect(apply_button(page, f"Lay {t}")).to_be_in_viewport()
    expect(pass_button(page, f"Lay {t}")).to_be_in_viewport()
    expect(page.get_by_role("complementary", name="Keyboard shortcuts")).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth") <= 1440
    box = page.get_by_role("article").first.bounding_box()
    assert 22 * 16 <= box["height"] <= 38 * 16 + 1


def test_dark_theme_deck_is_readable(page, deck):
    t = tag()
    cand, proj, rid = one_role(deck, t)
    page.add_init_script("localStorage.setItem('teammatch:theme', 'dark')")
    open_deck(page, deck, cand, [rid], top=f"Lay {t}")
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    card = page.get_by_role("article").first
    bg = card.evaluate("e => getComputedStyle(e).backgroundColor")
    page_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    fg = card.evaluate("e => getComputedStyle(e.querySelector('h2')).color")

    def lum(rgb):
        r, g, b = (int(x) for x in re.findall(r"\d+", rgb)[:3])
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

    assert lum(page_bg) < 0.3 and lum(bg) < 0.4, (page_bg, bg)  # dark surfaces
    assert lum(fg) > 0.6, fg  # light text
    expect(page.get_by_text("100% match")).to_be_visible()
    expect(apply_button(page, f"Lay {t}")).to_be_in_viewport()


def test_dark_theme_phone_buttons_above_tab_bar(page, deck):
    t = tag()
    cand, proj, rid = one_role(deck, t)
    page.set_viewport_size({"width": 390, "height": 844})
    page.add_init_script("localStorage.setItem('teammatch:theme', 'dark')")
    open_deck(page, deck, cand, [rid], top=f"Lay {t}")
    tabs = page.get_by_role("navigation", name="Main").last.bounding_box()
    box = apply_button(page, f"Lay {t}").bounding_box()
    assert box["y"] + box["height"] <= tabs["y"] + 1


def test_coach_marks_show_once_on_a_first_deck(page, deck):
    t = tag()
    cand, proj, rid = one_role(deck, t)
    deck.isolate(cand, [rid])
    login(page, cand, coach=False)
    page.goto("/feed")
    dialog = page.get_by_role("dialog", name="One role at a time")
    expect(dialog).to_be_visible()
    dialog.get_by_role("button", name="Got it").click()
    expect(dialog).to_have_count(0)
    page.reload()
    expect_top(page, f"Lay {t}")
    expect(page.get_by_role("dialog", name="One role at a time")).to_have_count(0)
