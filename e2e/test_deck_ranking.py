"""F3-04: the deck ranks roles by match %, then newest. Each test builds its own roles and keeps
only them in the candidate's deck, so other sessions' projects don't change the order."""

import re

from deck_support import deck, expect_top, open_deck, pool, tag  # noqa: F401
from playwright.sync_api import expect


def _build(deck, t):
    """A candidate with Python+Docker. Roles are created best first, so newest-first would
    show them in the opposite order."""
    cand = deck.candidate(["Python", "Docker"])
    two = deck.project([(f"Both {t}", ["Python", "Docker"])])
    one = deck.project([(f"Half {t}", ["Python", "Figma"])])
    zero = deck.project([(f"None {t}", ["Figma", "Java"])])
    ids = {
        "both": two.role_id(f"Both {t}"),
        "half": one.role_id(f"Half {t}"),
        "none": zero.role_id(f"None {t}"),
    }
    return cand, ids


def test_api_ranks_by_match_then_newest(deck):
    t = tag()
    cand, ids = _build(deck, t)
    mine = [r for r in deck.feed(cand) if r["id"] in ids.values()]
    assert [r["id"] for r in mine] == [ids["both"], ids["half"], ids["none"]]
    assert [r["match_percent"] for r in mine] == [100, 50, 0]


def test_ui_card_order_and_badges(page, deck):
    t = tag()
    cand, ids = _build(deck, t)
    open_deck(page, deck, cand, ids.values(), top=f"Both {t}")
    expect(page.get_by_text("100% match")).to_be_visible()
    page.get_by_role("group", name="Deck of open roles").focus()
    page.keyboard.press("ArrowLeft")
    expect_top(page, f"Half {t}")
    expect(page.get_by_text("50% match").first).to_be_visible()
    page.keyboard.press("ArrowLeft")
    expect_top(page, f"None {t}")
    expect(page.get_by_text("0% match").first).to_be_visible()


def test_equal_match_is_newest_first(deck):
    t = tag()
    cand = deck.candidate(["Python"])
    first = deck.project([(f"Older {t}", ["Python"])])
    second = deck.project([(f"Newer {t}", ["Python"])])
    ids = [second.role_id(f"Newer {t}"), first.role_id(f"Older {t}")]
    mine = [r["id"] for r in deck.feed(cand) if r["id"] in ids]
    assert mine == ids


def test_higher_share_beats_newer(deck):
    t = tag()
    cand = deck.candidate(["Python", "Docker", "Git"])
    # Fewer overlapping skills but a bigger share beats more overlap: 1 of 1 over 2 of 3.
    good = deck.project([(f"Good {t}", ["Python"])])  # 100%, 1 overlap
    meh = deck.project([(f"Meh {t}", ["Python", "Docker", "Figma"])])  # 67%, 2 overlap, newer
    ids = [good.role_id(f"Good {t}"), meh.role_id(f"Meh {t}")]
    mine = [r for r in deck.feed(cand) if r["id"] in ids]
    assert [r["id"] for r in mine] == ids
    assert [r["match_percent"] for r in mine][0] == 100
    assert [r["match_percent"] for r in mine][1] in (66, 67)


def test_same_roles_rank_differently_for_different_candidates(deck):
    t = tag()
    py, fig = deck.candidate(["Python"]), deck.candidate(["Figma"])
    a = deck.project([(f"PyRole {t}", ["Python"])])
    b = deck.project([(f"FigRole {t}", ["Figma"])])
    ids = {a.role_id(f"PyRole {t}"): "py", b.role_id(f"FigRole {t}"): "fig"}

    def order(c):
        return [ids[r["id"]] for r in deck.feed(c) if r["id"] in ids]

    assert order(py) == ["py", "fig"]
    assert order(fig) == ["fig", "py"]


def test_no_skills_candidate_sees_newest_first_and_is_prompted(page, deck):
    t = tag()
    cand = deck.candidate([])
    old = deck.project([(f"Old {t}", ["Python"])])
    new = deck.project([(f"New {t}", ["Figma"])])
    ids = [new.role_id(f"New {t}"), old.role_id(f"Old {t}")]
    mine = [r for r in deck.feed(cand) if r["id"] in ids]
    assert [r["id"] for r in mine] == ids
    # Newest-first means any role other sessions post meanwhile can sit above mine, so the
    # UI check is only that the deck shows cards and the prompt.
    open_deck(page, deck, cand, ids)
    expect(page.get_by_role("button", name=re.compile("^Apply to")).first).to_be_visible()
    # F3-04: prompted to add skills (Finish setup in the desktop nav).
    expect(page.get_by_role("link", name="Add your skills")).to_be_visible()
