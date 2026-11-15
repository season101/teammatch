"""Offers and commit (F4-10, F4-11, docs/design/patterns/commit-flow.md), plus the team lock."""

import re

from playwright.sync_api import Page, expect
from teams_support import (  # noqa: F401  (fixtures)
    apply,
    assert_celebration,
    candidate,
    commit,
    like,
    my_apps,
    owned,
    patient_user,
    role_id,
    role_tab,
    role_title,
    team_of,
    waiting,
)


def confirm_commit(page: Page, project_title):
    dialog = page.get_by_role("dialog", name=f"Commit to {project_title}?")
    dialog.get_by_role("button", name=f"Commit to {project_title}").click()


def test_candidate_sees_offer_and_declines_it(page: Page, owned, candidate, sign_in):
    project = owned("Decline Owner", [("Role", ["Python"])])
    rid = role_id(project)
    user, client = candidate("Decline Cand")
    app_id = apply(client, rid)
    like(project, app_id)

    sign_in(page, user)
    page.goto("/applications")
    # Offers opens first when there are offers.
    expect(page.get_by_role("tab", name="Offers 1")).to_have_attribute("aria-selected", "true")
    expect(page.get_by_text("Commit to one. Your other offers close when you do.")).to_be_visible()
    seat = page.get_by_role("article", name=f"{role_title(project)} on {project.title}")
    expect(seat.get_by_text("liked you")).to_be_visible()
    expect(seat.get_by_text("0 of 1 roles filled")).to_be_visible()

    page.get_by_role("button", name=f"Decline {role_title(project)} on {project.title}").click()
    dialog = page.get_by_role("dialog", name="Decline this offer?")
    expect(dialog).to_contain_text("You can't get this offer back.")
    # The safe choice is the primary button.
    dialog.get_by_role("button", name="Keep this offer").click()
    expect(dialog).not_to_be_visible()
    assert my_apps(client)[0]["status"] == "liked"

    page.get_by_role("button", name=f"Decline {role_title(project)} on {project.title}").click()
    page.get_by_role("dialog", name="Decline this offer?").get_by_role(
        "button", name="Decline", exact=True
    ).click()
    expect(page.get_by_role("tabpanel").get_by_text("Nothing here.")).to_be_visible()
    page.get_by_role("tab", name="Closed").click()
    expect(page.get_by_role("tabpanel").get_by_text("You declined on")).to_be_visible()
    # The role stays open and the owner sees the decline.
    assert [a["applicant"]["display_name"] for a in waiting(project, rid, "declined")] == [user.name]
    assert waiting(project, rid, "liked") == []
    assert project.client.send("GET", f"/api/v1/projects/{project.id}/").json()["roles"][0]["status"] == "open"


def test_commit_dialog_guards_then_commit_closes_everything_else(
    page: Page, owned, candidate, sign_in
):
    # Two offers and one pending application. The target project has two roles, so no lock.
    target = owned("Target Owner", [("Front", ["Python"]), ("Back", ["Testing"])])
    other = owned("Other Owner", [("Role", ["Python"])])
    pend = owned("Pending Owner", [("Role", ["Python"])])
    user, client = candidate("Commit Cand")
    a_target = apply(client, role_id(target, "Front"), "Pick me.")
    a_other = apply(client, role_id(other))
    apply(client, role_id(pend))
    like(target, a_target)
    like(other, a_other)

    sign_in(page, user)
    page.goto("/feed")
    expect(page.get_by_text("2 projects want you.")).to_be_visible()
    expect(page.get_by_text(", 2 offers").first).to_be_attached()
    page.goto("/applications")
    expect(page.get_by_role("tab", name="Offers 2")).to_be_visible()
    front = role_title(target, "Front")
    page.get_by_role("button", name=f"Commit to {front} on {target.title}").click()
    dialog = page.get_by_role("dialog", name=f"Commit to {target.title}?")
    expect(dialog).to_contain_text(
        f"You take the {front} seat. Your 1 other offer and 1 pending application close, "
        "and you can't undo this."
    )
    # Focus starts on the safe button, so Enter can't commit.
    expect(dialog.get_by_role("button", name="Keep my options")).to_be_focused()
    page.keyboard.press("Enter")
    expect(dialog).not_to_be_visible()
    assert {a["status"] for a in my_apps(client)} == {"liked", "pending"}
    page.get_by_role("button", name=f"Commit to {front} on {target.title}").click()
    page.keyboard.press("Escape")
    expect(dialog).not_to_be_visible()
    assert {a["status"] for a in my_apps(client)} == {"liked", "pending"}

    page.get_by_role("button", name=f"Commit to {front} on {target.title}").click()
    confirm_commit(page, target.title)
    # Lands on Committed with the seat, what's left, and what closed.
    expect(page.get_by_role("tab", name="Committed")).to_have_attribute("aria-selected", "true")
    expect(page.get_by_text("You're in. Team chat opens when the last role fills.")).to_be_visible()
    expect(page.get_by_text(f"1 role left: {role_title(target, 'Back')}")).to_be_visible()
    expect(page.get_by_text("Closed when you committed", exact=True).first).to_be_visible()
    expect(page.get_by_role("tabpanel").get_by_text("Closed when you committed.")).to_have_count(2)
    page.get_by_role("tab", name="Closed").click()
    expect(page.get_by_role("tabpanel").get_by_text("Closed when you committed.")).to_have_count(2)
    page.get_by_role("tab", name="Offers").click()
    expect(page.get_by_role("tabpanel").get_by_text("Nothing here.")).to_be_visible()

    # Deck closed (screen 32), badges cleared.
    page.goto("/feed")
    expect(page.get_by_text(f"You're committed to {target.title}")).to_be_visible()
    expect(page.get_by_text("projects want you.")).to_have_count(0)
    # Applying elsewhere is refused.
    third = owned("Late Owner", [("Role", ["Python"])])
    late = client.send(
        "POST", "/api/v1/applications/", {"role": role_id(third), "note": ""}
    )
    assert late.status == 409, late.text()
    # Not locked yet: no team.
    assert team_of(client) is None

    # The two other owners lost the candidate: no pending, no offer.
    assert waiting(other, role_id(other), "liked") == []
    assert waiting(pend, role_id(pend)) == []


def test_owner_review_shows_filled_role_after_commit(page: Page, owned, candidate, sign_in):
    project = owned("Filled Owner", [("Front", ["Python"]), ("Back", ["Python"])])
    front, back = role_id(project, "Front"), role_id(project, "Back")
    winner, winner_c = candidate("Winner")
    loser, loser_c = candidate("Loser")
    w_app = apply(winner_c, front)
    l_app = apply(loser_c, front)
    like(project, w_app)
    like(project, l_app)
    assert commit(winner_c, w_app).ok
    # First commit wins: the other offer is closed, and its commit is refused.
    refused = commit(loser_c, l_app)
    assert refused.status == 409, refused.text()
    assert [a["status"] for a in my_apps(loser_c)] == ["passed"]

    sign_in(page, project.owner)
    page.goto("/applicants")
    front_title = role_title(project, "Front")
    expect(role_tab(page, front_title)).to_contain_text("✓")
    role_tab(page, front_title).click()
    expect(page.get_by_role("heading", name=f"{winner.name} committed")).to_be_visible()
    expect(page.get_by_text(f"{front_title} is filled. Your team locks when the other role fills.")).to_be_visible()
    others = page.get_by_role("region", name="Other people on this role")
    expect(others.get_by_text(loser.name)).to_be_visible()
    expect(others.get_by_text("Closed")).to_be_visible()
    # The other role's queue still works and there's no lock yet.
    assert team_of(project.client) is None
    assert back in project.roles.values()


def test_loser_sees_picked_someone_else_and_stale_commit_is_refused(
    two_pages, owned, candidate, sign_in
):
    project = owned("Race Owner", [("Role", ["Python"])])
    rid = role_id(project)
    first, first_c = candidate("First")
    second, second_c = candidate("Second")
    a1, a2 = apply(first_c, rid), apply(second_c, rid)
    like(project, a1)
    like(project, a2)

    page, _unused = two_pages()
    sign_in(page, second)
    page.goto("/applications")
    page.get_by_role("button", name=f"Commit to {role_title(project)} on {project.title}").click()
    # The role fills while the dialog is open.
    assert commit(first_c, a1).ok
    confirm_commit(page, project.title)
    expect(page.get_by_role("alert")).to_be_visible()
    page.reload()
    page.get_by_role("tab", name="Closed").click()
    expect(page.get_by_text("picked someone else.")).to_be_visible()
    # No Commit button for a closed offer.
    expect(page.get_by_role("button", name=re.compile("^Commit to"))).to_have_count(0)


def test_two_owners_like_same_candidate_first_commit_wins(
    two_pages, owned, candidate, sign_in
):
    one = owned("Owner One", [("Front", ["Python"]), ("Back", ["Python"])])
    two = owned("Owner Two", [("Front", ["Python"]), ("Back", ["Python"])])
    user, client = candidate("Popular Cand")
    a1 = apply(client, role_id(one, "Front"))
    a2 = apply(client, role_id(two, "Front"))
    like(one, a1)
    like(two, a2)

    page, owner_two_page = two_pages()
    sign_in(page, user)
    page.goto("/applications")
    expect(page.get_by_role("tab", name="Offers 2")).to_be_visible()
    sign_in(owner_two_page, two.owner)
    owner_two_page.goto("/applicants")
    expect(
        owner_two_page.get_by_role("region", name="Offers out")
        .get_by_role("listitem")
        .filter(has_text=user.name)
    ).to_be_visible()

    page.get_by_role("button", name=f"Commit to {role_title(one, 'Front')} on {one.title}").click()
    confirm_commit(page, one.title)
    expect(page.get_by_text("You're in.")).to_be_visible()

    # Owner two's offer went away. The person has a spot elsewhere, and can't be liked again.
    owner_two_page.reload()
    expect(owner_two_page.get_by_role("region", name="Offers out")).to_have_count(0)
    expect(owner_two_page.get_by_text(user.name)).to_have_count(0)
    assert waiting(two, role_id(two, "Front"), "liked") == []
    assert my_apps(client)[0]["status"] in ("committed", "withdrawn")
    again = two.client.send("POST", f"/api/v1/applications/{a2}/like/")
    assert again.status == 409, again.text()


def test_owner_with_open_project_can_be_liked_but_must_close_it_first(
    page: Page, owned, candidate, sign_in, api
):
    """DD-33: like works for an owner of an open project. Commit is blocked until they close it."""
    mine = owned("Both Hats", [("Role", ["Python"])], title="Both Hats Project")
    theirs = owned("Other Hat", [("Role", ["Python"])])
    app_id = apply(mine.client, role_id(theirs))  # the owner applies elsewhere
    like(theirs, app_id)  # allowed (DD-33)

    sign_in(page, mine.owner)
    page.goto("/applications")
    page.get_by_role("button", name=f"Commit to {role_title(theirs)} on {theirs.title}").click()
    confirm_commit(page, theirs.title)
    dialog = page.get_by_role("dialog", name="Close your project first?")
    expect(dialog).to_contain_text(f"You own {mine.title}, which is still open.")
    expect(dialog.get_by_role("link", name=f"Go to {mine.title}")).to_have_attribute(
        "href", f"/projects/{mine.id}"
    )
    dialog.get_by_role("button", name="Keep this offer").click()
    assert my_apps(mine.client)[0]["status"] == "liked"
    # Close the project, and the commit goes through.
    assert mine.client.send("POST", f"/api/v1/projects/{mine.id}/close/").ok
    page.reload()
    page.get_by_role("button", name=f"Commit to {role_title(theirs)} on {theirs.title}").click()
    confirm_commit(page, theirs.title)
    assert_celebration(page, theirs.title)


def test_last_role_commit_locks_the_team_for_everyone(two_pages, owned, candidate, sign_in):
    project = owned("Lock Owner", [("Front", ["Python"]), ("Back", ["Python"])])
    c1, c1_client = candidate("Lock One")
    c2, c2_client = candidate("Lock Two")
    a1 = apply(c1_client, role_id(project, "Front"))
    a2 = apply(c2_client, role_id(project, "Back"))
    like(project, a1)
    like(project, a2)

    owner_page, c2_page = two_pages()
    sign_in(owner_page, project.owner)
    owner_page.goto("/applicants")
    expect(owner_page.get_by_role("region", name="Offers out")).to_be_visible()
    assert commit(c1_client, a1).ok
    assert team_of(project.client) is None

    # The last role fills through the UI.
    sign_in(c2_page, c2)
    c2_page.goto("/applications")
    c2_page.get_by_role(
        "button", name=f"Commit to {role_title(project, 'Back')} on {project.title}"
    ).click()
    confirm_commit(c2_page, project.title)
    dialog = assert_celebration(c2_page, project.title)
    members = dialog.get_by_role("list", name="Members")
    for name in (c1.name, c2.name, project.owner.name):
        expect(members).to_contain_text(name)
    expect(members).to_contain_text("Owner")

    # The owner sees it on the next load (no live push for the owner).
    owner_page.reload()
    assert_celebration(owner_page, project.title)
    owner_page.get_by_role("link", name="See the team").click()
    expect(owner_page).to_have_url(re.compile(r"/teams$"))
    expect(owner_page.get_by_role("heading", name=project.title, level=2)).to_be_visible()
    lineup = owner_page.get_by_role("list").filter(has_text=c1.name)
    for name in (c1.name, c2.name, project.owner.name):
        expect(lineup).to_contain_text(name)
    expect(owner_page.get_by_role("link", name="Open team chat")).to_be_visible()
    # Shown once: a reload doesn't bring it back.
    owner_page.reload()
    expect(owner_page.get_by_role("heading", name=project.title, level=2)).to_be_visible()
    expect(owner_page.get_by_role("dialog", name="It's a Team!")).to_have_count(0)

    # Everyone's other applications are withdrawn, and the deck says benched.
    assert team_of(c1_client)["project"]["title"] == project.title
    c2_page.goto("/feed")
    expect(c2_page.get_by_role("dialog", name="It's a Team!")).to_have_count(0)


def test_deleting_the_last_open_role_locks_the_team(two_pages, owned, candidate, sign_in):
    project = owned("Delete Owner", [("Front", ["Python"]), ("Back", ["Python"])])
    c1, c1_client = candidate("Delete Cand")
    a1 = apply(c1_client, role_id(project, "Front"))
    like(project, a1)
    assert commit(c1_client, a1).ok
    assert team_of(project.client) is None

    owner_page, cand_page = two_pages()
    sign_in(owner_page, project.owner)
    owner_page.goto(f"/projects/{project.id}")
    back = role_title(project, "Back")
    row = owner_page.get_by_role("listitem").filter(has=owner_page.get_by_role("heading", name=back))
    row.get_by_role("button", name="Delete role").click()
    owner_page.get_by_role("dialog", name="Delete this role?").get_by_role(
        "button", name="Delete role"
    ).click()
    # Fixed in PR #243: the celebration shows without a reload.
    dialog = assert_celebration(owner_page, project.title)
    expect(dialog.get_by_role("list", name="Members")).to_contain_text(c1.name)
    expect(dialog.get_by_role("list", name="Members")).to_contain_text(project.owner.name)

    sign_in(cand_page, c1)
    assert_celebration(cand_page, project.title)
    cand_page.get_by_role("link", name="See the team").click()
    expect(cand_page.get_by_role("heading", name=project.title, level=2)).to_be_visible()
    # The deleted role's seat is gone from the lineup.
    expect(cand_page.get_by_text(back)).to_have_count(0)


def test_deleting_the_only_open_role_of_an_unfilled_project(owned):
    """Record what happens when no role was ever filled: no team to lock."""
    project = owned("Zero Owner", [("Only", ["Python"])])
    deleted = project.client.send("DELETE", f"/api/v1/roles/{role_id(project)}/")
    assert deleted.status in (204, 409), deleted.text()
    # Whatever DELETE answered, nobody was ever committed, so no team may exist.
    assert team_of(project.client) is None


def test_committed_member_cannot_apply_and_deck_stays_closed_after_lock(
    page: Page, owned, candidate, sign_in
):
    project = owned("Bench Owner", [("Only", ["Python"])])
    user, client = candidate("Bench Cand")
    a1 = apply(client, role_id(project))
    like(project, a1)
    assert commit(client, a1).ok
    third = owned("Third Owner", [("Role", ["Python"])])
    refused = client.send("POST", "/api/v1/applications/", {"role": role_id(third), "note": ""})
    assert refused.status in (403, 409), refused.text()
    sign_in(page, user)
    # The team celebration shows first (on the page sign-in lands on); close it.
    assert_celebration(page, project.title)
    page.keyboard.press("Escape")
    page.goto("/feed")
    expect(page.get_by_role("button", name=re.compile(r"^Apply to "))).to_have_count(0)
    page.goto("/applications")
    page.get_by_role("tab", name="Committed").click()
    expect(page.get_by_text("You're in. Every role is filled.")).to_be_visible()
