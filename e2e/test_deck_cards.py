"""F3-01, F3-08: what is on a card, and which roles are (not) in the deck."""

import re

from deck_support import apply_button, deck, expect_top, open_deck, pool, tag  # noqa: F401
from playwright.sync_api import expect


def ids_in_feed(deck, acct):
    return [r["id"] for r in deck.feed(acct)]


def test_card_shows_role_project_owner_match_progress_and_term(page, deck):
    t = tag()
    cand = deck.candidate(["Python", "Docker"])
    proj = deck.project(
        [(f"Card {t}", ["Python", "Figma"]), (f"Other {t}", ["Java"])],
        title=f"CardProj {t}",
        pitch=f"A pitch about {t}.",
    )
    rid = proj.role_id(f"Card {t}")
    open_deck(page, deck, cand, [rid], top=f"Card {t}")
    card = page.get_by_role("article").first
    expect(card.get_by_role("heading", name=f"Card {t}")).to_be_visible()
    expect(card).to_contain_text(f"CardProj {t} · by {proj.owner.user.name}")
    expect(card.get_by_text("50% match")).to_be_visible()
    expect(card.get_by_text(f"A pitch about {t}.")).to_be_visible()
    expect(card.get_by_text(re.compile(r"0 of 2 roles filled · .+"))).to_be_visible()
    skills = card.get_by_role("list", name="Required skills")
    expect(skills).to_contain_text("Python")
    expect(skills).to_contain_text("Figma")
    expect(skills.get_by_text("(you have this skill)")).to_have_count(1)  # Python only


def test_more_than_three_skills_collapse_to_plus_n(page, deck):
    t = tag()
    cand = deck.candidate(["Python"])
    proj = deck.project([(f"Many {t}", ["Python", "Figma", "Java", "Git", "SQL"])])
    rid = proj.role_id(f"Many {t}")
    open_deck(page, deck, cand, [rid], top=f"Many {t}")
    expect(page.get_by_text("+2 more")).to_be_visible()
    expect(page.get_by_text("20% match")).to_be_visible()


def test_progress_counts_filled_roles(page, deck):
    t = tag()
    cand = deck.candidate(["Python"])
    taker = deck.candidate(["Python", "Git"], fresh=True)
    proj = deck.project([(f"One {t}", ["Python"]), (f"Two {t}", ["Python"])], fresh=True)
    deck.commit(proj, f"One {t}", taker)
    rid = proj.role_id(f"Two {t}")
    open_deck(page, deck, cand, [rid], top=f"Two {t}")
    expect(page.get_by_text(re.compile(r"1 of 2 roles filled"))).to_be_visible()


def test_a_role_without_skills_has_no_badge(deck):
    # The API refuses a role with no skills (allow_empty=False), so a badge-less card can't be built.
    t = tag()
    cand = deck.candidate(["Python"])
    proj = deck.project([(f"X {t}", ["Python"])])
    r = proj.client.send(
        "POST",
        f"/api/v1/projects/{proj.id}/roles/",
        {"title": "no skills", "description": "d", "required_skills": []},
    )
    assert r.status == 400
    assert all(row["match_percent"] is not None for row in deck.feed(cand))


def test_own_project_never_appears(page, deck):
    t = tag()
    other = deck.candidate(["Python"])
    proj = deck.project([(f"Mine {t}", ["Python"]), (f"Mine2 {t}", ["Python"])])
    rids = list(proj.roles.values())
    assert not set(rids) & set(ids_in_feed(deck, proj.owner))
    assert set(rids) <= set(ids_in_feed(deck, other))
    assert proj.owner.client.send("POST", f"/api/v1/roles/{rids[0]}/dismiss/").status == 403
    r = proj.owner.client.send("POST", "/api/v1/applications/", {"role": rids[0], "note": ""})
    assert r.status == 403
    # And in the UI: the owner's deck has none of their own roles.
    open_deck(page, deck, proj.owner, [])
    page.goto("/feed")
    expect(page.get_by_role("button", name=re.compile(rf"^Apply to .*{t}"))).to_have_count(0)
    expect(page.get_by_role("button", name=re.compile(r"^Apply to")).or_(
        page.get_by_role("heading", name="You're all caught up")).first).to_be_visible()


def test_applied_and_passed_roles_are_not_in_the_deck(deck):
    t = tag()
    cand = deck.candidate(["Python"])
    proj = deck.project([(f"Ap {t}", ["Python"]), (f"Pa {t}", ["Python"]), (f"Ok {t}", ["Python"])])
    ap, pa, ok = (proj.role_id(f"{n} {t}") for n in ("Ap", "Pa", "Ok"))
    deck.apply(cand, ap)
    assert cand.client.send("POST", f"/api/v1/roles/{pa}/dismiss/").status == 204
    feed = ids_in_feed(deck, cand)
    assert ok in feed and ap not in feed and pa not in feed


def test_filled_roles_are_not_in_the_deck(page, deck):
    t = tag()
    cand = deck.candidate(["Python"])
    taker = deck.candidate(["Python", "Git"], fresh=True)
    proj = deck.project([(f"Full {t}", ["Python"]), (f"Free {t}", ["Python"])], fresh=True)
    deck.commit(proj, f"Full {t}", taker)
    full, free = proj.role_id(f"Full {t}"), proj.role_id(f"Free {t}")
    feed = ids_in_feed(deck, cand)
    assert free in feed and full not in feed
    open_deck(page, deck, cand, [free, full], top=f"Free {t}")
    expect(page.get_by_role("button", name=re.compile(f"^Apply to Full {t}"))).to_have_count(0)


def test_draft_and_closed_projects_are_not_in_the_deck(deck):
    t = tag()
    cand = deck.candidate(["Python"])
    draft = deck.project([(f"Draft {t}", ["Python"])], publish=False)
    closed = deck.project([(f"Closed {t}", ["Python"])])
    assert closed.client.send("POST", f"/api/v1/projects/{closed.id}/close/").ok
    feed = ids_in_feed(deck, cand)
    assert draft.role_id(f"Draft {t}") not in feed
    assert closed.role_id(f"Closed {t}") not in feed


def test_new_published_project_shows_up_in_a_loaded_deck_on_reload(page, deck):
    t = tag()
    cand = deck.candidate(["Python"])
    first = deck.project([(f"Early {t}", ["Python"])])
    open_deck(page, deck, cand, [first.role_id(f"Early {t}")], top=f"Early {t}")
    later = deck.project([(f"Later {t}", ["Python"])])
    deck.isolate(cand, [first.role_id(f"Early {t}"), later.role_id(f"Later {t}")])
    page.reload()
    # Same 100% match: the newer role is on top.
    expect_top(page, f"Later {t}")


def test_applying_twice_via_api_does_not_duplicate(deck):
    t = tag()
    cand = deck.candidate(["Python"])
    proj = deck.project([(f"Dup {t}", ["Python"])])
    rid = proj.role_id(f"Dup {t}")
    deck.apply(cand, rid)
    again = cand.client.send("POST", "/api/v1/applications/", {"role": rid, "note": ""})
    assert not again.ok or again.status == 200
    queue = proj.client.send("GET", f"/api/v1/roles/{rid}/applications/").json()
    queue = queue.get("results", queue) if isinstance(queue, dict) else queue
    assert len(queue) == 1


def test_discover_requires_sign_in(page):
    page.goto("/feed")
    expect(page).to_have_url(re.compile(r"/login|/$|/signup"))
    expect(page.get_by_role("button", name=re.compile("^Apply to"))).to_have_count(0)
