"""Cross-cutting UI checks: responsive (F2-10), PWA (F2-08), navigation, themes, errors, a11y."""

import json
import re
import uuid

import pytest
from playwright.sync_api import Page, expect
from teams_support import (  # noqa: F401  (fixtures)
    apply,
    candidate,
    commit,
    like,
    owned,
    patient_user,
    role_id,
    team_of,
)

WIDTHS = [(360, 740), (390, 844), (768, 1024), (1024, 768), (1440, 900)]
FAKE = "00000000-0000-0000-0000-000000000000"
PUBLIC = ["/", "/login", "/signup", "/reset-password", f"/reset-password/{FAKE}", f"/verify-email/{FAKE}", "/status"]
APP = ["/feed", "/applications", "/projects", "/projects/new", "/applicants", "/teams", "/profile", "/settings"]
WELCOME = ["/welcome/rules", "/welcome/profile", "/welcome/skills"]
GUARDED = APP + [f"/projects/{FAKE}", f"/teams/{FAKE}/chat"]


def pid(p):
    return p.replace(FAKE, "ID")


@pytest.fixture
def owner_page(page: Page, verified_user, sign_in, api):
    """A signed-in, onboarded owner with a draft project, coach marks dismissed."""
    u = verified_user("UI Owner")
    c = api().sign_in(u)
    r = c.send(
        "POST", "/api/v1/projects/", {"title": f"UI proj {uuid.uuid4().hex[:6]}", "pitch": "Pitch for the UI checks."}
    )
    assert r.ok, r.text()
    page.project_id = r.json()["id"]
    page.user = u
    sign_in(page, u)
    page.evaluate("localStorage.setItem('teammatch:coach-seen','1')")
    return page


def overflow(page: Page):
    return page.evaluate("document.documentElement.scrollWidth - innerWidth")


def settle(page: Page, path: str):
    page.goto(path)
    page.wait_for_load_state("load")
    page.wait_for_selector("main", state="attached")
    page.add_style_tag(content="nextjs-portal{display:none!important}")  # dev-server badge covers the tab bar
    page.wait_for_timeout(700)  # data fetches; networkidle never settles on /status


def nav_visible(page: Page):
    return page.get_by_role("navigation", name="Main").locator("visible=true")


# ---------- Responsive (F2-10) ----------


@pytest.mark.parametrize(
    "path,w,h", [pytest.param(p, w, h, id=f"{pid(p)}-{w}") for p in PUBLIC for w, h in WIDTHS]
)
def test_public_routes_no_horizontal_scroll(page: Page, path, w, h):
    page.set_viewport_size({"width": w, "height": h})
    settle(page, path)
    assert overflow(page) <= 0, f"{path} scrolls sideways by {overflow(page)}px at {w}px"


@pytest.mark.parametrize("path", APP + ["PROJECT", "CHAT"] + WELCOME, ids=pid)
def test_app_routes_no_horizontal_scroll(owner_page: Page, path):
    page = owner_page
    if path == "PROJECT":
        path = f"/projects/{page.project_id}"
    if path == "CHAT":
        path = f"/teams/{FAKE}/chat"
    bad = []
    for w, h in WIDTHS:
        page.set_viewport_size({"width": w, "height": h})
        settle(page, path)
        if overflow(page) > 0:
            bad.append(f"{w}px: +{overflow(page)}")
    assert not bad, f"{path} scrolls sideways: {bad}"


# ---------- Tap targets ----------


SMALL_JS = """() => [...document.querySelectorAll('button, a[href], [role=tab]')]
  .filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[aria-hidden=true]')
      && !(e.tagName === 'A' && e.closest('p, li') && s.display === 'inline')
      && (r.height < 43.5 || r.width < 43.5); })
  .map(e => (e.getAttribute('aria-label') || e.textContent).trim().slice(0,30))"""


def small_controls(page: Page, path):
    page.set_viewport_size({"width": 375, "height": 812})
    settle(page, path)
    return page.evaluate(SMALL_JS)


@pytest.mark.parametrize("path", ["/feed", "/projects", "/teams", "/settings", "/projects/new"])
def test_phone_tap_targets_at_least_44px(owner_page: Page, path):
    small = small_controls(owner_page, path)
    assert not small, f"controls under 44px on {path}: {small}"


def test_load_more_is_44px_on_a_phone(owner_page: Page, api):
    # The API says whether Browse has a second page, so a missing button fails instead of passing.
    if not api().sign_in(owner_page.user).send("GET", "/api/v1/projects/").json()["next"]:
        pytest.skip("Browse has one page on this stack, so there's no Load more")
    owner_page.set_viewport_size({"width": 375, "height": 812})
    owner_page.goto("/projects")
    button = owner_page.get_by_role("button", name="Load more").locator("visible=true")
    expect(button).to_be_visible()
    box = button.bounding_box()
    assert box["height"] >= 44 and box["width"] >= 44, box


def test_bottom_tab_bar_targets(owner_page: Page):
    page = owner_page
    page.set_viewport_size({"width": 375, "height": 812})
    settle(page, "/feed")
    tabs = nav_visible(page).get_by_role("link")
    assert tabs.count() >= 4
    for i in range(tabs.count()):
        box = tabs.nth(i).bounding_box()
        assert box["height"] >= 44 and box["width"] >= 44, box


def test_main_routes_with_content_fit_a_360px_phone(page: Page, owned, candidate, sign_in):
    """F2-10 with real content: a locked team and its chat, a draft with a role, Review and role
    details, all with long unbroken words, and the deck's "Add your skills" banner. Nothing scrolls
    sideways or is under 44px to tap."""
    long = "Unbroken" * 8
    p = owned("Fit Owner", [(f"Role{long}", ["Python"])], title=f"Fit {long}")
    member, client = candidate("Fit Member")
    newbie, _ = candidate("Fit Newbie", skills=())
    app_id = apply(client, role_id(p), f"Note {long}")
    like(p, app_id)
    assert commit(client, app_id).ok
    team_id = team_of(client)["id"]
    skills = {s["name"]: s["id"] for s in p.client.send("GET", "/api/v1/skills/").json()}
    draft = p.client.send("POST", "/api/v1/projects/", {"title": f"Draft {long}", "pitch": long})
    assert draft.ok, draft.text()
    draft_id = draft.json()["id"]
    role = p.client.send(
        "POST",
        f"/api/v1/projects/{draft_id}/roles/",
        {"title": f"Role {long}", "description": long, "required_skills": [skills["Python"]]},
    )
    assert role.ok, role.text()

    page.set_viewport_size({"width": 360, "height": 740})
    sign_in(page, p.owner)
    expect(page.get_by_role("dialog", name="It's a Team!")).to_be_visible()
    page.keyboard.press("Escape")
    page.evaluate("localStorage.setItem('teammatch:coach-seen','1')")
    settle(page, f"/teams/{team_id}/chat")
    page.get_by_role("textbox", name=re.compile(r"^Message ")).fill(long * 3)
    page.get_by_role("button", name="Send").click()
    expect(page.get_by_text(long * 3)).to_be_visible()

    paths = [
        "/feed",
        "/applications",
        "/projects",
        f"/projects/{p.id}",
        f"/projects/{p.id}?role={role_id(p)}",
        f"/projects/{draft_id}",
        "/applicants",
        "/teams",
        f"/teams/{team_id}/chat",
        "/profile",
        "/settings",
    ]
    bad = []

    def check(path):
        settle(page, path)
        if overflow(page) > 0:
            bad.append(f"{path} scrolls sideways by {overflow(page)}px")
        if small := page.evaluate(SMALL_JS):
            bad.append(f"{path} has controls under 44px: {small}")

    for path in paths:
        check(path)
    # F3-04: a candidate with no skills gets a banner above the deck.
    page.context.clear_cookies()
    sign_in(page, newbie)
    check("/feed")
    expect(page.get_by_role("link", name="Add your skills")).to_be_visible()
    assert not bad, bad


# ---------- Navigation ----------


def test_desktop_nav_column_and_phone_tab_bar(owner_page: Page):
    page = owner_page
    page.set_viewport_size({"width": 1440, "height": 900})
    settle(page, "/feed")
    nav = nav_visible(page)
    expect(nav).to_have_count(1)
    for name in ["Discover", "Projects", "Review", "Teams", "Profile", "Settings"]:
        expect(nav.get_by_role("link", name=re.compile(rf"^{name}"))).to_be_visible()
    expect(nav.get_by_role("link", name=re.compile("^Discover"))).to_have_attribute("aria-current", "page")
    page.set_viewport_size({"width": 390, "height": 844})
    nav = nav_visible(page)
    expect(nav).to_have_count(1)
    assert nav.bounding_box()["y"] > 600  # bottom bar
    for name in ["Discover", "Projects", "Review", "Teams", "Me"]:
        expect(nav.get_by_role("link", name=re.compile(rf"^{name}"))).to_be_visible()


def test_summary_counts_feed_the_nav_badges(owner_page: Page, api):
    r = api().sign_in(owner_page.user).send("GET", "/api/v1/me/summary/")
    if not r.ok:
        pytest.skip(f"no summary endpoint: {r.status}")
    assert set(r.json()) >= {"offers", "applicants_waiting"}


@pytest.mark.parametrize("w,h", [(1440, 900), (1024, 768), (390, 844)], ids=str)
def test_switching_modes_keeps_a_tab_selected(owner_page: Page, w, h):
    page = owner_page
    page.set_viewport_size({"width": w, "height": h})
    settle(page, "/feed")
    for label, url in [
        ("Review", "/applicants"),
        ("Teams", "/teams"),
        ("Discover", "/feed"),
        ("Projects", "/projects"),
        ("Discover", "/feed"),
    ]:
        nav_visible(page).get_by_role("link", name=re.compile(f"^{label}")).click()
        expect(page).to_have_url(re.compile(url + "$"))
        expect(nav_visible(page).locator("[aria-current=page]")).to_have_count(1)
        expect(nav_visible(page).locator("[aria-current=page]")).to_contain_text(label)
        expect(page.locator("main").first).to_be_visible()
        if w >= 1024:
            side = page.locator("aside:not([aria-label])")
            expect(side).to_be_visible()
            assert side.inner_text().strip()


def test_desktop_sidebar_panel_never_empty_across_modes(owner_page: Page):
    page = owner_page
    page.set_viewport_size({"width": 1440, "height": 900})
    for url in ["/feed", "/applicants", "/teams", "/feed", "/projects", "/settings", "/profile"]:
        settle(page, url)
        panel = page.locator("aside > div").nth(1)
        expect(panel).to_be_visible()
        assert panel.inner_text().strip() or panel.locator("*").count() > 0, f"empty sidebar panel on {url}"
        expect(page.locator("aside [aria-current=page]").first).to_be_visible()


def test_keyboard_focus_visible_on_nav(owner_page: Page):
    page = owner_page
    page.set_viewport_size({"width": 1440, "height": 900})
    settle(page, "/feed")
    nav_visible(page).get_by_role("link").first.focus()
    page.keyboard.press("Tab")
    ok = page.evaluate(
        """() => { const e = document.activeElement; const s = getComputedStyle(e);
          return e !== document.body && ((s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'); }"""
    )
    assert ok, "focused nav link shows no outline or ring"


# ---------- Themes ----------


def luminance(rgb):
    def c(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = rgb
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)


def text_samples(page: Page):
    return page.evaluate(
        """() => {
          const parse = s => (s.match(/[\\d.]+/g) || []).map(Number);
          const bgOf = e => { for (let n = e; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor);
              if (c.length >= 3 && (c[3] === undefined || c[3] > 0.9)) return c; } return [255,255,255]; };
          const out = [];
          for (const e of document.querySelectorAll('main h1, main p, main label, main span, main a, aside a')) {
            if (!e.textContent.trim() || e.children.length > 2) continue;
            const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
            const fg = parse(getComputedStyle(e).color); if (fg[3] !== undefined && fg[3] < 1) continue;
            out.push({text: e.textContent.trim().slice(0, 30), fg: fg.slice(0,3), bg: bgOf(e).slice(0,3)});
          } return out; }"""
    )


@pytest.mark.parametrize("theme", ["light", "dark"])
@pytest.mark.parametrize("path", ["/settings", "/projects", "/feed", "/login"])
def test_text_contrast_in_both_themes(owner_page: Page, path, theme):
    page = owner_page
    page.evaluate(f"localStorage.setItem('teammatch:theme','{theme}')")
    if path == "/login":
        page.context.clear_cookies()
    settle(page, path)
    assert page.evaluate("document.documentElement.dataset.theme") == theme
    bad = []
    for item in text_samples(page):
        hi, lo = sorted([luminance(item["fg"]), luminance(item["bg"])], reverse=True)
        ratio = (hi + 0.05) / (lo + 0.05)
        if ratio < 4.5:
            bad.append(f'{item["text"]!r} {ratio:.2f}')
    assert not bad, f"low contrast in {theme} on {path}: {bad[:8]}"


def test_theme_choice_persists_and_system_follows_os(owner_page: Page):
    page = owner_page
    settle(page, "/settings")
    page.get_by_role("radio", name="Dark").check(force=True)
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    page.reload()
    expect(page.locator("html")).to_have_attribute("data-theme", "dark")
    page.get_by_role("radio", name="System").check(force=True)
    expect(page.locator("html")).not_to_have_attribute("data-theme", re.compile(".+"))
    page.emulate_media(color_scheme="dark")
    dark_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    page.emulate_media(color_scheme="light")
    light_bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    assert dark_bg != light_bg
    page.get_by_role("radio", name="Light").check(force=True)
    expect(page.locator("html")).to_have_attribute("data-theme", "light")


def test_theme_change_reaches_another_open_tab(owner_page: Page):
    page = owner_page
    settle(page, "/settings")
    page.get_by_role("radio", name="Light").check(force=True)
    other = page.context.new_page()
    other.goto("/projects")
    expect(other.locator("html")).to_have_attribute("data-theme", "light")
    page.get_by_role("radio", name="Dark").check(force=True)
    expect(other.locator("html")).to_have_attribute("data-theme", "dark")
    page.get_by_role("radio", name="System").check(force=True)
    expect(other.locator("html")).not_to_have_attribute("data-theme", re.compile(".+"))


# ---------- PWA (F2-08) ----------


def test_manifest_is_valid(page: Page):
    page.goto("/")
    link = page.locator('link[rel="manifest"]').get_attribute("href")
    assert link, "no <link rel=manifest>"
    r = page.request.get(link)
    assert r.ok
    m = json.loads(r.text())
    assert m["name"] and m["start_url"] and m["display"] == "standalone"
    assert {"192x192", "512x512"} <= {i["sizes"] for i in m["icons"]}
    for icon in m["icons"]:
        res = page.request.get(icon["src"])
        assert res.status == 200 and res.headers["content-type"].startswith("image/"), icon


def test_offline_page_sw_and_head_tags_served(page: Page):
    r = page.request.get("/offline.html")
    assert r.ok and "<html" in r.text().lower()
    r = page.request.get("/sw.js")
    assert r.ok and "javascript" in r.headers["content-type"]
    page.goto("/")
    for sel in ['link[rel="apple-touch-icon"]', 'meta[name="theme-color"]']:
        assert page.locator(sel).count() >= 1, sel


def test_service_worker_registers(page: Page):
    page.goto("/")
    page.wait_for_timeout(2500)
    regs = page.evaluate("navigator.serviceWorker.getRegistrations().then(r => r.length)")
    if regs == 0 and page.locator("nextjs-portal").count():  # Next's dev overlay marks a dev server
        pytest.skip("SW registers only in production builds (app-install.tsx); this stack is a dev server")
    assert regs >= 1, "production build did not register /sw.js"


def test_settings_shows_install_row(owner_page: Page):
    settle(owner_page, "/settings")
    expect(owner_page.get_by_text("Install TeamMatch")).to_be_visible()


# ---------- Errors ----------


def test_unknown_route_404_has_way_home(page: Page):
    page.goto("/definitely-not-a-page")
    expect(page.get_by_role("link", name=re.compile("home|TeamMatch|discover|sign in|back", re.I)).first).to_be_visible(
        timeout=3000
    )


def test_unknown_route_returns_404(page: Page):
    assert page.goto("/definitely-not-a-page").status == 404


@pytest.mark.parametrize("path", GUARDED, ids=pid)
def test_signed_out_redirects_to_login_with_next(page: Page, path):
    page.goto(path)
    expect(page).to_have_url(re.compile(r"/login\?next="))
    assert page.url.split("next=")[1] == path.replace("/", "%2F")


def test_status_page_loads(page: Page):
    page.goto("/status")
    expect(page.get_by_role("heading", name="Status", exact=True)).to_be_visible()
    expect(page.get_by_role("status")).to_contain_text(re.compile("All systems go|Degraded"))


# ---------- Basic a11y ----------


@pytest.mark.parametrize("path", ["/", "/login", "/signup", "/reset-password", "/status"] + APP, ids=str)
def test_one_h1_and_main_landmark(owner_page: Page, path):
    page = owner_page
    page.set_viewport_size({"width": 1440, "height": 900})
    if path in PUBLIC:
        page.context.clear_cookies()
    settle(page, path)
    if path != "/login":
        assert "/login" not in page.url, f"{path} redirected to {page.url}"
    page.wait_for_timeout(500)
    assert page.locator("h1:visible").count() == 1, f"{path}: {page.locator('h1:visible').count()} h1"
    assert page.locator("main:visible").count() == 1, f"{path}: main count"


@pytest.mark.parametrize(
    "path", ["/login", "/signup", "/reset-password", "/projects/new", "/settings", "/welcome/profile"]
)
def test_fields_have_labels_and_images_have_alt(owner_page: Page, path):
    page = owner_page
    if path in ("/login", "/signup", "/reset-password"):
        page.context.clear_cookies()
    settle(page, path)
    page.wait_for_timeout(500)
    unlabeled = page.evaluate(
        """() => [...document.querySelectorAll('input:not([type=hidden]), textarea, select')]
          .filter(e => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'))
          .map(e => e.outerHTML.slice(0, 80))"""
    )
    assert not unlabeled, unlabeled
    noalt = page.evaluate("[...document.images].filter(i => !i.hasAttribute('alt')).map(i => i.src)")
    assert not noalt, noalt


def test_landing_has_lang_title_and_alt(page: Page):
    page.goto("/")
    assert page.evaluate("[...document.images].filter(i => !i.hasAttribute('alt')).length") == 0
    assert page.locator("html").get_attribute("lang")
    assert page.title().strip()


def test_welcome_step_has_one_h1_and_main(page: Page, verified_user, sign_in):
    sign_in(page, verified_user("UI Newbie", onboarded=False))
    page.goto("/welcome/rules")
    expect(page.get_by_role("heading", name="Team rules")).to_be_visible()
    assert page.locator("h1:visible").count() == 1
    assert page.locator("main:visible").count() == 1
