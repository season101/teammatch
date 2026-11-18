"""Account screens at 390 px: nothing scrolls sideways, the main control is reachable."""

import uuid

import pytest
from accounts_support import RESET, alerts, mail_links, new_link
from playwright.sync_api import Page, expect

PHONE = {"width": 390, "height": 844}


def no_sideways_scroll(page: Page):
    # let the layout settle, then compare the page's width to the window's
    page.wait_for_timeout(500)  # the dev server never goes network-idle (HMR)
    widths = page.evaluate(
        "({s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth})"
    )
    assert widths["s"] <= widths["c"], f"{page.url}: scrollWidth {widths['s']} > {widths['c']}"


@pytest.fixture
def phone(page: Page):
    page.set_viewport_size(PHONE)
    return page


@pytest.mark.parametrize(
    "path,heading",
    [
        ("/login", "Sign in or sign up"),
        ("/signup", "Sign in or sign up"),
        ("/reset-password", "Forgot your password?"),
        ("/verify-email/garbage", "Verify your email"),
        ("/reset-password/garbage", "This link has expired"),
    ],
)
def test_signed_out_screens_fit(phone: Page, path, heading):
    phone.goto(path)
    expect(phone.get_by_role("heading", name=heading)).to_be_visible()
    no_sideways_scroll(phone)


def test_error_and_check_inbox_states_fit(phone: Page, verified_user):
    user = verified_user("Acct MobErr", onboarded=False)
    phone.goto("/login")
    phone.get_by_label("School email").fill("x" * 40 + "@" + "very-long-subdomain.example.com")
    phone.get_by_role("button", name="Continue with email").click()
    phone.get_by_label("Password").fill("wrong-wrong-123")
    phone.get_by_role("button", name="Sign in", exact=True).click()
    expect(alerts(phone)).to_be_visible()
    no_sideways_scroll(phone)

    phone.goto("/signup")
    long_email = f"acct-{'a' * 30}-{uuid.uuid4().hex[:6]}@latech.edu"
    phone.get_by_label("School email").fill(long_email)
    phone.get_by_role("button", name="Continue with email").click()
    phone.get_by_label("Password").fill(f"acct-{uuid.uuid4().hex}")
    phone.get_by_role("button", name="Sign up").click()
    expect(phone.get_by_role("heading", name="Check your inbox")).to_be_visible()
    no_sideways_scroll(phone)

    seen = mail_links(user.email, RESET)
    phone.goto("/reset-password")
    phone.get_by_label("School email").fill(user.email)
    phone.get_by_role("button", name="Send reset link").click()
    expect(phone.get_by_role("heading", name="Check your inbox")).to_be_visible()
    no_sideways_scroll(phone)
    link = new_link(user.email, RESET, seen)
    phone.goto(link)
    expect(phone.get_by_role("heading", name="Set a new password")).to_be_visible()
    no_sideways_scroll(phone)
    phone.get_by_label("New password").fill("123456789012")
    phone.get_by_role("button", name="Save password").click()
    expect(alerts(phone)).to_be_visible()
    no_sideways_scroll(phone)


def test_verify_screens_fit(phone: Page, make_user, verify_link):
    user = make_user("Acct MobVer")
    phone.goto("/signup")
    phone.get_by_label("School email").fill(user.email)
    phone.get_by_role("button", name="Continue with email").click()
    phone.get_by_label("Password").fill(user.password)
    phone.get_by_role("button", name="Sign up").click()
    expect(phone.get_by_role("heading", name="Check your inbox")).to_be_visible()
    phone.goto(verify_link(user.email))
    phone.get_by_role("button", name="Verify my email").click()
    expect(phone.get_by_role("heading", name="You're verified")).to_be_visible()
    no_sideways_scroll(phone)
    phone.get_by_role("link", name="Continue").click()
    expect(phone.get_by_role("heading", name="Team rules")).to_be_visible()
    no_sideways_scroll(phone)
    phone.get_by_role("button", name="I agree").click()
    expect(phone.get_by_role("heading", name="Confirm your info")).to_be_visible()
    no_sideways_scroll(phone)
    phone.get_by_label("Name", exact=True).fill(user.name)
    phone.get_by_label("Major", exact=True).fill(user.major)
    phone.get_by_role("button", name="Continue").click()
    expect(phone.get_by_role("heading", name="What can you do?")).to_be_visible()
    no_sideways_scroll(phone)


def test_phone_sign_in_then_settings_fit(phone: Page, verified_user, sign_in):
    user = verified_user("Acct MobSet")
    sign_in(phone, user)
    phone.goto("/settings")
    expect(phone.get_by_role("heading", name="Settings")).to_be_visible()
    no_sideways_scroll(phone)
    expect(phone.get_by_role("button", name="Sign out")).to_be_visible()


def test_phone_buttons_are_big_enough_to_tap(phone: Page):
    phone.goto("/login")
    box = phone.get_by_role("button", name="Continue with email").bounding_box()
    assert box["height"] >= 40, box
    phone.get_by_label("School email").fill(f"acct-{uuid.uuid4().hex[:6]}@latech.edu")
    phone.get_by_role("button", name="Continue with email").click()
    for name in ("Sign in",):
        box = phone.get_by_role("button", name=name, exact=True).bounding_box()
        assert box["height"] >= 40, box
    box = phone.get_by_label("Password").bounding_box()
    assert box["height"] >= 40, box
