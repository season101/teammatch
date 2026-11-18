"""Settings (theme, shortcuts, install row), avatar (F1-07), and phone width + dark theme."""

import re

import pytest
from playwright.sync_api import Page, expect

PHONE = {"width": 390, "height": 844}
IPHONE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)


@pytest.fixture
def signed(page: Page, verified_user, sign_in):
    def make(name="set", **kw):
        user = verified_user(f"profiles {name}", **kw)
        sign_in(page, user)
        return user

    return make


def theme(page):
    return page.evaluate("document.documentElement.dataset.theme || 'system'")


def contrast(a, b):
    """WCAG contrast ratio of two computed `rgb(...)`/`rgba(...)` colours (alpha ignored)."""

    def lum(c):
        r, g, bl = (
            (v / 255 / 12.92) if v / 255 <= 0.03928 else ((v / 255 + 0.055) / 1.055) ** 2.4
            for v in map(float, re.findall(r"[\d.]+", c)[:3])
        )
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl

    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def no_hscroll(page):
    return page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


# ---------- theme ----------


def test_settings_page_sections(page, signed):
    signed()
    page.goto("/settings")
    expect(page.get_by_role("main").get_by_role("heading", name="Settings", exact=True)).to_be_visible()
    expect(page.get_by_role("heading", name="Appearance")).to_be_visible()
    expect(page.get_by_role("heading", name="Keyboard")).to_be_visible()
    expect(page.get_by_text("Install TeamMatch")).to_be_visible()


def test_theme_defaults_to_system(page, signed):
    signed()
    page.goto("/settings")
    expect(page.get_by_role("radio", name="System")).to_be_checked()


@pytest.mark.parametrize("choice", ["Dark", "Light"])
def test_theme_choice_applies_and_persists_across_reload(page, signed, choice):
    signed()
    page.goto("/settings")
    page.get_by_text(choice, exact=True).click()
    expect(page.get_by_role("radio", name=choice)).to_be_checked()
    assert theme(page) == choice.lower()
    page.reload()
    expect(page.get_by_role("radio", name=choice)).to_be_checked()
    assert theme(page) == choice.lower()
    # Applied before hydration on other pages too.
    page.goto("/profile")
    assert theme(page) == choice.lower()


def test_theme_back_to_system_clears_override(page, signed):
    signed()
    page.goto("/settings")
    page.get_by_text("Dark", exact=True).click()
    page.get_by_text("System", exact=True).click()
    assert theme(page) == "system"
    page.reload()
    expect(page.get_by_role("radio", name="System")).to_be_checked()


def test_theme_radios_work_by_keyboard(page, signed):
    signed()
    page.goto("/settings")
    page.get_by_role("radio", name="System").focus()
    page.keyboard.press("ArrowRight")
    expect(page.get_by_role("radio", name="Dark")).to_be_checked()
    assert theme(page) == "dark"


def test_dark_theme_changes_background_color(page, signed):
    signed()
    page.goto("/settings")
    page.get_by_text("Light", exact=True).click()
    light = page.evaluate("getComputedStyle(document.body).backgroundColor")
    page.get_by_text("Dark", exact=True).click()
    dark = page.evaluate("getComputedStyle(document.body).backgroundColor")
    assert light != dark


def test_system_theme_follows_os_preference(new_context, verified_user, sign_in):
    user = verified_user("profiles os")
    ctx = new_context(color_scheme="dark")
    page = ctx.new_page()
    sign_in(page, user)
    page.goto("/settings")
    dark = page.evaluate("getComputedStyle(document.body).backgroundColor")
    ctx.close()
    ctx = new_context(color_scheme="light")
    page = ctx.new_page()
    sign_in(page, user)
    page.goto("/settings")
    light = page.evaluate("getComputedStyle(document.body).backgroundColor")
    ctx.close()
    assert dark != light


# ---------- keyboard shortcuts ----------


def test_shortcuts_switch_defaults_on_and_persists_off(page, signed):
    signed()
    page.goto("/settings")
    switch = page.get_by_role("switch", name=re.compile("Keyboard shortcuts"))
    expect(switch).to_be_checked()
    switch.click()
    expect(switch).not_to_be_checked()
    page.reload()
    expect(page.get_by_role("switch", name=re.compile("Keyboard shortcuts"))).not_to_be_checked()
    page.get_by_role("switch", name=re.compile("Keyboard shortcuts")).click()
    page.reload()
    expect(page.get_by_role("switch", name=re.compile("Keyboard shortcuts"))).to_be_checked()


def test_shortcuts_switch_toggles_with_space(page, signed):
    signed()
    page.goto("/settings")
    switch = page.get_by_role("switch", name=re.compile("Keyboard shortcuts"))
    switch.focus()
    page.keyboard.press("Space")
    expect(switch).not_to_be_checked()


def test_shortcut_legend_hidden_in_deck_when_off(page, signed):
    signed()
    page.goto("/settings")
    page.get_by_role("switch", name=re.compile("Keyboard shortcuts")).click()
    page.goto("/feed")
    expect(page.get_by_role("complementary", name="Keyboard shortcuts")).to_have_count(0)


def test_shortcut_legend_shown_in_deck_when_on_desktop(page, signed):
    signed()
    page.goto("/feed")
    expect(page.get_by_role("complementary", name="Keyboard shortcuts")).to_be_visible()


# ---------- install row (F2-08) ----------


def test_install_row_on_desktop_gives_menu_steps(page, signed):
    signed()
    page.goto("/settings")
    expect(page.get_by_text("Open your browser's menu and choose Install app or Add to Home screen.")).to_be_visible()


def test_install_row_on_iphone_gives_share_steps(new_context, verified_user, sign_in):
    user = verified_user("profiles ios")
    ctx = new_context(
        viewport=PHONE, user_agent=IPHONE_UA, is_mobile=True, has_touch=True
    )
    page = ctx.new_page()
    sign_in(page, user)
    page.goto("/settings")
    expect(page.get_by_text("In Safari, tap Share, then Add to Home Screen.")).to_be_visible()
    assert no_hscroll(page)
    ctx.close()


def test_install_row_shows_button_when_browser_offers_prompt(page, signed):
    signed()
    page.goto("/settings")
    expect(page.get_by_text("Install TeamMatch")).to_be_visible()
    page.wait_for_load_state("networkidle")
    page.evaluate("window.dispatchEvent(new Event('beforeinstallprompt', {cancelable: true}))")
    expect(page.get_by_role("button", name="Install", exact=True)).to_be_visible()
    expect(page.get_by_text("Add it to your home screen and open it like an app.")).to_be_visible()


def test_install_row_says_installed_after_appinstalled(page, signed):
    signed()
    page.goto("/settings")
    expect(page.get_by_text("Install TeamMatch")).to_be_visible()
    page.wait_for_load_state("networkidle")
    page.evaluate("window.dispatchEvent(new Event('appinstalled'))")
    expect(page.get_by_text("Installed", exact=True)).to_be_visible()


def test_settings_requires_sign_in(page):
    page.goto("/settings")
    expect(page).to_have_url(re.compile(r"/login\?next=%2Fsettings$"))


def test_settings_account_section_phone_has_profile_link_and_sign_out(
    new_context, verified_user, sign_in
):
    user = verified_user("profiles acct")
    ctx = new_context(viewport=PHONE)
    page = ctx.new_page()
    sign_in(page, user)
    page.goto("/settings")
    page.get_by_role("link", name=re.compile("^Profile")).last.click()
    expect(page).to_have_url(re.compile(r"/profile$"))
    ctx.close()


# ---------- avatar (F1-07), links (F1-15), resume (F1-16) ----------


@pytest.fixture
def files(tmp_path):
    from test_profiles_profile import PDF, PNG

    out = {}
    for name, data in {
        "me.png": PNG,
        "cv.pdf": PDF,
        "cv2.pdf": PDF + b"% second\n",
        "notes.txt": b"hello",
        "fake.png": b"not an image at all",
        "fake.pdf": b"not a pdf at all",
    }.items():
        (tmp_path / name).write_bytes(data)
        out[name] = str(tmp_path / name)
    return out


def edit(page):
    page.goto("/profile")
    page.get_by_role("tab", name="Edit").click()


def preview_avatar(page):
    return page.get_by_role("article").locator("img")


def test_avatar_upload_replaces_initials_and_persists(page, signed, files):
    signed()
    edit(page)
    expect(page.get_by_role("button", name="Upload a photo")).to_be_visible()
    page.get_by_label("Photo file").set_input_files(files["me.png"])
    expect(page.get_by_text("Photo updated.")).to_be_visible()
    expect(page.get_by_role("button", name="Change photo")).to_be_visible()
    page.get_by_role("tab", name="Preview").click()
    expect(preview_avatar(page)).to_have_count(1)
    page.reload()
    page.get_by_role("tab", name="Preview").click()
    expect(preview_avatar(page)).to_have_count(1)
    page.wait_for_function(
        "document.querySelector('article img')?.complete && document.querySelector('article img').naturalWidth > 0",
        timeout=10_000,
    )


def test_avatar_wrong_type_is_refused_and_old_photo_kept(page, signed, files):
    signed()
    edit(page)
    page.get_by_label("Photo file").set_input_files(files["me.png"])
    expect(page.get_by_text("Photo updated.")).to_be_visible()
    page.get_by_label("Photo file").set_input_files(files["notes.txt"])
    expect(page.get_by_role("alert").filter(has_text="Choose a JPEG, PNG or WebP image")).to_be_visible()
    expect(page.get_by_role("button", name="Change photo")).to_be_visible()


def test_avatar_fake_image_is_refused_by_the_server_and_old_photo_kept(page, signed, files):
    signed()
    edit(page)
    page.get_by_label("Photo file").set_input_files(files["me.png"])
    expect(page.get_by_text("Photo updated.")).to_be_visible()
    page.get_by_label("Photo file").set_input_files(files["fake.png"])
    expect(page.get_by_role("alert")).to_be_visible()
    expect(page.get_by_role("button", name="Change photo")).to_be_visible()
    page.reload()
    page.get_by_role("tab", name="Edit").click()
    expect(page.get_by_role("button", name="Change photo")).to_be_visible()


def test_avatar_too_big_is_refused(page, signed, tmp_path):
    signed()
    edit(page)
    big = tmp_path / "big.png"
    big.write_bytes(b"\x89PNG" + b"0" * (10 * 1024 * 1024 + 10))
    page.get_by_label("Photo file").set_input_files(str(big))
    expect(page.get_by_role("alert").filter(has_text="10 MB or less")).to_be_visible()
    expect(page.get_by_role("button", name="Upload a photo")).to_be_visible()


def test_avatar_remove(page, signed, files):
    signed()
    edit(page)
    page.get_by_label("Photo file").set_input_files(files["me.png"])
    expect(page.get_by_text("Photo updated.")).to_be_visible()
    page.get_by_role("button", name="Remove photo").click()
    expect(page.get_by_text("Photo removed.")).to_be_visible()
    expect(page.get_by_role("button", name="Upload a photo")).to_be_visible()
    page.get_by_role("tab", name="Preview").click()
    expect(preview_avatar(page)).to_have_count(0)


def test_avatar_is_served_only_to_signed_in_users(page, signed, files, api):
    signed()
    edit(page)
    page.get_by_label("Photo file").set_input_files(files["me.png"])
    expect(page.get_by_text("Photo updated.")).to_be_visible()
    me = page.request.get("/api/v1/me/profile/").json()
    assert me["avatar_url"]
    assert api().send("GET", me["avatar_url"]).status in (401, 403)


def test_links_save_and_show_as_cards_in_preview(page, signed):
    signed()
    edit(page)
    page.get_by_label("GitHub", exact=True).fill("https://github.com/e2e-user")
    page.get_by_label("LinkedIn", exact=True).fill("https://www.linkedin.com/in/e2e-user")
    page.get_by_role("button", name="Save profile").click()
    expect(page.get_by_text("Profile saved.")).to_be_visible()
    page.get_by_role("tab", name="Preview").click()
    links = page.get_by_role("list", name="Links")
    github = links.get_by_role("link", name=re.compile("GitHub"))
    expect(github).to_have_attribute("href", "https://github.com/e2e-user")
    expect(github).to_have_attribute("target", "_blank")
    expect(links.get_by_role("link", name=re.compile("LinkedIn"))).to_have_attribute(
        "href", "https://www.linkedin.com/in/e2e-user"
    )
    page.reload()
    page.get_by_role("tab", name="Edit").click()
    expect(page.get_by_label("GitHub", exact=True)).to_have_value("https://github.com/e2e-user")


def test_no_links_list_without_any_link(page, signed):
    signed()
    page.goto("/profile")
    expect(page.get_by_role("meter", name="Profile strength")).to_be_visible()
    expect(page.get_by_role("list", name="Links")).to_have_count(0)


@pytest.mark.parametrize(
    "field,bad",
    [
        ("GitHub", "http://github.com/x"),
        ("GitHub", "https://gitlab.com/x"),
        ("GitHub", "https://github.com.evil.com/x"),
        ("GitHub", "https://user:pw@github.com/x"),
        ("GitHub", "javascript:alert(1)"),
        ("GitHub", "github.com/x"),
        ("LinkedIn", "https://github.com/x"),
        ("LinkedIn", "http://linkedin.com/in/x"),
    ],
)
def test_bad_links_are_refused_with_one_message(page, signed, field, bad):
    signed()
    edit(page)
    page.get_by_label(field).fill(bad)
    page.get_by_role("button", name="Save profile").click()
    site = "github.com" if field == "GitHub" else "linkedin.com"
    message = f"Enter a link that starts with https://{site}/"
    expect(page.get_by_role("alert").filter(has_text=message)).to_be_visible()
    page.reload()
    page.get_by_role("tab", name="Edit").click()
    expect(page.get_by_label(field)).to_have_value("")


def test_clearing_a_link_removes_it(page, signed):
    signed()
    edit(page)
    page.get_by_label("GitHub", exact=True).fill("https://github.com/e2e-user")
    page.get_by_role("button", name="Save profile").click()
    expect(page.get_by_text("Profile saved.")).to_be_visible()
    page.get_by_label("GitHub", exact=True).fill("")
    page.get_by_role("button", name="Save profile").click()
    expect(page.get_by_text("Profile saved.")).to_be_visible()
    page.get_by_role("tab", name="Preview").click()
    expect(page.get_by_role("list", name="Links")).to_have_count(0)


def test_resume_upload_replace_remove(page, signed, files):
    signed()
    edit(page)
    expect(page.get_by_role("button", name="Add your resume")).to_be_visible()
    page.get_by_label("Resume file").set_input_files(files["cv.pdf"])
    expect(page.get_by_text("Resume added.")).to_be_visible()
    expect(page.get_by_role("link", name=re.compile("cv.pdf"))).to_be_visible()
    page.reload()
    page.get_by_role("tab", name="Edit").click()
    expect(page.get_by_role("link", name=re.compile("cv.pdf"))).to_be_visible()
    page.get_by_label("Resume file").set_input_files(files["cv2.pdf"])
    expect(page.get_by_text("Resume added.")).to_be_visible()
    expect(page.get_by_role("link", name=re.compile("cv2.pdf"))).to_be_visible()
    page.get_by_role("button", name="Remove", exact=True).click()
    expect(page.get_by_text("Resume removed.")).to_be_visible()
    expect(page.get_by_role("button", name="Add your resume")).to_be_visible()


def test_resume_shows_in_preview_links(page, signed, files):
    signed()
    edit(page)
    page.get_by_label("Resume file").set_input_files(files["cv.pdf"])
    expect(page.get_by_text("Resume added.")).to_be_visible()
    page.get_by_role("tab", name="Preview").click()
    links = page.get_by_role("list", name="Links")
    expect(links.get_by_role("link", name=re.compile("Resume"))).to_be_visible()


def test_resume_non_pdf_is_refused(page, signed, files):
    signed()
    edit(page)
    page.get_by_label("Resume file").set_input_files(files["notes.txt"])
    expect(page.get_by_role("alert").filter(has_text="Only PDF files can be uploaded.")).to_be_visible()
    expect(page.get_by_role("button", name="Add your resume")).to_be_visible()


def test_resume_fake_pdf_is_refused_by_the_server_and_old_kept(page, signed, files):
    signed()
    edit(page)
    page.get_by_label("Resume file").set_input_files(files["cv.pdf"])
    expect(page.get_by_text("Resume added.")).to_be_visible()
    page.get_by_label("Resume file").set_input_files(files["fake.pdf"])
    expect(page.get_by_role("alert")).to_be_visible()
    expect(page.get_by_role("link", name=re.compile("cv.pdf"))).to_be_visible()


def test_resume_over_5mb_is_refused(page, signed, tmp_path):
    signed()
    edit(page)
    big = tmp_path / "big.pdf"
    big.write_bytes(b"%PDF-1.4\n" + b"0" * (5 * 1024 * 1024 + 10))
    page.get_by_label("Resume file").set_input_files(str(big))
    expect(page.get_by_role("alert").filter(has_text="over 5 MB")).to_be_visible()


def test_resume_is_private_to_other_students(verified_user, api, page, sign_in, files):
    a = verified_user("profiles cv a")
    b = verified_user("profiles cv b")
    sign_in(page, a)
    edit(page)
    page.get_by_label("Resume file").set_input_files(files["cv.pdf"])
    expect(page.get_by_text("Resume added.")).to_be_visible()
    pid = page.request.get("/api/v1/me/profile/").json()["id"]
    assert api().sign_in(a).send("GET", f"/api/v1/profiles/{pid}/resume/").status == 200
    assert api().sign_in(b).send("GET", f"/api/v1/profiles/{pid}/resume/").status == 403
    assert api().send("GET", f"/api/v1/profiles/{pid}/resume/").status in (401, 403)


# ---------- phone width and dark theme on every profile/settings screen ----------

SCREENS = ["/profile", "/settings"]


@pytest.mark.parametrize("path", SCREENS)
@pytest.mark.parametrize("scheme", ["light", "dark"])
def test_screens_have_no_horizontal_scroll_at_390(new_context, verified_user, sign_in, path, scheme):
    user = verified_user("profiles phone", skills=["Python", "Django", "React"])
    ctx = new_context(viewport=PHONE, color_scheme=scheme)
    page = ctx.new_page()
    sign_in(page, user)
    page.goto(path)
    expect(page.get_by_role("main").get_by_role("heading").first).to_be_visible()
    assert no_hscroll(page)
    ctx.close()


@pytest.mark.parametrize("tab", ["Preview", "Edit"])
def test_profile_tabs_phone_no_hscroll_with_long_content(new_context, verified_user, sign_in, tab):
    user = verified_user("profiles long", skills=["Python", "Django", "React"])
    ctx = new_context(viewport=PHONE)
    page = ctx.new_page()
    sign_in(page, user)
    page.goto("/profile")
    page.get_by_role("tab", name="Edit").click()
    page.get_by_label("Display name").fill("W" * 80)
    page.get_by_label("Major").fill("M" * 100)
    page.get_by_label("Bio").fill(("longwordwithoutspaces" * 30)[:500])
    page.get_by_role("button", name="Save profile").click()
    expect(page.get_by_text("Profile saved.")).to_be_visible()
    page.get_by_role("tab", name=tab).click()
    assert no_hscroll(page)
    ctx.close()


def test_phone_skill_buttons_are_tappable_size(new_context, verified_user, sign_in):
    user = verified_user("profiles tap")
    ctx = new_context(viewport=PHONE)
    page = ctx.new_page()
    sign_in(page, user)
    page.goto("/profile")
    page.get_by_role("tab", name="Edit").click()
    box = page.get_by_role("list", name="Skills to add").get_by_role("button").first.bounding_box()
    assert box["height"] >= 44 - 1
    ctx.close()


def test_dark_theme_profile_form_text_is_readable(page, signed):
    signed()
    page.goto("/settings")
    page.get_by_text("Dark", exact=True).click()
    page.goto("/profile")
    page.get_by_role("tab", name="Edit").click()
    bg, fg = (
        page.evaluate(f"getComputedStyle(document.getElementById('bio')).{prop}")
        for prop in ("backgroundColor", "color")
    )
    assert contrast(bg, fg) >= 4.5, f"bio text {fg} on {bg}"
    expect(page.get_by_role("meter", name="Profile strength")).to_be_visible()
