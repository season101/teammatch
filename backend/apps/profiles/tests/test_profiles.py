import pytest

from apps.accounts.models import User
from apps.profiles.models import Profile

pytestmark = pytest.mark.django_db


@pytest.fixture
def sam():
    return User.objects.create_user("sam@latech.edu", "a-long-password")


@pytest.fixture
def alex():
    return User.objects.create_user("alex@latech.edu", "a-long-password")


def test_me_profile_needs_sign_in(client):
    assert client.get("/api/v1/me/profile/").status_code in (401, 403)


def test_new_user_has_a_profile_without_visiting_it(sam):
    assert Profile.objects.filter(user=sam).exists()


def test_me_profile_shows_my_email(client, sam):
    client.force_login(sam)
    response = client.get("/api/v1/me/profile/")
    assert response.status_code == 200
    assert response.json()["email"] == "sam@latech.edu"


def test_edit_my_profile(client, sam):
    client.force_login(sam)
    response = client.patch(
        "/api/v1/me/profile/",
        {"display_name": "Sam", "bio": "I like Django.", "major": "Computer Science"},
        content_type="application/json",
    )
    assert response.status_code == 200
    profile = Profile.objects.get(user=sam)
    assert (profile.display_name, profile.bio, profile.major) == (
        "Sam",
        "I like Django.",
        "Computer Science",
    )


def test_bio_over_500_chars_is_rejected(client, sam):
    client.force_login(sam)
    response = client.patch(
        "/api/v1/me/profile/", {"bio": "x" * 501}, content_type="application/json"
    )
    assert response.status_code == 400
    assert "bio" in response.json()


def test_public_profile_hides_email(client, sam, alex):
    Profile.objects.filter(user=sam).update(display_name="Sam", major="CS")
    profile = sam.profile
    client.force_login(alex)
    response = client.get(f"/api/v1/profiles/{profile.id}/")
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Sam"
    assert "email" not in body
    assert "sam@latech.edu" not in response.content.decode()


def test_cannot_edit_someone_elses_profile(client, sam, alex):
    Profile.objects.filter(user=sam).update(display_name="Sam")
    profile = sam.profile
    client.force_login(alex)
    response = client.patch(
        f"/api/v1/profiles/{profile.id}/",
        {"display_name": "Hacked"},
        content_type="application/json",
    )
    assert response.status_code == 403
    profile.refresh_from_db()
    assert profile.display_name == "Sam"


# Team rules (DD-12): everyone agrees once, before their first deck.

RULES_URL = "/api/v1/me/rules/accept/"


def test_accept_rules_needs_sign_in(client):
    assert client.post(RULES_URL).status_code in (401, 403)


def test_new_profile_has_not_accepted_the_rules(client, sam):
    client.force_login(sam)
    assert client.get("/api/v1/me/profile/").json()["rules_accepted_at"] is None


def test_accept_rules_stamps_my_profile_only(client, sam, alex):
    client.force_login(sam)

    assert client.post(RULES_URL).status_code == 204

    assert client.get("/api/v1/me/profile/").json()["rules_accepted_at"] is not None
    assert Profile.objects.get(user=alex).rules_accepted_at is None


def test_accepting_twice_keeps_the_first_time(client, sam):
    client.force_login(sam)
    client.post(RULES_URL)
    first = Profile.objects.get(user=sam).rules_accepted_at

    assert client.post(RULES_URL).status_code == 204
    assert Profile.objects.get(user=sam).rules_accepted_at == first


def test_rules_accepted_at_cannot_be_patched(client, sam):
    client.force_login(sam)
    client.patch(
        "/api/v1/me/profile/",
        {"rules_accepted_at": "2020-01-01T00:00:00Z"},
        content_type="application/json",
    )
    assert Profile.objects.get(user=sam).rules_accepted_at is None


def test_rules_accepted_at_is_not_on_the_public_profile(client, sam, alex):
    client.force_login(alex)
    profile = Profile.objects.get(user=sam)
    assert "rules_accepted_at" not in client.get(f"/api/v1/profiles/{profile.id}/").json()
