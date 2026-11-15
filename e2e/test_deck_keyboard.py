"""F3-09: keyboard shortcuts on the deck, the Settings switch and the legend (PR #245)."""

import re

import pytest
from deck_support import (  # noqa: F401
    apply_button,
    deck,
    expect_top,
    open_deck,
    pass_button,
    pool,
    set_shortcuts,
    tag,
)
from playwright.sync_api import expect


def setup(page, deck, t, n=3):
    cand = deck.candidate(["Python"])
    projs = [
        deck.project([(f"R{i} {t}", ["Python"] if i == 0 else ["Python", "Figma"])])
        for i in range(n)
    ]
    # Ranked by match %: R0 100%, then R1.. 50%, newest first among those.
    ids = [p.role_id(f"R{i} {t}") for i, p in enumerate(projs)]
    return cand, projs, ids


def focus_deck(page):
    page.get_by_role("group", name="Deck of open roles").focus()


def test_arrow_keys_decide_when_shortcuts_are_on(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    focus_deck(page)
    page.keyboard.press("ArrowLeft")
    expect_top(page, f"R2 {t}")
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("status").filter(has_text=f"Applied to R2 {t}")).to_be_attached()
    expect_top(page, f"R1 {t}")
    assert ids[2] in [a["role"]["id"] for a in _apps(cand)]


def _apps(cand):
    rows = cand.client.send("GET", "/api/v1/applications/mine/").json()
    return rows.get("results", rows) if isinstance(rows, dict) else rows


def test_keys_do_nothing_when_shortcuts_are_off(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    set_shortcuts(page, False)
    page.goto("/feed")
    expect_top(page, f"R0 {t}")
    focus_deck(page)
    for key in ("ArrowLeft", "ArrowRight", "ArrowUp", "z"):
        page.keyboard.press(key)
    page.wait_for_timeout(600)
    expect_top(page, f"R0 {t}")
    expect(page).to_have_url(re.compile(r"/feed$"))
    assert _apps(cand) == [] or ids[0] not in [a["role"]["id"] for a in _apps(cand)]
    assert ids[0] in [r["id"] for r in deck.feed(cand)]
    # The buttons still work.
    pass_button(page, f"R0 {t}").click()
    expect_top(page, f"R2 {t}")


def test_shortcuts_come_back_when_turned_on_again(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    set_shortcuts(page, False)
    set_shortcuts(page, True)
    page.goto("/feed")
    focus_deck(page)
    page.keyboard.press("ArrowLeft")
    expect_top(page, f"R2 {t}")


def test_holding_a_key_decides_once(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    focus_deck(page)
    page.keyboard.down("ArrowLeft")
    for _ in range(5):
        page.keyboard.down("ArrowLeft")  # auto-repeat: the same key, still held
    page.keyboard.up("ArrowLeft")
    expect_top(page, f"R2 {t}")
    page.wait_for_timeout(600)
    expect_top(page, f"R2 {t}")  # one pass, not six
    feed = [r["id"] for r in deck.feed(cand)]
    assert ids[2] in feed and ids[1] in feed


def test_modifier_arrows_are_left_alone(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    focus_deck(page)
    page.keyboard.press("Shift+ArrowRight")
    page.keyboard.press("Control+ArrowLeft")
    page.wait_for_timeout(400)
    expect_top(page, f"R0 {t}")


def test_keys_ignored_while_typing_in_a_field(page, deck):
    """On the details page the note is a text field; Z and arrows there must not hit the deck."""
    t = tag()
    cand, proj, ids = setup(page, deck, t, n=1)
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    focus_deck(page)
    page.keyboard.press("ArrowUp")
    page.get_by_role("button", name="Add a note").click()
    box = page.get_by_label("Note to the owner (optional)")
    box.type("zzz ")
    box.press("ArrowLeft")
    expect(box).to_have_value("zzz ")
    expect(page).to_have_url(re.compile(r"/projects/\d+\?role="))


def test_legend_lists_exactly_the_keys_that_work(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    page.set_viewport_size({"width": 1440, "height": 900})
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    legend = page.get_by_role("complementary", name="Keyboard shortcuts")
    expect(legend).to_be_visible()
    items = legend.get_by_role("listitem")
    # Enter joined ↑ with F3-13, and only the deck itself takes it.
    expect(items).to_have_text(
        [re.compile("←\\s*Pass"), re.compile("→\\s*Apply"),
         re.compile("↑( / Enter)?\\s*Details"), re.compile("Z\\s*Undo pass")]
    )
    # Every listed key works: ↑ opens details, Z undoes a pass, ← passes, → applies.
    focus_deck(page)
    page.keyboard.press("ArrowLeft")
    expect_top(page, f"R2 {t}")
    page.keyboard.press("z")
    expect_top(page, f"R0 {t}")
    page.keyboard.press("ArrowUp")
    expect(page).to_have_url(re.compile(r"\?role="))


def test_legend_hide_and_shortcuts_off(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    page.set_viewport_size({"width": 1440, "height": 900})
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    legend = page.get_by_role("complementary", name="Keyboard shortcuts")
    expect(legend).to_be_visible()
    legend.get_by_role("button", name="Hide").click()
    expect(legend).to_have_count(0)
    set_shortcuts(page, False)
    page.goto("/feed")
    expect_top(page, f"R0 {t}")
    expect(page.get_by_role("complementary", name="Keyboard shortcuts")).to_have_count(0)


def test_legend_is_not_shown_on_a_phone(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    page.set_viewport_size({"width": 390, "height": 844})
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    expect(page.get_by_role("complementary", name="Keyboard shortcuts")).to_be_hidden()


def test_deck_group_advertises_its_keys_only_when_enabled(page, deck):
    t = tag()
    cand, _, ids = setup(page, deck, t)
    open_deck(page, deck, cand, ids, top=f"R0 {t}")
    group = page.get_by_role("group", name="Deck of open roles")
    expect(group).to_have_attribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp Z")
    set_shortcuts(page, False)
    page.goto("/feed")
    expect_top(page, f"R0 {t}")
    expect(group).not_to_have_attribute("aria-keyshortcuts", re.compile("."))
