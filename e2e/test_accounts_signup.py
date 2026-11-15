"""F1-01/F1-06/F1-14: sign up. Allowed domains, validation, duplicate emails."""

import re
import uuid

import pytest
from accounts_support import alerts, new_link, signup_api
from playwright.sync_api import Page, expect

DOMAIN_MSG = "Use your @latech.edu or @email.latech.edu email."


def tag():
    return uuid.uuid4().hex[:8]


def fill_signup(page: Page, email: str, password: str):
    page.goto("/signup")
    page.get_by_label("School email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Create account").click()


def test_signup_page_content(page: Page):
    page.goto("/signup")
    expect(page.get_by_role("heading", name="Find your team.")).to_be_visible()
    expect(page.get_by_text("Use your @latech.edu or @email.latech.edu email.")).to_be_visible()
    expect(page.get_by_text("8 or more characters. Not all numbers")).to_be_visible()
    expect(page.get_by_role("link", name="Sign in")).to_have_attribute("href", "/login")


@pytest.mark.parametrize("domain", ["latech.edu", "email.latech.edu"])
def test_allowed_domains_get_check_your_inbox(page: Page, domain):
    address = f"acct-{tag()}@{domain}"
    fill_signup(page, address, f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()
    expect(page.get_by_role("status")).to_contain_text(address)


def test_uppercase_domain_is_allowed(page: Page):
    fill_signup(page, f"acct-{tag()}@LATECH.EDU", f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()


def test_other_domain_is_refused_in_the_ui(page: Page):
    fill_signup(page, f"acct-{tag()}@gmail.com", f"acct-{uuid.uuid4().hex}")
    expect(alerts(page)).to_have_text(DOMAIN_MSG)
    expect(page.get_by_role("heading", name="Check your inbox")).to_have_count(0)


@pytest.mark.parametrize(
    "domain",
    [
        "gmail.com",
        "latech.edu.evil.com",
        "evil-latech.edu",
        "notlatech.edu",
        "latech.com",
        "sub.latech.edu",
    ],
)
def test_lookalike_domains_are_refused_by_the_api(api, domain):
    response = signup_api(api, f"acct-{tag()}@{domain}", f"acct-{uuid.uuid4().hex}")
    assert response.status == 400, response.text()
    assert any(e["code"] == "email_domain_not_allowed" for e in response.json()["errors"])


def test_short_password_is_blocked_by_the_form(page: Page):
    fill_signup(page, f"acct-{tag()}@latech.edu", "short1")
    expect(page.get_by_role("heading", name="Check your inbox")).to_have_count(0)
    assert page.get_by_label("Password").evaluate("e => e.validity.tooShort")


def test_short_password_is_refused_by_the_api(api):
    response = signup_api(api, f"acct-{tag()}@latech.edu", "short1")
    assert response.status == 400, response.text()


def test_invalid_email_is_blocked_by_the_form(page: Page):
    fill_signup(page, "not-an-email", f"acct-{uuid.uuid4().hex}")
    assert page.get_by_label("School email").evaluate("e => e.validity.typeMismatch")
    expect(page.get_by_role("heading", name="Check your inbox")).to_have_count(0)


def test_empty_fields_are_blocked(page: Page):
    page.goto("/signup")
    page.get_by_role("button", name="Create account").click()
    assert page.get_by_label("School email").evaluate("e => e.validity.valueMissing")


def test_all_numbers_password_is_refused_with_a_message(page: Page):
    fill_signup(page, f"acct-{tag()}@latech.edu", "1234567890")
    expect(alerts(page)).to_be_visible()
    expect(page.get_by_role("heading", name="Check your inbox")).to_have_count(0)


@pytest.mark.xfail(
    reason="BUG: a password made of the email's name is accepted, though the form says not close to your email",
    strict=True,
)
def test_password_close_to_the_email_is_refused(page: Page):
    name = f"acct{tag()}"
    fill_signup(page, f"{name}@latech.edu", f"{name}1")
    expect(alerts(page)).to_be_visible()


def test_common_password_is_refused_by_the_api(api):
    response = signup_api(api, f"acct-{tag()}@latech.edu", "password123")
    assert response.status == 400, response.text()


def test_use_a_different_email_returns_to_the_form(page: Page):
    address = f"acct-{tag()}@latech.edu"
    fill_signup(page, address, f"acct-{uuid.uuid4().hex}")
    page.get_by_role("button", name="Use a different email").click()
    expect(page.get_by_role("heading", name="Find your team.")).to_be_visible()
    expect(page.get_by_label("School email")).to_have_value(address)


def test_duplicate_email_looks_the_same_and_does_not_reveal_the_account(page: Page, verified_user):
    existing = verified_user("Acct Dup", onboarded=False)
    fill_signup(page, existing.email, f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()
    expect(page.get_by_role("status")).to_contain_text(existing.email)
    expect(page.get_by_text("exists")).to_have_count(0)
    expect(page.get_by_role("link", name="Go to sign in")).to_have_count(0)


def test_duplicate_email_gets_an_already_have_an_account_mail_with_a_reset_link(
    page: Page, verified_user
):
    existing = verified_user("Acct Dup Mail", onboarded=False)
    fill_signup(page, existing.email, f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()
    # the "Account Already Exists" mail points at the forgot-password page
    assert new_link(existing.email, r"https?://\S+/reset-password(?!/)").endswith("/reset-password")


def test_duplicate_email_api_status_matches_a_new_signup(api, verified_user):
    existing = verified_user("Acct Dup Api", onboarded=False)
    dup = signup_api(api, existing.email, f"acct-{uuid.uuid4().hex}")
    fresh = signup_api(api, f"acct-{tag()}@latech.edu", f"acct-{uuid.uuid4().hex}")
    assert dup.status == fresh.status == 401
    assert dup.json().keys() == fresh.json().keys()


def test_duplicate_email_in_other_case_is_also_silent(page: Page, verified_user):
    existing = verified_user("Acct Dup Case", onboarded=False)
    fill_signup(page, existing.email.upper(), f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()


def test_signing_up_twice_before_verifying_is_silent_both_times(page: Page):
    address = f"acct-{tag()}@latech.edu"
    fill_signup(page, address, f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()
    fill_signup(page, address, f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()


def test_signup_sends_the_verification_link_to_the_address(page: Page, verify_link):
    address = f"acct-{tag()}@latech.edu"
    fill_signup(page, address, f"acct-{uuid.uuid4().hex}")
    expect(page.get_by_role("heading", name="Check your inbox")).to_be_visible()
    assert re.search(r"/verify-email/\S+", verify_link(address))
