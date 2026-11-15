"""F3-03, F3-05, F3-10, F3-11: apply, pass, undo and "show passed roles again" on the deck."""

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


def three_roles(deck, t, skills=("Python",)):
    """Three roles, ranked A, B, C for a Python candidate (A newest-created is last, so the
    order comes from the match %: 100, 50, 0)."""
    cand = deck.candidate(list(skills))
    a = deck.project([(f"A {t}", ["Python"])])
    b = deck.project([(f"B {t}", ["Python", "Figma"])])
    c = deck.project([(f"C {t}", ["Figma"])])
    ids = [a.role_id(f"A {t}"), b.role_id(f"B {t}"), c.role_id(f"C {t}")]
    return cand, [a, b, c], ids


def focus_deck(page: Page):
    page.get_by_role("group", name="Deck of open roles").focus()


def my_apps(deck, cand):
    rows = cand.client.send("GET", "/api/v1/applications/mine/").json()
    return rows.get("results", rows) if isinstance(rows, dict) else rows


def passed_toast(page, title):
    return page.get_by_text(f"Passed on {title}", exact=True)


# ---- apply ---------------------------------------------------------------------------------
def test_apply_with_the_button(page, deck):
    t = tag()
    cand, projs, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    apply_button(page, f"A {t}").click()
    expect(page.get_by_role("status").filter(has_text=f"Applied to A {t}")).to_be_attached()
    expect_top(page, f"B {t}")
    apps = my_apps(deck, cand)
    assert [a["role"]["id"] for a in apps if a["role"]["id"] in ids] == [ids[0]]
    # The owner sees them, pending.
    queue = projs[0].client.send("GET", f"/api/v1/roles/{ids[0]}/applications/").json()
    queue = queue.get("results", queue) if isinstance(queue, dict) else queue
    assert len(queue) == 1


def test_apply_with_the_right_arrow(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    focus_deck(page)
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("status").filter(has_text=f"Applied to A {t}")).to_be_attached()
    expect_top(page, f"B {t}")
    assert ids[0] in [a["role"]["id"] for a in my_apps(deck, cand)]


def test_apply_by_dragging_the_card_right(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    box = page.get_by_role("article").first.bounding_box()
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 3
    page.mouse.move(x, y)
    page.mouse.down()
    for step in range(1, 11):
        page.mouse.move(x + box["width"] * 0.08 * step, y, steps=2)
    page.mouse.up()
    expect(page.get_by_role("status").filter(has_text=f"Applied to A {t}")).to_be_attached()
    expect_top(page, f"B {t}")


def test_pass_by_dragging_the_card_left(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    box = page.get_by_role("article").first.bounding_box()
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 3
    page.mouse.move(x, y)
    page.mouse.down()
    for step in range(1, 11):
        page.mouse.move(x - box["width"] * 0.08 * step, y, steps=2)
    page.mouse.up()
    expect(page.get_by_role("status").filter(has_text=f"Passed on A {t}")).to_be_attached()
    expect_top(page, f"B {t}")


def test_a_short_drag_springs_back(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    box = page.get_by_role("article").first.bounding_box()
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 3
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + box["width"] * 0.1, y, steps=10)
    page.mouse.up()
    page.wait_for_timeout(800)  # the spring-back takes half a second
    expect_top(page, f"A {t}")
    assert my_apps(deck, cand) == [] or ids[0] not in [a["role"]["id"] for a in my_apps(deck, cand)]


def test_applied_role_does_not_come_back_after_leaving_and_returning(page, deck):
    """The cache fix: apply, go to My applications, come back to Discover."""
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    apply_button(page, f"A {t}").click()
    expect_top(page, f"B {t}")
    page.goto("/applications")
    expect(page.get_by_text(f"A {t}").first).to_be_visible()
    page.go_back()
    expect_top(page, f"B {t}")
    # Client-side navigation through the nav, not a reload.
    page.get_by_role("link", name=re.compile("^Projects")).first.click()
    expect(page).to_have_url(re.compile("/projects"))
    page.get_by_role("link", name=re.compile("^Discover")).first.click()
    expect(page).to_have_url(re.compile("/feed"))
    expect_top(page, f"B {t}")
    expect(page.get_by_role("button", name=re.compile(f"^Apply to A {t}"))).to_have_count(0)


def test_passed_role_does_not_come_back_after_reload(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    pass_button(page, f"A {t}").click()
    expect_top(page, f"B {t}")
    page.reload()
    expect_top(page, f"B {t}")
    assert ids[0] not in [r["id"] for r in deck.feed(cand)]


def test_deciding_the_last_card_shows_all_caught_up(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    apply_button(page, f"A {t}").click()
    pass_button(page, f"B {t}").click()
    pass_button(page, f"C {t}").click()
    expect(page.get_by_role("heading", name="You're all caught up")).to_be_visible()
    expect(page.get_by_role("link", name="Browse projects")).to_be_visible()
    expect(page.get_by_role("button", name="Show passed roles again")).to_be_visible()


# ---- pass ----------------------------------------------------------------------------------
def test_pass_with_the_button_saves_a_dismissal(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    pass_button(page, f"A {t}").click()
    expect(page.get_by_role("status").filter(has_text=f"Passed on A {t}")).to_be_attached()
    expect_top(page, f"B {t}")
    assert ids[0] not in [r["id"] for r in deck.feed(cand)]
    assert my_apps(deck, cand) == [] or ids[0] not in [a["role"]["id"] for a in my_apps(deck, cand)]


def test_pass_with_the_left_arrow(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    focus_deck(page)
    page.keyboard.press("ArrowLeft")
    expect(page.get_by_role("status").filter(has_text=f"Passed on A {t}")).to_be_attached()
    expect_top(page, f"B {t}")


def test_owner_is_not_told_about_a_pass(deck):
    t = tag()
    cand = deck.candidate(["Python"])
    proj = deck.project([(f"Quiet {t}", ["Python"])])
    rid = proj.role_id(f"Quiet {t}")
    assert cand.client.send("POST", f"/api/v1/roles/{rid}/dismiss/").status == 204
    queue = proj.client.send("GET", f"/api/v1/roles/{rid}/applications/").json()
    assert (queue.get("results", queue) if isinstance(queue, dict) else queue) == []


# ---- undo ----------------------------------------------------------------------------------
def test_pass_toast_undo_restores_the_card(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    pass_button(page, f"A {t}").click()
    expect(passed_toast(page, f"A {t}")).to_be_visible()
    expect_top(page, f"B {t}")
    page.get_by_role("button", name="Undo", exact=True).click()
    expect_top(page, f"A {t}")
    assert ids[0] in [r["id"] for r in deck.feed(cand)]
    expect(passed_toast(page, f"A {t}")).to_have_count(0)


def test_pass_toast_goes_after_a_few_seconds(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    pass_button(page, f"A {t}").click()
    expect(passed_toast(page, f"A {t}")).to_be_visible()
    expect(passed_toast(page, f"A {t}")).to_have_count(0, timeout=8_000)


def test_undo_button_and_z_key(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    undo = page.get_by_role("button", name="Undo your last pass")
    expect(undo).to_be_disabled()  # nothing to undo yet
    pass_button(page, f"A {t}").click()
    expect_top(page, f"B {t}")
    expect(undo).to_be_enabled()
    undo.click()
    expect_top(page, f"A {t}")
    expect(undo).to_be_disabled()
    # Z does the same.
    pass_button(page, f"A {t}").click()
    expect_top(page, f"B {t}")
    focus_deck(page)
    page.keyboard.press("z")
    expect_top(page, f"A {t}")
    assert ids[0] in [r["id"] for r in deck.feed(cand)]


def test_undo_brings_back_only_the_last_pass(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    pass_button(page, f"A {t}").click()
    pass_button(page, f"B {t}").click()
    expect_top(page, f"C {t}")
    page.get_by_role("button", name="Undo your last pass").click()
    expect_top(page, f"B {t}")
    expect(page.get_by_role("button", name="Undo your last pass")).to_be_disabled()
    feed = [r["id"] for r in deck.feed(cand)]
    assert ids[1] in feed and ids[0] not in feed


def test_undo_is_off_after_an_apply(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    pass_button(page, f"A {t}").click()
    apply_button(page, f"B {t}").click()
    expect_top(page, f"C {t}")
    expect(page.get_by_role("button", name="Undo your last pass")).to_be_disabled()
    focus_deck(page)
    page.keyboard.press("z")
    page.wait_for_timeout(500)
    expect_top(page, f"C {t}")


def test_undo_after_the_pass_emptied_the_deck(page, deck):
    t = tag()
    cand = deck.candidate(["Python"])
    proj = deck.project([(f"Solo {t}", ["Python"])])
    rid = proj.role_id(f"Solo {t}")
    open_deck(page, deck, cand, [rid], top=f"Solo {t}")
    pass_button(page, f"Solo {t}").click()
    expect(page.get_by_role("heading", name="You're all caught up")).to_be_visible()
    undo = page.get_by_role("button", name="Undo your last pass")
    expect(undo).to_be_enabled()
    undo.click()
    expect_top(page, f"Solo {t}")


def test_undo_is_forgotten_after_leaving_the_deck(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids, top=f"A {t}")
    pass_button(page, f"A {t}").click()
    expect_top(page, f"B {t}")
    page.goto("/applications")
    page.goto("/feed")
    expect_top(page, f"B {t}")
    expect(page.get_by_role("button", name="Undo your last pass")).to_be_disabled()


# ---- show passed roles again ---------------------------------------------------------------
def _after_reset(page, deck, cand):
    """The reset also brings back passes on other sessions' roles, so a stranger may be on top:
    the check is on the candidate's feed, and that the deck shows cards again."""
    expect(page.get_by_role("button", name=re.compile("^Apply to")).first).to_be_visible()
    return [r["id"] for r in deck.feed(cand)]


def test_show_passed_roles_again_brings_passed_roles_back(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids[:2], top=f"A {t}")
    pass_button(page, f"A {t}").click()
    pass_button(page, f"B {t}").click()
    expect(page.get_by_role("heading", name="You're all caught up")).to_be_visible()
    page.get_by_role("button", name="Show passed roles again").click()
    feed = _after_reset(page, deck, cand)
    assert ids[0] in feed and ids[1] in feed


def test_show_passed_roles_again_leaves_applied_roles_out(page, deck):
    t = tag()
    cand, _, ids = three_roles(deck, t)
    open_deck(page, deck, cand, ids[:2], top=f"A {t}")
    apply_button(page, f"A {t}").click()
    pass_button(page, f"B {t}").click()
    expect(page.get_by_role("heading", name="You're all caught up")).to_be_visible()
    page.get_by_role("button", name="Show passed roles again").click()
    feed = _after_reset(page, deck, cand)
    assert ids[1] in feed and ids[0] not in feed


def test_show_passed_roles_again_with_no_passes(page, deck):
    """Other sessions' roles would come back on a real reset, so the deck is faked empty."""
    cand = deck.candidate(["Python"])
    login(page, cand)
    empty = {"next": None, "previous": None, "results": []}
    page.route(
        re.compile(r"/api/v1/feed/(\?.*)?$"), lambda route: route.fulfill(json=empty)
    )
    page.route(re.compile(r"/api/v1/feed/reset/"), lambda route: route.fulfill(status=204))
    page.goto("/feed")
    expect(page.get_by_role("heading", name="You're all caught up")).to_be_visible()
    page.get_by_role("button", name="Show passed roles again").click()
    expect(page.get_by_text("No passed roles to bring back.").last).to_be_visible()
    expect(page.get_by_role("button", name="Show passed roles again")).to_have_count(0)


def test_reset_leaves_other_candidates_passes_alone(deck):
    t = tag()
    one, other = deck.candidate(["Python"]), deck.candidate(["Python", "Git"])
    proj = deck.project([(f"Shared {t}", ["Python"])])
    rid = proj.role_id(f"Shared {t}")
    assert one.client.send("POST", f"/api/v1/roles/{rid}/dismiss/").status == 204
    assert other.client.send("POST", f"/api/v1/roles/{rid}/dismiss/").status == 204
    assert one.client.send("POST", "/api/v1/feed/reset/").status == 204
    assert rid in [r["id"] for r in deck.feed(one)]
    assert rid not in [r["id"] for r in deck.feed(other)]


# ---- errors --------------------------------------------------------------------------------
def test_applying_to_a_role_filled_meanwhile_does_not_break_the_deck(page, deck):
    """Two roles on one project; someone else takes the top one while it is on screen."""
    t = tag()
    cand = deck.candidate(["Python"])
    rival = deck.candidate(["Python", "Docker"], fresh=True)
    proj = deck.project([(f"Top {t}", ["Python"]), (f"Next {t}", ["Figma"])], fresh=True)
    ids = [proj.role_id(f"Top {t}"), proj.role_id(f"Next {t}")]
    open_deck(page, deck, cand, ids, top=f"Top {t}")
    deck.commit(proj, f"Top {t}", rival)  # fills Top while the page still shows it
    apply_button(page, f"Top {t}").click()
    expect_top(page, f"Next {t}")  # the deck moves on rather than getting stuck
    expect(page.get_by_role("alert")).to_be_visible()
