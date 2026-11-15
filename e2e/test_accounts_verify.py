"""F1-01/F1-14: verify email. Same browser signs in, another browser doesn't, bad keys fail."""

import re
from urllib.parse import unquote

from accounts_support import alerts
from playwright.sync_api import Browser, Page, expect

BASE = "http://localhost:3000"


def start_signup(page: Page, user, verify_link):
    page.goto("/signup")
    page.get_by_label("School email").fill(user.email)
    page.get_by_label("Password").fill(user.password)
    page.get_by_role("button", name="Create account").click()
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()
    return verify_link(user.email)


def test_same_browser_signs_in_and_continue_lands_on_team_rules(page: Page, make_user, verify_link):
    user = make_user("Acct Same")
    link = start_signup(page, user, verify_link)
    page.goto(link)
    expect(page.get_by_role("heading", name="Verify your email")).to_be_visible()
    page.get_by_role("button", name="Verify my email").click()
    expect(page.get_by_role("heading", name="You're verified")).to_be_visible()
    expect(page.get_by_text("A few quick steps")).to_be_visible()
    page.get_by_role("link", name="Continue").click()
    expect(page).to_have_url(re.compile(r"/welcome/rules$"))
    expect(page.get_by_role("heading", name="Team rules")).to_be_visible()


def test_opening_the_link_does_not_verify_until_the_button(page: Page, make_user, verify_link, api):
    user = make_user("Acct Lazy")
    link = start_signup(page, user, verify_link)
    page.goto(link)
    expect(page.get_by_role("button", name="Verify my email")).to_be_visible()
    # still unverified: password sign-in is refused with 401 ("verify first")
    login = api().send(
        "POST", "/_allauth/browser/v1/auth/login", {"email": user.email, "password": user.password}
    )
    assert login.status == 401


def test_other_browser_sees_verified_with_a_sign_in_button(
    browser: Browser, page: Page, make_user, verify_link
):
    user = make_user("Acct Other")
    link = start_signup(page, user, verify_link)
    other = browser.new_context(base_url=BASE).new_page()
    other.goto(link)
    other.get_by_role("button", name="Verify my email").click()
    expect(other.get_by_role("heading", name="You're verified")).to_be_visible()
    expect(other.get_by_text("Sign in with your school email and password")).to_be_visible()
    expect(other.get_by_role("link", name="Continue")).to_have_count(0)
    other.get_by_role("link", name="Sign in").click()
    expect(other).to_have_url(re.compile(r"/login$"))
    other.get_by_label("School email").fill(user.email)
    other.get_by_label("Password").fill(user.password)
    other.get_by_role("button", name="Sign in", exact=True).click()
    expect(other).to_have_url(re.compile(r"/welcome/rules$"))
    other.context.close()


def test_garbage_key_shows_the_expired_screen(page: Page):
    page.goto("/verify-email/not-a-real-key")
    page.get_by_role("button", name="Verify my email").click()
    expect(page.get_by_role("heading", name="This link has expired")).to_be_visible()
    expect(alerts(page)).to_contain_text("Verification links last 3 days")
    page.get_by_role("link", name="Sign in").click()
    expect(page).to_have_url(re.compile(r"/login$"))


def test_encoded_and_odd_keys_do_not_crash(page: Page):
    for key in ("%00", "a%2Fb", "x" * 300, "%E2%9C%93"):
        page.goto(f"/verify-email/{key}")
        page.get_by_role("button", name="Verify my email").click()
        expect(page.get_by_role("heading", name="This link has expired")).to_be_visible()


def test_used_key_is_expired_the_second_time(browser: Browser, page: Page, make_user, verify_link):
    user = make_user("Acct Reuse")
    link = start_signup(page, user, verify_link)
    page.goto(link)
    page.get_by_role("button", name="Verify my email").click()
    expect(page.get_by_role("heading", name="You're verified")).to_be_visible()
    again = browser.new_context(base_url=BASE).new_page()
    again.goto(link)
    again.get_by_role("button", name="Verify my email").click()
    expect(again.get_by_role("heading", name="This link has expired")).to_be_visible()
    again.context.close()


def test_truncated_real_key_is_rejected(page: Page, make_user, verify_link):
    user = make_user("Acct Trunc")
    link = start_signup(page, user, verify_link)
    key = unquote(link.rsplit("/verify-email/", 1)[1])
    page.goto(f"/verify-email/{key[:-3]}")
    page.get_by_role("button", name="Verify my email").click()
    expect(page.get_by_role("heading", name="This link has expired")).to_be_visible()


def test_unverified_sign_in_says_verify_first(page: Page, make_user, verify_link):
    user = make_user("Acct Unver")
    start_signup(page, user, verify_link)
    page.goto("/login")
    page.get_by_label("School email").fill(user.email)
    page.get_by_label("Password").fill(user.password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(alerts(page)).to_have_text(
        "Please verify your email first. Check your inbox for the link."
    )
