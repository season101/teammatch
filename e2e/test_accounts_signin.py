"""F1-02/F1-03: sign in and out, ?next=, signed-out redirects, keyboard-only."""

import re
import uuid

import pytest
from accounts_support import alerts
from playwright.sync_api import Page, expect

def log_out(page: Page):
    page.get_by_role("button", name="Sign out").first.click()
    page.get_by_role("dialog").get_by_role("button", name="Sign out").click()
    expect(page).not_to_have_url(re.compile(r"/settings"))


WRONG = "Email or password is incorrect."


def attempt(page: Page, email: str, password: str):
    page.goto("/login")
    page.get_by_label("School email").fill(email)
    page.get_by_role("button", name="Continue with email").click()
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in", exact=True).click()


def test_login_page_content(page: Page):
    page.goto("/login")
    expect(page.get_by_role("heading", name="Sign in or sign up")).to_be_visible()
    page.get_by_label("School email").fill(f"acct-{uuid.uuid4().hex[:6]}@latech.edu")
    page.get_by_role("button", name="Continue with email").click()
    expect(page.get_by_role("heading", name="Welcome back.")).to_be_visible()
    expect(page.get_by_role("link", name="Forgot password?")).to_have_attribute(
        "href", "/reset-password"
    )
    page.get_by_role("button", name="Sign up").click()
    expect(page.get_by_role("heading", name="Find your team.")).to_be_visible()


def test_sign_in_lands_on_the_deck(page: Page, verified_user, sign_in):
    user = verified_user("Acct In")
    sign_in(page, user)
    expect(page).to_have_url(re.compile(r"/feed"))


def test_email_is_case_insensitive(page: Page, verified_user):
    user = verified_user("Acct Case")
    attempt(page, user.email.upper(), user.password)
    expect(page).to_have_url(re.compile(r"/feed"))


def test_wrong_password_shows_the_single_message(page: Page, verified_user):
    user = verified_user("Acct Wrong")
    attempt(page, user.email, "definitely-not-it-123")
    expect(alerts(page)).to_have_text(WRONG)
    expect(page).to_have_url(re.compile(r"/login"))
    expect(page.get_by_label("Password")).to_be_focused()


def test_unknown_email_shows_the_same_message(page: Page):
    attempt(page, f"acct-nobody-{uuid.uuid4().hex[:8]}@latech.edu", "whatever-pass-123")
    expect(alerts(page)).to_have_text(WRONG)


def test_wrong_and_unknown_are_the_same_in_the_api(api, verified_user):
    user = verified_user("Acct Same Msg")
    bad = api().send(
        "POST", "/_allauth/browser/v1/auth/login", {"email": user.email, "password": "nope-nope-1"}
    )
    unknown = api().send(
        "POST",
        "/_allauth/browser/v1/auth/login",
        {"email": f"acct-x-{uuid.uuid4().hex[:8]}@latech.edu", "password": "nope-nope-1"},
    )
    assert bad.status == unknown.status == 400
    assert bad.json() == unknown.json()


def test_disallowed_domain_says_use_your_school_email(page: Page):
    attempt(page, "someone@gmail.com", "whatever-pass-123")
    expect(alerts(page)).to_have_text(
        "Use your @latech.edu or @email.latech.edu email."
    )


def test_can_retry_after_a_wrong_password(page: Page, verified_user):
    user = verified_user("Acct Retry")
    attempt(page, user.email, "wrong-wrong-123")
    expect(alerts(page)).to_have_text(WRONG)
    page.get_by_label("Password").fill(user.password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page).to_have_url(re.compile(r"/feed"))


def test_wrong_password_does_not_offer_google(page: Page, verified_user):
    user = verified_user("Acct NoG")
    attempt(page, user.email, "wrong-wrong-123")
    expect(alerts(page)).to_have_text(WRONG)
    expect(page.get_by_text("signs in with Google")).to_have_count(0)


@pytest.mark.parametrize(
    "route", ["/feed", "/projects", "/projects/new", "/applicants", "/applications", "/profile", "/settings", "/teams"]
)
def test_signed_out_app_routes_redirect_to_login_with_next(page: Page, route):
    page.goto(route)
    expect(page).to_have_url(re.compile(r"/login\?next=" + re.escape(route.replace("/", "%2F")) + r"$"))
    expect(page.get_by_role("heading", name="Sign in or sign up")).to_be_visible()


@pytest.mark.parametrize("route", ["/projects", "/settings", "/applications"])
def test_next_returns_you_after_sign_in(page: Page, verified_user, route):
    user = verified_user("Acct Next")
    page.goto(route)
    expect(page).to_have_url(re.compile(r"/login\?next="))
    page.get_by_label("School email").fill(user.email)
    page.get_by_role("button", name="Continue with email").click()
    page.get_by_label("Password").fill(user.password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page).to_have_url(re.compile(re.escape(route) + r"$"))


@pytest.mark.parametrize("next_url", ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)"])
def test_next_to_another_site_goes_to_the_deck(page: Page, verified_user, next_url):
    user = verified_user("Acct Open")
    page.goto("/login?next=" + next_url)
    page.get_by_label("School email").fill(user.email)
    page.get_by_role("button", name="Continue with email").click()
    page.get_by_label("Password").fill(user.password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page).to_have_url(re.compile(r"/feed"))
    assert "evil" not in page.url


def test_sign_out_returns_to_login_and_closes_the_app(page: Page, verified_user, sign_in):
    user = verified_user("Acct Out")
    sign_in(page, user)
    page.goto("/settings")
    log_out(page)
    page.goto("/feed")
    expect(page).to_have_url(re.compile(r"/login\?next="))


def test_sign_out_then_in_as_someone_else(page: Page, verified_user, sign_in):
    first, second = verified_user("Acct One"), verified_user("Acct Two")
    sign_in(page, first)
    page.goto("/settings")
    log_out(page)
    sign_in(page, second)
    page.goto("/profile")
    expect(page.get_by_text(second.name).first).to_be_visible()


def test_session_survives_a_reload(page: Page, verified_user, sign_in):
    user = verified_user("Acct Reload")
    sign_in(page, user)
    page.goto("/projects")
    page.reload()
    expect(page).to_have_url(re.compile(r"/projects$"))


def test_keyboard_only_sign_in(page: Page, verified_user):
    user = verified_user("Acct Keys")
    page.goto("/login")
    page.get_by_label("School email").focus()
    page.keyboard.type(user.email)
    page.keyboard.press("Enter")
    expect(page.get_by_label("Password")).to_be_focused()
    page.keyboard.type(user.password)
    page.keyboard.press("Enter")
    expect(page).to_have_url(re.compile(r"/feed"))


def test_keyboard_tab_order_reaches_every_control(page: Page):
    page.goto("/login")
    page.get_by_label("School email").fill(f"acct-{uuid.uuid4().hex[:6]}@latech.edu")
    page.keyboard.press("Tab")
    expect(page.get_by_role("button", name="Continue with email")).to_be_focused()
    page.keyboard.press("Enter")
    expect(page.get_by_label("Password")).to_be_focused()
    for role, name in (
        ("link", "Forgot password?"),
        ("button", "Sign in"),
        ("button", "Sign up"),
    ):
        page.keyboard.press("Tab")
        expect(page.get_by_role(role, name=name, exact=True)).to_be_focused()


def test_keyboard_wrong_password_keeps_focus_in_the_password_field(page: Page, verified_user):
    user = verified_user("Acct KeyWrong")
    page.goto("/login")
    page.get_by_label("School email").focus()
    page.keyboard.type(user.email)
    page.keyboard.press("Enter")
    expect(page.get_by_label("Password")).to_be_focused()
    page.keyboard.type("wrong-wrong-123")
    page.keyboard.press("Enter")
    expect(alerts(page)).to_have_text(WRONG)
    expect(page.get_by_label("Password")).to_be_focused()
