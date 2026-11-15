"""PL-08: the demo, end to end, with an owner and a candidate in two browsers at once.

Sign up, onboard, post a project with one role, apply from the deck, like, commit,
see the team lock and chat both ways. Flows 1 to 4 in docs/design/screens/flows.md.
"""

import re
import uuid

from playwright.sync_api import expect


def test_golden_path(two_pages, make_user, sign_up, onboard):
    owner_page, candidate_page = two_pages()
    owner, candidate = make_user("Olive Owner"), make_user("Cody Candidate")
    tag = uuid.uuid4().hex[:6]
    project, role = f"Golden Path {tag}", f"QA lead {tag}"
    # The role needs only the candidate's one skill: a 100% match, and the newest role,
    # so it's the top card of their deck.
    skill = "Testing"

    # Flow 1: both sign up, verify and onboard.
    sign_up(owner_page, owner)
    onboard(owner_page, owner, skill="Python")
    sign_up(candidate_page, candidate)
    onboard(candidate_page, candidate, skill=skill)

    # Flow 3: the owner creates a project with one role and publishes it.
    owner_page.goto("/projects/new")
    owner_page.get_by_label("Title").fill(project)
    owner_page.get_by_label("Pitch").fill("An end-to-end test of the whole demo.")
    owner_page.get_by_role("button", name="Create project").click()
    owner_page.get_by_role("link", name="Add roles").click()
    owner_page.get_by_role("button", name="Add a role").click()
    owner_page.get_by_label("Role title").fill(role)
    owner_page.get_by_label("Role description").fill("Runs the golden path before every demo.")
    owner_page.get_by_role("button", name=f"+ {skill}", exact=True).click()
    owner_page.get_by_role("button", name="Add role", exact=True).click()
    expect(owner_page.get_by_role("heading", name=role)).to_be_visible()
    owner_page.get_by_role("button", name="Publish project").click()
    expect(owner_page.get_by_text("Published. Your project is now open")).to_be_visible()

    # Flow 2: the candidate finds it on the deck and applies.
    candidate_page.reload()
    candidate_page.get_by_role("button", name=f"Apply to {role} on {project}").click()
    expect(
        candidate_page.get_by_role("status").filter(has_text=f"Applied to {role}")
    ).to_be_attached()

    # Flow 4: the owner likes the candidate, which sends an offer.
    owner_page.goto("/applicants")
    owner_page.get_by_role("button", name=f"Like {candidate.name}").click()
    expect(owner_page.get_by_text(f"Offer sent to {candidate.name}")).to_be_visible()

    # The candidate commits, and the last (only) role filling locks the team.
    candidate_page.goto("/applications")
    candidate_page.get_by_role("button", name=f"Commit to {role} on {project}").click()
    candidate_page.get_by_role("dialog", name=f"Commit to {project}?").get_by_role(
        "button", name=f"Commit to {project}"
    ).click()

    # Both see "It's a Team!" and open team chat from it.
    for page in (candidate_page, owner_page):
        if page is owner_page:
            page.goto("/teams")
        celebration = page.get_by_role("dialog", name="It's a Team!")
        expect(celebration).to_be_visible()
        expect(celebration.get_by_text(project)).to_be_visible()
        celebration.get_by_role("link", name="Open team chat").click()
        expect(page).to_have_url(re.compile(r"/teams/\d+/chat"))

    # Each sees the other's message arrive live, without a reload.
    for sender, reader, text in (
        (owner_page, candidate_page, f"Welcome aboard {tag}"),
        (candidate_page, owner_page, f"Glad to be here {tag}"),
    ):
        sender.get_by_role("textbox", name=re.compile(r"^Message ")).fill(text)
        sender.get_by_role("button", name="Send").click()
        expect(reader.get_by_role("log", name="Messages")).to_contain_text(text)
