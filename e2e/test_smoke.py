"""PL-14: a seeded student signs in and the Discover deck shows roles."""

import re

from playwright.sync_api import Page, expect


def test_seeded_user_signs_in_and_sees_the_deck(page: Page, api, seed_candidate, sign_in):
    # bootstrap and seed_demo mark the seed accounts' Team rules accepted, so the gate lets
    # them through. Agreeing again keeps the first time, and covers a stack seeded before that.
    assert api().sign_in(seed_candidate).send("POST", "/api/v1/me/rules/accept/").ok

    sign_in(page, seed_candidate)

    expect(page).to_have_url(re.compile(r"/feed"))
    page.get_by_role("dialog", name="One role at a time").get_by_role(
        "button", name="Got it"
    ).click()
    deck = page.get_by_role("group", name="Deck of open roles")
    expect(deck).to_be_visible()
    # The top card's Apply button names its role, so the deck has at least one card.
    expect(page.get_by_role("button", name=re.compile(r"^Apply to .+ on .+"))).to_be_visible()
