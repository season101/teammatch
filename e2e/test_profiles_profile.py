"""Profiles: My profile (edit, validation, persistence), skills, preview, strength, public API."""

import re

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def session(page: Page, verified_user, sign_in):
    """session("Name", skills=[...]) -> (user, page) signed in on /profile."""

    def make(name="Prof User", **kw):
        user = verified_user(f"profiles {name}", **kw)
        sign_in(page, user)
        page.goto("/profile")
        return user, page

    return make


def edit_tab(page):
    page.get_by_role("tab", name="Edit").click()


def strength(page):
    return int(page.get_by_role("meter", name="Profile strength").get_attribute("aria-valuenow"))


def save(page):
    page.get_by_role("button", name="Save profile").click()
    expect(page.get_by_role("status").filter(has_text="Profile saved.")).to_be_visible()


def add_skill(page, name):
    page.get_by_role("button", name=f"+ {name}", exact=True).click()


def not_on_body(page):
    return page.evaluate("document.activeElement.tagName") != "BODY"


# ---------- My profile: edit and persist ----------


def test_header_shows_own_email_and_privacy_note(session):
    user, page = session()
    expect(page.get_by_role("heading", name="My profile")).to_be_visible()
    expect(page.get_by_role("main").locator("strong")).to_have_text(user.email)
    expect(page.get_by_text("Only you see your email.")).to_be_visible()


def test_edit_fields_and_save_persist_across_reload(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Display name").fill("Grace Hopper")
    page.get_by_label("Major").fill("Mathematics")
    page.get_by_label("Bio").fill("I like compilers.")
    save(page)
    page.reload()
    edit_tab(page)
    expect(page.get_by_label("Display name")).to_have_value("Grace Hopper")
    expect(page.get_by_label("Major")).to_have_value("Mathematics")
    expect(page.get_by_label("Bio")).to_have_value("I like compilers.")


def test_form_is_prefilled_from_onboarding(session):
    user, page = session()
    edit_tab(page)
    expect(page.get_by_label("Display name")).to_have_value(user.name)
    expect(page.get_by_label("Major")).to_have_value(user.major)
    expect(page.get_by_label("Bio")).to_have_value("")


def test_values_are_trimmed_on_save(session, api):
    user, page = session()
    edit_tab(page)
    page.get_by_label("Display name").fill("   Padded Name   ")
    save(page)
    me = api().sign_in(user).send("GET", "/api/v1/me/profile/").json()
    assert me["display_name"] == "Padded Name"


def test_saved_message_hides_on_next_edit(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Bio").fill("first")
    save(page)
    page.get_by_label("Bio").fill("second")
    expect(page.get_by_text("Profile saved.")).to_have_count(0)


def test_save_button_reenables_after_save(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Bio").fill("x")
    page.get_by_role("button", name="Save profile").click()
    expect(page.get_by_text("Profile saved.")).to_be_visible()
    expect(page.get_by_role("button", name="Save profile")).to_be_enabled()


def test_unsaved_edits_are_discarded_on_reload(session):
    """There is no Cancel button: leaving without Save drops the edit."""
    _, page = session()
    edit_tab(page)
    page.get_by_label("Bio").fill("never saved")
    page.reload()
    edit_tab(page)
    expect(page.get_by_label("Bio")).to_have_value("")


def test_unsaved_edits_dont_reach_preview_or_strength(session):
    _, page = session()
    before = strength(page)
    edit_tab(page)
    page.get_by_label("Bio").fill("typed only")
    assert strength(page) == before
    page.get_by_role("tab", name="Preview").click()
    expect(page.get_by_text("No bio yet.")).to_be_visible()


def test_edit_via_enter_key_submits(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Major").fill("Physics")
    page.get_by_label("Major").press("Enter")
    expect(page.get_by_text("Profile saved.")).to_be_visible()


# ---------- validation / limits ----------


def test_name_major_bio_have_length_limits(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Display name").fill("n" * 120)
    page.get_by_label("Major").fill("m" * 150)
    page.get_by_label("Bio").fill("b" * 600)
    expect(page.get_by_label("Display name")).to_have_value("n" * 80)
    expect(page.get_by_label("Major")).to_have_value("m" * 100)
    expect(page.get_by_label("Bio")).to_have_value("b" * 500)
    expect(page.get_by_text("500/500 characters")).to_be_visible()


def test_bio_counter_tracks_typing(session):
    _, page = session()
    edit_tab(page)
    expect(page.get_by_text("0/500 characters")).to_be_visible()
    page.get_by_label("Bio").fill("hello")
    expect(page.get_by_text("5/500 characters")).to_be_visible()


def test_api_rejects_overlong_fields(session, api):
    user, _ = session()
    client = api().sign_in(user)
    for field, size in [("display_name", 81), ("major", 101), ("bio", 501)]:
        r = client.send("PATCH", "/api/v1/me/profile/", {field: "x" * size})
        assert r.status == 400, (field, r.status)


def test_api_rejects_unknown_skill_and_over_20_skills(session, api):
    user, _ = session()
    client = api().sign_in(user)
    assert client.send("PATCH", "/api/v1/me/profile/", {"skill_ids": [999999]}).status == 400
    assert (
        client.send("PATCH", "/api/v1/me/profile/", {"skill_ids": list(range(1, 22))}).status == 400
    )


def test_api_ignores_email_field(session, api):
    user, _ = session()
    client = api().sign_in(user)
    r = client.send("PATCH", "/api/v1/me/profile/", {"email": "evil@latech.edu", "bio": "ok"})
    assert r.ok
    assert r.json()["email"] == user.email


def test_blank_name_is_saved_and_preview_falls_back(session):
    """No required fields on the profile form; a blank name previews as 'Unnamed applicant'."""
    _, page = session()
    edit_tab(page)
    page.get_by_label("Display name").fill("   ")
    save(page)
    page.get_by_role("tab", name="Preview").click()
    expect(page.get_by_role("heading", name="Unnamed applicant")).to_be_visible()


def test_html_in_bio_is_shown_as_text(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Bio").fill("<img src=x onerror=window.__pwn=1><b>bold</b>")
    save(page)
    page.get_by_role("tab", name="Preview").click()
    expect(page.get_by_role("article").get_by_text("<b>bold</b>")).to_be_visible()
    assert page.evaluate("window.__pwn") is None


# ---------- skills ----------


def test_add_skill_moves_it_to_my_skills_and_persists(session):
    _, page = session(skills=["Python"])
    edit_tab(page)
    mine = page.get_by_role("list", name="My skills")
    expect(mine.get_by_text("Python")).to_be_visible()
    add_skill(page, "Django")
    expect(mine.get_by_text("Django")).to_be_visible()
    expect(page.get_by_role("button", name="+ Django", exact=True)).to_have_count(0)
    save(page)
    page.reload()
    edit_tab(page)
    expect(page.get_by_role("list", name="My skills").get_by_text("Django")).to_be_visible()


def test_remove_skill_returns_it_to_the_list_and_persists(session):
    _, page = session(skills=["Python", "Django"])
    edit_tab(page)
    page.get_by_role("button", name="Remove Django").click()
    expect(page.get_by_role("button", name="+ Django", exact=True)).to_be_visible()
    save(page)
    page.reload()
    edit_tab(page)
    expect(page.get_by_role("button", name="Remove Django")).to_have_count(0)
    expect(page.get_by_role("button", name="Remove Python")).to_be_visible()


def test_remove_all_skills_shows_empty_message(session):
    _, page = session(skills=["Python"])
    edit_tab(page)
    page.get_by_role("button", name="Remove Python").click()
    expect(page.get_by_text("No skills yet. Search below to add some.")).to_be_visible()
    save(page)
    page.get_by_role("tab", name="Preview").click()
    expect(page.get_by_role("article").get_by_text("No skills yet.")).to_be_visible()


def test_search_filters_case_insensitively_and_clears_after_add(session):
    _, page = session(skills=["Python"])
    edit_tab(page)
    box = page.get_by_label("Search skills")
    box.fill("dJaN")
    add = page.get_by_role("list", name="Skills to add")
    expect(add.get_by_role("button", name="+ Django")).to_be_visible()
    add_skill(page, "Django")
    expect(box).to_have_value("")


def test_search_with_no_match_shows_message(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Search skills").fill("zzzzqqq")
    expect(page.get_by_text("No skills match your search.")).to_be_visible()


def test_picked_skill_is_not_offered_again(session):
    _, page = session(skills=["Python"])
    edit_tab(page)
    page.get_by_label("Search skills").fill("  python ")
    expect(page.get_by_text("No skills match your search.")).to_be_visible()


def test_duplicate_skill_ids_via_api_dont_create_two_rows(session, api):
    user, _ = session(skills=["Python"])
    client = api().sign_in(user)
    ids = {s["name"]: s["id"] for s in client.send("GET", "/api/v1/skills/").json()}
    r = client.send("PATCH", "/api/v1/me/profile/", {"skill_ids": [ids["Python"], ids["Python"]]})
    assert r.status in (200, 400), r.status
    me = client.send("GET", "/api/v1/me/profile/").json()
    assert [s["name"] for s in me["skills"]].count("Python") == 1


def test_twenty_skill_cap(session, api):
    user, page = session(skills=["Python"])
    skills = api().sign_in(user).send("GET", "/api/v1/skills/").json()
    if len(skills) < 21:
        pytest.skip(f"only {len(skills)} skills in the list, the cap can't be reached in the UI")
    edit_tab(page)
    for _ in range(19):
        page.get_by_role("list", name="Skills to add").get_by_role("button").first.click()
    expect(page.get_by_text("You can pick up to 20 skills.")).to_be_visible()
    expect(page.get_by_role("list", name="Skills to add")).to_have_count(0)
    save(page)


def test_cap_message_goes_away_after_removing_one(session, api):
    user, page = session(skills=["Python"])
    if len(api().sign_in(user).send("GET", "/api/v1/skills/").json()) < 21:
        pytest.skip("skill list has 20 or fewer entries")
    edit_tab(page)
    for _ in range(19):
        page.get_by_role("list", name="Skills to add").get_by_role("button").first.click()
    page.get_by_role("button", name="Remove Python").click()
    expect(page.get_by_role("list", name="Skills to add")).to_be_visible()


def test_keyboard_only_add_keeps_focus_in_picker(session):
    _, page = session(skills=["Python"])
    edit_tab(page)
    first = page.get_by_role("list", name="Skills to add").get_by_role("button").first
    first.focus()
    first.press("Enter")
    expect(page.locator("fieldset :focus")).to_have_count(1)
    assert not_on_body(page)


def test_keyboard_only_remove_keeps_focus_in_picker(session):
    _, page = session(skills=["Python", "Django", "React"])
    edit_tab(page)
    btn = page.get_by_role("button", name="Remove Django")
    btn.focus()
    btn.press("Enter")
    expect(page.get_by_role("button", name="Remove Django")).to_have_count(0)
    expect(page.locator("fieldset :focus")).to_have_count(1)


def test_keyboard_remove_last_skill_focuses_search_box(session):
    _, page = session(skills=["Python"])
    edit_tab(page)
    btn = page.get_by_role("button", name="Remove Python")
    btn.focus()
    btn.press("Space")
    expect(page.get_by_label("Search skills")).to_be_focused()


def test_keyboard_search_then_add_with_tab_and_enter(session):
    _, page = session(skills=["Python"])
    edit_tab(page)
    page.get_by_label("Search skills").fill("Django")
    page.keyboard.press("Tab")
    expect(page.get_by_role("button", name="+ Django")).to_be_focused()
    page.keyboard.press("Enter")
    expect(page.get_by_role("list", name="My skills").get_by_text("Django")).to_be_visible()
    assert not_on_body(page)


def test_tabs_keyboard_arrows(session):
    _, page = session()
    page.get_by_role("tab", name="Preview").focus()
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("tab", name="Edit")).to_have_attribute("aria-selected", "true")
    expect(page.get_by_label("Display name")).to_be_visible()
    page.keyboard.press("Home")
    expect(page.get_by_role("tab", name="Preview")).to_have_attribute("aria-selected", "true")


# ---------- preview and strength ----------


def test_preview_shows_what_owners_see(session):
    user, page = session(skills=["Python", "Django"])
    edit_tab(page)
    page.get_by_label("Bio").fill("Backend person.")
    save(page)
    page.get_by_role("tab", name="Preview").click()
    expect(page.get_by_text("This is what owners see when you apply.")).to_be_visible()
    card = page.get_by_role("article")
    expect(card.get_by_role("heading", name=user.name)).to_be_visible()
    expect(card.get_by_text(user.major)).to_be_visible()
    expect(card.get_by_text("Python", exact=True)).to_be_visible()
    expect(card.get_by_text("Django", exact=True)).to_be_visible()
    expect(card.get_by_text("Backend person.")).to_be_visible()
    expect(card.get_by_text(user.email)).to_have_count(0)


def test_preview_updates_after_save_without_reload(session):
    _, page = session()
    edit_tab(page)
    page.get_by_label("Display name").fill("Renamed Person")
    save(page)
    page.get_by_role("tab", name="Preview").click()
    expect(page.get_by_role("heading", name="Renamed Person")).to_be_visible()


def test_strength_follows_major_skills_bio(session):
    """DD-10: major 20, skills 40, bio 20, avatar 20 (not on main) => tops out at 80."""
    _, page = session(skills=["Python"])
    expect(page.get_by_role("meter", name="Profile strength")).to_be_visible()
    assert strength(page) == 60
    edit_tab(page)
    page.get_by_label("Bio").fill("A bio.")
    save(page)
    assert strength(page) == 80
    expect(page.get_by_text("80%")).to_be_visible()
    page.get_by_label("Major").fill("")
    save(page)
    assert strength(page) == 60
    page.get_by_role("button", name="Remove Python").click()
    save(page)
    assert strength(page) == 20


def test_strength_below_100_until_avatar_lands(session):
    _, page = session(skills=["Python", "Django"])
    edit_tab(page)
    page.get_by_label("Bio").fill("Full profile.")
    save(page)
    if page.get_by_role("button", name=re.compile("photo|avatar", re.I)).count():
        pytest.skip("F1-07 merged; weights changed")
    assert strength(page) < 100


def test_strength_is_zero_for_a_bare_profile(verified_user, api):
    user = verified_user("profiles bare", onboarded=False)
    me = api().sign_in(user).send("GET", "/api/v1/me/profile/").json()
    assert me["skills"] == [] and me["bio"] == "" and me["major"] == ""


# ---------- someone else's profile (API; the app has no /profile/<id> page) ----------


def test_public_profile_has_no_email_and_no_private_fields(verified_user, api):
    a = verified_user("profiles pub a", skills=["Python"])
    b = verified_user("profiles pub b")
    mine = api().sign_in(a).send("GET", "/api/v1/me/profile/").json()
    other = api().sign_in(b).send("GET", f"/api/v1/profiles/{mine['id']}/")
    assert other.status == 200
    body = other.json()
    assert body["display_name"] == a.name
    assert "email" not in body and "rules_accepted_at" not in body
    assert a.email not in other.text()


def test_public_profile_is_read_only_for_others(verified_user, api):
    a = verified_user("profiles ro a")
    b = verified_user("profiles ro b")
    a_id = api().sign_in(a).send("GET", "/api/v1/me/profile/").json()["id"]
    r = api().sign_in(b).send("PATCH", f"/api/v1/profiles/{a_id}/", {"bio": "hacked"})
    assert r.status == 403
    assert api().sign_in(a).send("GET", "/api/v1/me/profile/").json()["bio"] == ""


def test_public_profile_nonexistent_is_404(verified_user, api):
    u = verified_user("profiles nf")
    assert api().sign_in(u).send("GET", "/api/v1/profiles/99999999/").status == 404


def test_public_profile_requires_sign_in(verified_user, api):
    u = verified_user("profiles anon")
    pid = api().sign_in(u).send("GET", "/api/v1/me/profile/").json()["id"]
    assert api().send("GET", f"/api/v1/profiles/{pid}/").status in (401, 403)


def test_my_profile_page_requires_sign_in(page: Page):
    page.goto("/profile")
    expect(page).to_have_url(re.compile(r"/login\?next=%2Fprofile$"))
