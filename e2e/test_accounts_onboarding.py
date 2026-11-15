"""DD-47: the onboarding gate and steps (Team rules, info, skills, first deck)."""

import re

import pytest
from playwright.sync_api import Page, expect


@pytest.mark.parametrize(
    "route", ["/feed", "/projects", "/projects/new", "/applicants", "/applications", "/profile", "/teams"]
)
def test_new_user_cannot_reach_app_routes_before_the_rules(page: Page, verified_user, sign_in, route):
    user = verified_user("Acct Gate", onboarded=False)
    sign_in(page, user)
    page.goto(route)
    expect(page).to_have_url(re.compile(r"/welcome/rules$"))
    expect(page.get_by_role("heading", name="Team rules")).to_be_visible()


def test_sign_in_of_a_new_user_ends_on_team_rules(page: Page, verified_user, sign_in):
    user = verified_user("Acct Gate2", onboarded=False)
    sign_in(page, user)
    expect(page).to_have_url(re.compile(r"/welcome/rules$"))


def test_team_rules_screen(page: Page, verified_user, sign_in):
    user = verified_user("Acct Rules", onboarded=False)
    sign_in(page, user)
    expect(page.get_by_role("heading", name="Team rules")).to_be_visible()
    for rule in ("Be honest about your skills.", "Show up.", "Respect people's time.", "Speak up early."):
        expect(page.get_by_text(rule)).to_be_visible()
    expect(page.get_by_role("button", name="I agree")).to_be_enabled()


def test_steps_in_order_then_the_first_deck(page: Page, verified_user, sign_in, onboard):
    user = verified_user("Acct Steps", onboarded=False)
    sign_in(page, user)
    onboard(page, user, skill="Python")
    expect(page).to_have_url(re.compile(r"/feed"))
    # the gate is gone: other app pages open
    page.goto("/projects")
    expect(page).to_have_url(re.compile(r"/projects$"))


def test_later_steps_are_not_reachable_before_the_rules(page: Page, verified_user, sign_in):
    user = verified_user("Acct Skip", onboarded=False)
    sign_in(page, user)
    for step in ("profile", "skills"):
        page.goto(f"/welcome/{step}")
        expect(page).to_have_url(re.compile(r"/welcome/rules$"))


def test_reload_on_rules_stays_on_rules(page: Page, verified_user, sign_in):
    user = verified_user("Acct Reload1", onboarded=False)
    sign_in(page, user)
    page.reload()
    expect(page.get_by_role("heading", name="Team rules")).to_be_visible()


def test_reload_after_the_rules_resumes_at_info(page: Page, verified_user, sign_in):
    user = verified_user("Acct Resume", onboarded=False)
    sign_in(page, user)
    page.get_by_role("button", name="I agree").click()
    expect(page.get_by_role("heading", name="Confirm your info")).to_be_visible()
    page.reload()
    expect(page.get_by_role("heading", name="Confirm your info")).to_be_visible()
    # back to the rules screen skips ahead to where they left off
    page.goto("/welcome/rules")
    expect(page).to_have_url(re.compile(r"/welcome/profile$"))
    page.goto("/welcome/skills")
    expect(page).to_have_url(re.compile(r"/welcome/profile$"))


def test_resume_at_skills_after_info(page: Page, verified_user, sign_in):
    user = verified_user("Acct Resume2", onboarded=False)
    sign_in(page, user)
    page.get_by_role("button", name="I agree").click()
    page.get_by_label("Name", exact=True).fill(user.name)
    page.get_by_label("Major", exact=True).fill(user.major)
    page.get_by_role("button", name="Continue").click()
    expect(page.get_by_role("heading", name="What can you do?")).to_be_visible()
    page.reload()
    expect(page.get_by_role("heading", name="What can you do?")).to_be_visible()
    page.goto("/welcome/rules")
    expect(page).to_have_url(re.compile(r"/welcome/skills$"))


def test_resume_in_a_new_session_after_signing_out_mid_way(page: Page, verified_user, sign_in):
    user = verified_user("Acct Resume3", onboarded=False)
    sign_in(page, user)
    page.get_by_role("button", name="I agree").click()
    expect(page.get_by_role("heading", name="Confirm your info")).to_be_visible()
    page.context.clear_cookies()
    page.goto("/welcome/profile")
    expect(page).to_have_url(re.compile(r"/login\?next="))
    sign_in(page, user)
    expect(page).to_have_url(re.compile(r"/welcome/profile$"))
    expect(page.get_by_role("heading", name="Confirm your info")).to_be_visible()


def test_info_requires_a_name_and_major(page: Page, verified_user, sign_in):
    user = verified_user("Acct Info", onboarded=False)
    sign_in(page, user)
    page.get_by_role("button", name="I agree").click()
    expect(page.get_by_role("heading", name="Confirm your info")).to_be_visible()
    page.get_by_label("Name", exact=True).fill("")
    page.get_by_label("Major", exact=True).fill("")
    expect(page.get_by_role("button", name="Continue")).to_be_disabled()
    page.get_by_label("Name", exact=True).fill(user.name)
    page.get_by_label("Major", exact=True).fill(user.major)
    expect(page.get_by_role("button", name="Continue")).to_be_enabled()


def test_skills_needs_at_least_one_skill(page: Page, verified_user, sign_in):
    user = verified_user("Acct Skills", onboarded=False)
    sign_in(page, user)
    page.get_by_role("button", name="I agree").click()
    page.get_by_label("Name", exact=True).fill(user.name)
    page.get_by_label("Major", exact=True).fill(user.major)
    page.get_by_role("button", name="Continue").click()
    expect(page.get_by_role("heading", name="What can you do?")).to_be_visible()
    expect(page.get_by_role("button", name=re.compile(r"^Continue"))).to_be_disabled()
    page.get_by_role("button", name="+ Python", exact=True).click()
    expect(page.get_by_role("button", name="Continue · 1 skill")).to_be_enabled()


def test_coach_marks_show_on_the_first_deck_only(page: Page, verified_user, sign_in, onboard):
    user = verified_user("Acct Coach", onboarded=False)
    sign_in(page, user)
    onboard(page, user, skill="Python")  # dismisses "One role at a time"
    page.reload()
    # The sheet can only appear after hydration (the server renders "seen"), so wait until React
    # has attached to the page before asserting it stays away.
    page.wait_for_function(
        "() => [...document.querySelectorAll('button, a')]"
        ".some(e => Object.keys(e).some(k => k.startsWith('__reactProps')))"
    )
    assert page.evaluate("localStorage.getItem('teammatch:coach-seen')") is not None
    expect(page.get_by_role("dialog", name="One role at a time")).to_have_count(0)


def test_finished_user_visiting_a_step_goes_to_the_deck(page: Page, verified_user, sign_in):
    user = verified_user("Acct Done")
    sign_in(page, user)
    page.goto("/welcome/rules")
    expect(page).to_have_url(re.compile(r"/feed"))


def test_welcome_steps_need_a_sign_in(page: Page):
    page.goto("/welcome/rules")
    expect(page).to_have_url(re.compile(r"/login\?next="))


def test_rules_keyboard_only(page: Page, verified_user, sign_in):
    user = verified_user("Acct RKeys", onboarded=False)
    sign_in(page, user)
    page.get_by_role("button", name="I agree").focus()
    page.keyboard.press("Enter")
    expect(page.get_by_role("heading", name="Confirm your info")).to_be_visible()
