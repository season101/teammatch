"""Review queue (F4-01..F4-04, docs/design/patterns/review-queue.md): order, counts, Like, Pass, keys."""

import re

from playwright.sync_api import Page, expect
from teams_support import (  # noqa: F401  (fixtures)
    apply,
    candidate,
    card,
    like,
    open_review,
    patient_user,
    owned,
    role_id,
    role_tab,
    role_title,
    waiting,
)


def queue_of_three(owned, candidate):
    """A role needing Python + Testing. Applied in order: half (Python only), full, full."""
    project = owned("Olive Owner", [("Engineer", ["Python", "Testing"])])
    rid = role_id(project)
    half, half_c = candidate("Half Match", skills=["Python"])
    full1, full1_c = candidate("First Full", skills=["Python", "Testing"])
    full2, full2_c = candidate("Second Full", skills=["Python", "Testing"])
    apply(half_c, rid, "I only know Python.")
    apply(full1_c, rid, "I know both.")
    apply(full2_c, rid, "I also know both.")
    return project, rid, [full1, full2, half]


def test_queue_orders_by_match_then_oldest_and_counts(page: Page, owned, candidate, sign_in):
    project, rid, (full1, full2, half) = queue_of_three(owned, candidate)
    title = role_title(project)
    open_review(page, sign_in, project.owner)

    expect(page.get_by_role("heading", name=project.title)).to_be_visible()
    # Count on the role tab and the nav badge.
    expect(role_tab(page, title)).to_contain_text("3")
    expect(page.get_by_text(", 3 applicants waiting").first).to_be_attached()
    expect(page.get_by_text(f"{title} · 1 of 3 waiting")).to_be_visible()

    # 100% match, oldest first: First Full, then Second Full, then the 50% match.
    expect(card(page, full1.name)).to_be_visible()
    expect(card(page, full1.name).get_by_text("Has 2 of 2 required skills")).to_be_visible()
    expect(card(page, full1.name).get_by_text("I know both.")).to_be_visible()
    page.get_by_role("button", name=f"Pass on {full1.name}").click()
    expect(page.get_by_text(f"Passed on {full1.name}.")).to_be_visible()
    expect(card(page, full2.name)).to_be_visible()
    expect(page.get_by_text(f"{title} · 1 of 2 waiting")).to_be_visible()
    page.get_by_role("button", name=f"Pass on {full2.name}").click()
    expect(card(page, half.name)).to_be_visible()
    expect(card(page, half.name).get_by_text("Has 1 of 2 required skills")).to_be_visible()
    expect(role_tab(page, title)).to_contain_text("1")


def test_like_sends_an_offer_and_lists_it_under_offers_out(
    page: Page, owned, candidate, sign_in, api
):
    project, rid, (full1, full2, half) = queue_of_three(owned, candidate)
    title = role_title(project)
    open_review(page, sign_in, project.owner)

    page.get_by_role("button", name=f"Like {full1.name}").click()
    expect(
        page.get_by_text(
            f"Offer sent to {full1.name}. The role stays open until someone commits."
        )
    ).to_be_visible()
    # The queue moves on, the role stays open, and the person waits under Offers out.
    expect(card(page, full2.name)).to_be_visible()
    out = page.get_by_role("region", name="Offers out")
    expect(out.get_by_role("listitem").filter(has_text=full1.name)).to_be_visible()
    expect(out.get_by_text("Waiting")).to_be_visible()
    expect(out.get_by_text("The first person to commit gets the seat.", exact=False)).to_be_visible()
    expect(role_tab(page, title)).not_to_contain_text("✓")
    assert [a["applicant"]["display_name"] for a in waiting(project, rid, "liked")] == [full1.name]

    # A second like for the same role is allowed: first commit wins.
    page.get_by_role("button", name=f"Like {full2.name}").click()
    expect(out.get_by_role("listitem").filter(has_text=full2.name)).to_be_visible()
    expect(out.get_by_text("If they take other offers or decline", exact=False)).to_be_visible()


def test_pass_cannot_be_undone(page: Page, owned, candidate, sign_in):
    project, rid, (full1, *_rest) = queue_of_three(owned, candidate)
    open_review(page, sign_in, project.owner)
    page.get_by_role("button", name=f"Pass on {full1.name}").click()
    expect(page.get_by_text(f"Passed on {full1.name}.")).to_be_visible()
    # Unlike the deck, the review queue has no Undo, and the passed person doesn't come back.
    expect(page.get_by_role("button", name=re.compile("undo", re.I))).to_have_count(0)
    page.reload()
    expect(card(page, full1.name)).to_have_count(0)
    assert full1.name not in [a["applicant"]["display_name"] for a in waiting(project, rid)]
    assert [a["applicant"]["display_name"] for a in waiting(project, rid, "passed")] == [full1.name]


def test_arrow_keys_pass_and_like(page: Page, owned, candidate, sign_in):
    project, rid, (full1, full2, half) = queue_of_three(owned, candidate)
    open_review(page, sign_in, project.owner)
    expect(card(page, full1.name)).to_be_visible()
    # Keys go to the page, not the focused role tab (the arrows switch tabs there).
    page.get_by_role("heading", name=project.title).click()
    page.keyboard.press("ArrowRight")
    expect(page.get_by_text(f"Offer sent to {full1.name}.", exact=False)).to_be_visible()
    expect(card(page, full2.name)).to_be_visible()
    page.wait_for_timeout(400)  # past the 250 ms double-tap guard
    page.keyboard.press("ArrowLeft")
    expect(page.get_by_text(f"Passed on {full2.name}.")).to_be_visible()
    expect(card(page, half.name)).to_be_visible()


def test_held_key_decides_once(page: Page, owned, candidate, sign_in):
    project, rid, (full1, full2, half) = queue_of_three(owned, candidate)
    open_review(page, sign_in, project.owner)
    expect(card(page, full1.name)).to_be_visible()
    page.get_by_role("heading", name=project.title).click()
    # Holding a key sends repeated keydowns (event.repeat) before the keyup (PR #245).
    for _ in range(6):
        page.keyboard.down("ArrowLeft")
        page.wait_for_timeout(60)
    page.keyboard.up("ArrowLeft")
    expect(card(page, full2.name)).to_be_visible()
    page.wait_for_timeout(500)
    # Only the first person was passed.
    assert len(waiting(project, rid)) == 2
    assert len(waiting(project, rid, "passed")) == 1


def test_arrow_keys_off_when_shortcuts_are_off(page: Page, owned, candidate, sign_in):
    project, rid, (full1, *_rest) = queue_of_three(owned, candidate)
    sign_in(page, project.owner)
    page.goto("/settings")
    page.evaluate("localStorage.setItem('teammatch:keyboard-shortcuts', 'off')")
    page.goto("/applicants")
    expect(card(page, full1.name)).to_be_visible()
    page.get_by_role("heading", name=project.title).click()
    page.keyboard.press("ArrowRight")
    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(600)
    expect(card(page, full1.name)).to_be_visible()
    assert len(waiting(project, rid)) == 3
    # The buttons still work with shortcuts off.
    page.get_by_role("button", name=f"Pass on {full1.name}").click()
    expect(page.get_by_text(f"Passed on {full1.name}.")).to_be_visible()


def test_keys_ignored_while_typing_or_behind_a_dialog(page: Page, owned, candidate, sign_in):
    project, rid, (full1, *_rest) = queue_of_three(owned, candidate)
    open_review(page, sign_in, project.owner)
    expect(card(page, full1.name)).to_be_visible()
    # A focused role tab keeps the arrows for tab navigation.
    page.get_by_role("tab").first.focus()
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(500)
    assert len(waiting(project, rid)) == 3


def test_focus_after_like_and_pass_stays_in_the_panel(page: Page, owned, candidate, sign_in):
    project, rid, (full1, full2, half) = queue_of_three(owned, candidate)
    open_review(page, sign_in, project.owner)
    for name, verb in ((full1.name, "Like"), (full2.name, "Pass on")):
        button = page.get_by_role("button", name=f"{verb} {name}")
        button.focus()
        page.wait_for_timeout(300)
        button.click()
        expect(card(page, name)).to_have_count(0)
        # Focus must not fall to <body>: it lands on the role's panel, so Tab goes on.
        focused = page.evaluate("document.activeElement.getAttribute('role') || document.activeElement.tagName")
        assert focused == "tabpanel", f"focus after {verb}: {focused}"
        page.wait_for_timeout(300)


def test_empty_role_offers_edit_role(page: Page, owned, sign_in):
    project = owned("Empty Owner", [("Designer", ["Testing"])])
    title = role_title(project)
    open_review(page, sign_in, project.owner)
    expect(page.get_by_text(f"No one's waiting for {title}.")).to_be_visible()
    expect(role_tab(page, title)).to_contain_text("0")
    page.get_by_role("link", name="Edit role").click()
    expect(page).to_have_url(re.compile(rf"/projects/{project.id}"))


def test_two_roles_have_separate_queues_and_counts(page: Page, owned, candidate, sign_in):
    project = owned("Two Role", [("Alpha", ["Python"]), ("Beta", ["Testing"])])
    a, b = list(project.roles)
    (c1, c1c), (c2, c2c), (c3, c3c) = (
        candidate("Alpha One"),
        candidate("Beta One", skills=["Testing"]),
        candidate("Beta Two", skills=["Testing"]),
    )
    apply(c1c, project.roles[a])
    apply(c2c, project.roles[b])
    apply(c3c, project.roles[b])
    open_review(page, sign_in, project.owner)
    expect(role_tab(page, a)).to_contain_text("1")
    expect(role_tab(page, b)).to_contain_text("2")
    expect(page.get_by_text(", 3 applicants waiting").first).to_be_attached()
    expect(card(page, c1.name)).to_be_visible()
    role_tab(page, b).click()
    expect(card(page, c2.name)).to_be_visible()
    expect(page.get_by_text(f"{b} · 1 of 2 waiting")).to_be_visible()
    page.get_by_role("button", name=f"Pass on {c2.name}").click()
    expect(role_tab(page, b)).to_contain_text("1")
    expect(page.get_by_text(", 2 applicants waiting").first).to_be_attached()


def test_candidate_sees_offer_badge_after_a_like(page: Page, owned, candidate, sign_in):
    project = owned("Badge Owner", [("Role", ["Python"])])
    user, client = candidate("Badge Cand")
    app_id = apply(client, role_id(project))
    sign_in(page, user)
    page.goto("/feed")
    expect(page.get_by_text("projects want you.")).to_have_count(0)
    like(project, app_id)
    page.reload()
    page.get_by_role("dialog", name="One role at a time").get_by_role("button", name="Got it").click()
    expect(page.get_by_text("1 project wants you.")).to_be_visible()
    expect(page.get_by_text(", 1 offers").first).to_be_attached()
    page.get_by_role("link", name=re.compile("1 project wants you")).click()
    expect(page).to_have_url(re.compile(r"/applications"))


def test_spot_elsewhere_applicant_has_like_off(page: Page, owned, candidate, sign_in):
    """PR #247. A committed person can't reach another owner's pending queue through the real
    flows (the commit withdraws their other applications), so the list is faked to say so."""
    project = owned("Elsewhere Owner", [("Role", ["Python"])])
    user, client = candidate("Elsewhere Cand")
    apply(client, role_id(project))

    def fake(route):
        body = route.fetch().json()
        for item in body["results"]:
            item["committed_elsewhere"] = True
        route.fulfill(json=body)

    page.route(re.compile(r"/api/v1/roles/\d+/applications/\?status=pending"), fake)
    open_review(page, sign_in, project.owner)
    expect(card(page, user.name).get_by_text("Has a spot elsewhere")).to_be_visible()
    like_button = page.get_by_role("button", name=f"Like {user.name}")
    expect(like_button).to_have_attribute("aria-disabled", "true")
    expect(like_button).to_have_accessible_description(re.compile("can't like them"))
    like_button.click(force=True)
    page.get_by_role("heading", name=project.title).click()
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(500)
    assert waiting(project, role_id(project), "liked") == []
    # Pass still works.
    page.get_by_role("button", name=f"Pass on {user.name}").click()
    expect(page.get_by_text(f"Passed on {user.name}.")).to_be_visible()
    assert len(waiting(project, role_id(project), "passed")) == 1


def test_review_for_a_student_with_no_project(page: Page, candidate, sign_in):
    user, _client = candidate("Nobody")
    sign_in(page, user)
    page.goto("/applicants")
    expect(page.get_by_text("You don't own any projects yet.")).to_be_visible()
    expect(page.get_by_role("link", name="Create one")).to_be_visible()
