"""F1-10: forgot password, then F1-13 (Google-only account offered a password at sign-in)."""

import re
import uuid

from accounts_support import RESET, alerts, mail_links, make_google_only, new_link
from playwright.sync_api import Page, expect


def request_reset(page: Page, address: str):
    page.goto("/reset-password")
    page.get_by_label("School email").fill(address)
    page.get_by_role("button", name="Send reset link").click()
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()


def set_new_password(page: Page, link: str, password: str):
    page.goto(link)
    expect(page.get_by_role("heading", name="Set a new password")).to_be_visible()
    page.get_by_label("New password").fill(password)
    page.get_by_role("button", name="Save password").click()


def test_forgot_password_page_content(page: Page):
    page.goto("/reset-password")
    expect(page.get_by_role("heading", name="Forgot your password?")).to_be_visible()
    expect(page.get_by_role("link", name="Sign in")).to_have_attribute("href", "/login")


def test_forgot_password_link_on_login_opens_it(page: Page):
    page.goto("/login")
    page.get_by_role("link", name="Forgot password?").click()
    expect(page).to_have_url(re.compile(r"/reset-password$"))


def test_full_reset_flow_then_sign_in_with_the_new_password(page: Page, verified_user):
    user = verified_user("Acct Reset")
    seen = mail_links(user.email, RESET)
    request_reset(page, user.email)
    expect(page.get_by_role("status")).to_contain_text(user.email)
    link = new_link(user.email, RESET, seen)

    new_password = f"new-{uuid.uuid4().hex}"
    set_new_password(page, link, new_password)
    expect(page.get_by_role("heading", name="Your password is set")).to_be_visible()
    page.get_by_role("link", name="Sign in").click()
    expect(page).to_have_url(re.compile(r"/login"))

    # old password no longer works, the new one does
    page.get_by_label("School email").fill(user.email)
    page.get_by_label("Password").fill(user.password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(alerts(page)).to_have_text("Email or password is incorrect.")
    page.get_by_label("Password").fill(new_password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page).to_have_url(re.compile(r"/feed"))


def test_unknown_email_gets_the_same_check_your_inbox(page: Page):
    address = f"acct-nobody-{uuid.uuid4().hex[:8]}@latech.edu"
    request_reset(page, address)
    expect(page.get_by_role("status")).to_contain_text(address)
    assert mail_links(address, RESET) == []


def test_disallowed_domain_is_refused(page: Page):
    page.goto("/reset-password")
    page.get_by_label("School email").fill("someone@gmail.com")
    page.get_by_role("button", name="Send reset link").click()
    expect(alerts(page)).to_have_text(
        "Use your @latech.edu or @email.latech.edu email."
    )


def test_check_your_inbox_buttons(page: Page):
    address = f"acct-{uuid.uuid4().hex[:8]}@latech.edu"
    request_reset(page, address)
    expect(page.get_by_role("link", name="Back to sign in")).to_have_attribute("href", "/login")
    page.get_by_role("button", name="Use a different email").click()
    expect(page.get_by_label("School email")).to_have_value(address)


def test_garbage_reset_key_shows_expired(page: Page):
    page.goto("/reset-password/not-a-real-key")
    expect(page.get_by_role("heading", name="This link has expired")).to_be_visible()
    expect(page.get_by_role("link", name="Send a new link")).to_have_attribute(
        "href", "/reset-password"
    )
    page.get_by_role("link", name="Back to sign in").click()
    expect(page).to_have_url(re.compile(r"/login$"))


def test_reset_key_works_once(page: Page, verified_user):
    user = verified_user("Acct Once")
    seen = mail_links(user.email, RESET)
    request_reset(page, user.email)
    link = new_link(user.email, RESET, seen)
    set_new_password(page, link, f"new-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Your password is set")).to_be_visible()
    page.goto(link)
    expect(page.get_by_role("heading", name="This link has expired")).to_be_visible()


def test_reset_form_refuses_weak_passwords(page: Page, verified_user):
    user = verified_user("Acct Weak")
    seen = mail_links(user.email, RESET)
    request_reset(page, user.email)
    link = new_link(user.email, RESET, seen)
    set_new_password(page, link, "12345678901")
    expect(alerts(page)).to_be_visible()
    expect(page.get_by_role("heading", name="Your password is set")).to_have_count(0)
    # short: the browser blocks it
    page.get_by_label("New password").fill("abc1")
    page.get_by_role("button", name="Save password").click()
    assert page.get_by_label("New password").evaluate("e => e.validity.tooShort")
    # a good one still works on the same link
    page.get_by_label("New password").fill(f"new-{uuid.uuid4().hex}")
    page.get_by_role("button", name="Save password").click()
    expect(page.get_by_role("heading", name="Your password is set")).to_be_visible()


def test_reset_does_not_sign_you_in(page: Page, verified_user):
    user = verified_user("Acct NoSign")
    seen = mail_links(user.email, RESET)
    request_reset(page, user.email)
    link = new_link(user.email, RESET, seen)
    set_new_password(page, link, f"new-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Your password is set")).to_be_visible()
    page.goto("/feed")
    expect(page).to_have_url(re.compile(r"/login"))


# F1-13: an account with Google linked and no usable password.

def test_google_only_account_is_offered_a_password_at_sign_in(page: Page, verified_user):
    user = verified_user("Acct Gonly", onboarded=False)
    make_google_only(user)
    page.goto("/login")
    page.get_by_label("School email").fill(user.email)
    page.get_by_label("Password").fill("any-password-at-all-1")
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page.get_by_text("This email signs in with Google. Want to set a password too?")).to_be_visible()
    expect(page.get_by_text("Email or password is incorrect.")).to_have_count(0)

    seen = mail_links(user.email, RESET)
    page.get_by_role("button", name="Set a password").click()
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()
    expect(page.get_by_role("status")).to_contain_text(user.email)
    link = new_link(user.email, RESET, seen)

    # Back to sign in returns to the form
    page.get_by_role("button", name="Back to sign in").click()
    expect(page.get_by_role("heading", name="Welcome back.")).to_be_visible()

    new_password = f"new-{uuid.uuid4().hex}"
    set_new_password(page, link, new_password)
    expect(page.get_by_role("heading", name="Your password is set")).to_be_visible()
    page.get_by_role("link", name="Sign in").click()
    page.get_by_label("School email").fill(user.email)
    page.get_by_label("Password").fill(new_password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page).to_have_url(re.compile(r"/feed|/welcome/rules"))


def test_google_only_offer_goes_away_when_the_email_changes(page: Page, verified_user):
    user = verified_user("Acct Gchange", onboarded=False)
    make_google_only(user)
    page.goto("/login")
    page.get_by_label("School email").fill(user.email)
    page.get_by_label("Password").fill("any-password-at-all-1")
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page.get_by_role("button", name="Set a password")).to_be_visible()
    page.get_by_label("School email").fill(f"acct-other-{uuid.uuid4().hex[:6]}@latech.edu")
    expect(page.get_by_role("button", name="Set a password")).to_have_count(0)


def test_google_only_message_for_any_password_even_the_old_one(page: Page, verified_user):
    user = verified_user("Acct Gold", onboarded=False)
    old = user.password
    make_google_only(user)
    page.goto("/login")
    page.get_by_label("School email").fill(user.email)
    page.get_by_label("Password").fill(old)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page.get_by_role("button", name="Set a password")).to_be_visible()


def test_ordinary_unknown_email_never_shows_the_google_offer(page: Page):
    page.goto("/login")
    page.get_by_label("School email").fill(f"acct-none-{uuid.uuid4().hex[:6]}@latech.edu")
    page.get_by_label("Password").fill("any-password-at-all-1")
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(alerts(page)).to_have_text("Email or password is incorrect.")
    expect(page.get_by_role("button", name="Set a password")).to_have_count(0)
