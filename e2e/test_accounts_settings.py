"""F1-12: Settings, ways to sign in."""

import re
import uuid

from accounts_support import alerts, make_google_only
from playwright.sync_api import Page, expect


def test_password_account_shows_email_and_password_on(page: Page, verified_user, sign_in):
    user = verified_user("Acct SetOn")
    sign_in(page, user)
    page.goto("/settings")
    section = page.get_by_role("region", name="Ways to sign in")
    expect(section.get_by_text("Email and password")).to_be_visible()
    expect(section.get_by_text(user.email)).to_be_visible()
    expect(section.get_by_text("On", exact=True)).to_be_visible()
    expect(section.get_by_role("button", name="Set a password")).to_have_count(0)
    # a plain @latech.edu account has no Google row and no Connect button
    expect(section.get_by_role("button", name="Connect")).to_have_count(0)


def test_google_only_account_sets_a_password_from_settings(page: Page, verified_user):
    user = verified_user("Acct SetPw")
    session = make_google_only(user, link=False)
    page.context.add_cookies([{"name": "sessionid", "value": session, "url": "http://localhost:3000"}])
    page.goto("/settings")
    section = page.get_by_role("region", name="Ways to sign in")
    expect(section.get_by_text("Not set up")).to_be_visible()
    section.get_by_role("button", name="Set a password").click()
    expect(section.get_by_text("Google keeps working")).to_be_visible()

    # no current password and no email link are asked for
    expect(section.get_by_label("Current password")).to_have_count(0)
    password = f"new-{uuid.uuid4().hex}"
    section.get_by_label("New password").fill(password)
    section.get_by_role("button", name="Save password").click()
    expect(section.get_by_role("status")).to_contain_text("Password saved")
    expect(section.get_by_text("On", exact=True)).to_be_visible()

    # and the new password signs in from a clean browser
    page.context.clear_cookies()
    page.goto("/login")
    page.get_by_label("School email").fill(user.email)
    page.get_by_role("button", name="Continue with email").click()
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page).not_to_have_url(re.compile(r"/login"))


def test_set_password_refuses_weak_passwords(page: Page, verified_user):
    user = verified_user("Acct SetWeak")
    session = make_google_only(user, link=False)
    page.context.add_cookies([{"name": "sessionid", "value": session, "url": "http://localhost:3000"}])
    page.goto("/settings")
    section = page.get_by_role("region", name="Ways to sign in")
    section.get_by_role("button", name="Set a password").click()
    section.get_by_label("New password").fill("123456789012")
    section.get_by_role("button", name="Save password").click()
    expect(alerts(section)).to_be_visible()
    expect(section.get_by_text("Not set up")).to_have_count(0)
    section.get_by_label("New password").fill("abc1")
    section.get_by_role("button", name="Save password").click()
    assert section.get_by_label("New password").evaluate("e => e.validity.tooShort")


def test_settings_page_other_sections(page: Page, verified_user, sign_in):
    user = verified_user("Acct SetOther")
    sign_in(page, user)
    page.goto("/settings")
    expect(page.get_by_role("heading", name="Settings")).to_be_visible()
    for name in ("Ways to sign in", "Appearance", "Keyboard"):
        expect(page.get_by_role("heading", name=name)).to_be_visible()


def test_settings_keyboard_only_set_password(page: Page, verified_user):
    user = verified_user("Acct SetKeys")
    session = make_google_only(user, link=False)
    page.context.add_cookies([{"name": "sessionid", "value": session, "url": "http://localhost:3000"}])
    page.goto("/settings")
    button = page.get_by_role("button", name="Set a password")
    button.focus()
    page.keyboard.press("Enter")
    expect(page.get_by_label("New password")).to_be_visible()
    page.get_by_label("New password").focus()
    page.keyboard.type(f"new-{uuid.uuid4().hex}")
    page.keyboard.press("Enter")
    expect(page.get_by_role("status").filter(has_text="Password saved")).to_be_visible()
