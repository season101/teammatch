"""Every team screen at 390px wide, in light and dark: no sideways scroll, key controls reachable."""

import re

import pytest
from playwright.sync_api import Page, expect
from teams_support import (  # noqa: F401  (fixtures)
    apply,
    candidate,
    card,
    commit,
    like,
    owned,
    patient_user,
    role_id,
    role_title,
    team_of,
)


def no_sideways_scroll(page: Page, where):
    extra = page.evaluate(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    assert extra <= 0, f"{where}: page is {extra}px wider than the 390px screen"


def seen_dark(page: Page, theme):
    scheme = page.evaluate("getComputedStyle(document.body).backgroundColor")
    channels = [int(n) for n in re.findall(r"\d+", scheme)[:3]]
    if theme == "dark":
        assert sum(channels) < 300, f"body background {scheme} isn't dark"
    else:
        assert sum(channels) > 500, f"body background {scheme} isn't light"


@pytest.mark.parametrize("theme", ["light", "dark"])
def test_team_screens_at_phone_width(browser, base_url, owned, candidate, sign_in, theme):
    # A project with a filled role, a waiting applicant and an offer out; and a locked team.
    p = owned("Phone Owner", [("Front", ["Python"]), ("Back", ["Python"])])
    c_front, c_front_c = candidate("Phone Front")
    c_wait, c_wait_c = candidate("Phone Waiting")
    c_offer, c_offer_c = candidate("Phone Offered")
    a = apply(c_front_c, role_id(p, "Front"))
    like(p, a)
    assert commit(c_front_c, a).ok
    apply(c_wait_c, role_id(p, "Back"), "A long note " * 25)
    a = apply(c_offer_c, role_id(p, "Back"))
    like(p, a)
    q = owned("Phone Team Owner", [("Only", ["Python"])])
    m, m_client = candidate("Phone Member")
    a = apply(m_client, role_id(q))
    like(q, a)
    assert commit(m_client, a).ok

    context = browser.new_context(
        base_url=base_url,
        viewport={"width": 390, "height": 844},
        color_scheme=theme,
        is_mobile=True,
        has_touch=True,
    )
    context.add_init_script(f"localStorage.setItem('teammatch:theme', '{theme}')")
    page = context.new_page()
    try:
        # Owner Review, with the nav as tabs.
        sign_in(page, p.owner)
        page.goto("/applicants")
        page.get_by_role("tab", name=re.compile("^Back")).click()
        expect(card(page, c_wait.name)).to_be_visible()
        expect(page.get_by_role("region", name="Offers out")).to_be_visible()
        expect(page.get_by_role("button", name=f"Like {c_wait.name}")).to_be_visible()
        expect(page.get_by_role("button", name=f"Pass on {c_wait.name}")).to_be_visible()
        seen_dark(page, theme)
        no_sideways_scroll(page, "Review")
        page.get_by_role("tab", name=re.compile("^Front")).click()
        expect(page.get_by_role("heading", name=f"{c_front.name} committed")).to_be_visible()
        no_sideways_scroll(page, "Review, filled role")

        # Offers on a phone: Commit and Decline reachable without sideways scroll.
        page.context.clear_cookies()
        sign_in(page, c_offer)
        page.goto("/applications")
        expect(page.get_by_role("button", name=re.compile("^Commit to"))).to_be_visible()
        expect(page.get_by_role("button", name=re.compile("^Decline"))).to_be_visible()
        seen_dark(page, theme)
        no_sideways_scroll(page, "Offers")
        page.get_by_role("button", name=re.compile("^Commit to")).click()
        dialog = page.get_by_role("dialog", name=re.compile("^Commit to"))
        expect(dialog.get_by_role("button", name="Keep my options")).to_be_visible()
        expect(dialog.get_by_role("button", name=re.compile("^Commit to"))).to_be_visible()
        no_sideways_scroll(page, "Commit dialog")
        page.keyboard.press("Escape")

        # Celebration, Teams and chat for the locked team's member.
        page.context.clear_cookies()
        sign_in(page, m)
        celebration = page.get_by_role("dialog", name="It's a Team!")
        expect(celebration).to_be_visible()
        expect(celebration.get_by_role("link", name="Open team chat")).to_be_in_viewport()
        no_sideways_scroll(page, "It's a Team!")
        celebration.get_by_role("link", name="See the team").click()
        expect(page.get_by_role("heading", name=q.title, level=2)).to_be_visible()
        seen_dark(page, theme)
        no_sideways_scroll(page, "Teams")
        page.get_by_role("link", name="Open team chat").click()
        expect(page).to_have_url(re.compile(r"/chat"))
        text = page.get_by_role("textbox", name=re.compile(r"^Message "))
        expect(page.get_by_role("button", name="Send")).to_be_enabled()
        text.fill("y" * 300)
        text.press("Enter")
        expect(page.get_by_role("log", name="Messages")).to_contain_text("y" * 50)
        expect(text).to_be_in_viewport()
        seen_dark(page, theme)
        no_sideways_scroll(page, "Chat")
        assert team_of(m_client)["project"]["title"] == q.title
    finally:
        context.close()
