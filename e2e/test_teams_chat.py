"""Team chat (F4-08, F4-09, BR-12): live messages, history, access, the entry points."""

import re

import pytest
from playwright.sync_api import Page, expect
from teams_support import (  # noqa: F401  (fixtures)
    apply,
    candidate,
    commit,
    like,
    owned,
    patient_user,
    role_id,
    tag,
    team_of,
)


@pytest.fixture
def team(owned, candidate):
    """An owner and one member on a locked one-role team: (project, member user, member client)."""
    project = owned("Chat Owner", [("Only", ["Python"])])
    member, client = candidate("Chat Member")
    app_id = apply(client, role_id(project))
    like(project, app_id)
    assert commit(client, app_id).ok
    return project, member, client


def box(page: Page):
    return page.get_by_role("textbox", name=re.compile(r"^Message "))


def say(page: Page, text):
    box(page).fill(text)
    page.get_by_role("button", name="Send").click()


def test_messages_arrive_live_both_ways_and_history_loads_on_reopen(two_pages, team, sign_in):
    project, member, client = team
    team_id = team_of(project.client)["id"]
    owner_page, member_page = two_pages()
    sign_in(owner_page, project.owner)
    sign_in(member_page, member)
    for page in (owner_page, member_page):
        page.goto(f"/teams/{team_id}/chat")
        expect(page.get_by_role("heading", name=project.title)).to_be_visible()
        expect(page.get_by_text("2 members")).to_be_visible()
        expect(page.get_by_text("Say hi!")).to_be_visible()
        expect(page.get_by_role("button", name="Send")).to_be_enabled()

    t = tag()
    say(owner_page, f"hello from owner {t}")
    log = member_page.get_by_role("log", name="Messages")
    expect(log).to_contain_text(f"hello from owner {t}")
    # The reader sees who said it; the sender sees their own as "You".
    expect(log.get_by_text(project.owner.name)).to_be_visible()
    expect(owner_page.get_by_role("log", name="Messages")).to_contain_text(
        f"You: hello from owner {t}"
    )
    say(member_page, f"hi back {t}")
    expect(owner_page.get_by_role("log", name="Messages")).to_contain_text(f"hi back {t}")
    # The box is cleared after sending.
    expect(box(owner_page)).to_have_value("")

    # History loads on reopen, in order, from the server.
    member_page.goto("/teams")
    member_page.get_by_role("link", name="Open team chat").click()
    expect(member_page).to_have_url(re.compile(rf"/teams/{team_id}/chat"))
    text = member_page.get_by_role("log", name="Messages")
    expect(text).to_contain_text(f"hello from owner {t}")
    expect(text).to_contain_text(f"hi back {t}")
    body = text.inner_text()
    assert body.index(f"hello from owner {t}") < body.index(f"hi back {t}")
    history = client.send("GET", f"/api/v1/teams/{team_id}/messages/").json()["results"]
    assert [m["body"] for m in history][:2] == [f"hi back {t}", f"hello from owner {t}"]  # newest first


def test_open_team_chat_from_celebration_and_teams_screen(page: Page, team, sign_in):
    project, member, _client = team
    sign_in(page, member)
    page.goto("/teams")
    celebration = page.get_by_role("dialog", name="It's a Team!")
    expect(celebration).to_be_visible()
    celebration.get_by_role("link", name="Open team chat").click()
    expect(page).to_have_url(re.compile(r"/teams/\d+/chat"))
    page.get_by_role("link", name="Back to Teams").click()
    expect(page).to_have_url(re.compile(r"/teams$"))
    page.get_by_role("link", name="Open team chat").click()
    expect(page).to_have_url(re.compile(r"/teams/\d+/chat"))


def test_empty_and_blank_messages_are_not_sent(page: Page, team, sign_in):
    project, member, client = team
    team_id = team_of(project.client)["id"]
    sign_in(page, member)
    page.goto(f"/teams/{team_id}/chat")
    expect(page.get_by_role("button", name="Send")).to_be_enabled()
    page.get_by_role("button", name="Send").click()
    box(page).fill("   \n  ")
    box(page).press("Enter")
    page.get_by_role("button", name="Send").click()
    page.wait_for_timeout(800)
    assert client.send("GET", f"/api/v1/teams/{team_id}/messages/").json()["results"] == []
    expect(page.get_by_role("log", name="Messages").get_by_role("listitem")).to_have_count(0)


def test_enter_sends_shift_enter_makes_a_new_line_and_long_text_is_capped(
    two_pages, team, sign_in
):
    project, member, client = team
    team_id = team_of(project.client)["id"]
    owner_page, member_page = two_pages()
    sign_in(owner_page, project.owner)
    sign_in(member_page, member)
    for page in (owner_page, member_page):
        page.goto(f"/teams/{team_id}/chat")
        expect(page.get_by_role("button", name="Send")).to_be_enabled()
    t = tag()
    box(owner_page).fill(f"line one {t}")
    box(owner_page).press("Shift+Enter")
    box(owner_page).type(f"line two {t}")
    box(owner_page).press("Enter")
    expect(member_page.get_by_role("log", name="Messages")).to_contain_text(f"line one {t}")
    sent = client.send("GET", f"/api/v1/teams/{team_id}/messages/").json()["results"][0]["body"]
    assert sent == f"line one {t}\nline two {t}"

    # 2000 characters is the cap: the box stops there, and the message goes through.
    box(owner_page).fill("x" * 2100)
    assert len(box(owner_page).input_value()) == 2000
    box(owner_page).press("Enter")
    expect(member_page.get_by_role("log", name="Messages")).to_contain_text("x" * 100)
    last = client.send("GET", f"/api/v1/teams/{team_id}/messages/").json()["results"][0]["body"]
    assert last == "x" * 2000
    # A long unbroken word must not widen the page on a phone.
    member_page.set_viewport_size({"width": 390, "height": 800})
    overflow = member_page.evaluate(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    assert overflow <= 0, f"horizontal overflow {overflow}px"


def test_a_non_member_cannot_open_or_read_the_team(page: Page, team, candidate, sign_in, api):
    project, member, client = team
    team_id = team_of(project.client)["id"]
    outsider, outsider_client = candidate("Outsider")
    # The API says 404, as for a team that doesn't exist (BR-12).
    assert outsider_client.send("GET", f"/api/v1/teams/{team_id}/messages/").status == 404
    assert outsider_client.send("GET", "/api/v1/teams/99999999/messages/").status == 404
    assert outsider_client.send("POST", f"/api/v1/teams/{team_id}/seen/").status == 404
    assert api().send("GET", f"/api/v1/teams/{team_id}/messages/").status in (401, 403)
    sign_in(page, outsider)
    page.goto(f"/teams/{team_id}/chat")
    expect(page.get_by_text("You're not on this team.")).to_be_visible()
    expect(page.get_by_role("textbox", name=re.compile(r"^Message "))).to_have_count(0)
    page.get_by_role("link", name="Back to Teams").click()
    expect(page.get_by_text("No team yet")).to_be_visible()
    page.goto("/teams/99999999/chat")
    expect(page.get_by_text("You're not on this team.")).to_be_visible()


def test_signed_out_visitor_is_sent_to_sign_in(page: Page, team):
    project, _member, _client = team
    team_id = team_of(project.client)["id"]
    page.goto(f"/teams/{team_id}/chat")
    expect(page).to_have_url(re.compile(r"/login"))


def test_no_chat_before_the_team_locks(page: Page, owned, candidate, sign_in):
    project = owned("Early Owner", [("Front", ["Python"]), ("Back", ["Python"])])
    user, client = candidate("Early Cand")
    app_id = apply(client, role_id(project, "Front"))
    like(project, app_id)
    assert commit(client, app_id).ok
    sign_in(page, user)
    page.goto("/teams")
    expect(page.get_by_text("No team yet")).to_be_visible()
    expect(page.get_by_role("link", name="Open team chat")).to_have_count(0)
    assert team_of(client) is None
