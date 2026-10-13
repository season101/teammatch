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


def test_me_profile_is_created_on_first_visit(client, sam):
    client.force_login(sam)
    response = client.get("/api/v1/me/profile/")
    assert response.status_code == 200
    assert response.json()["email"] == "sam@latech.edu"
    assert Profile.objects.filter(user=sam).exists()


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
    profile = Profile.objects.create(user=sam, display_name="Sam", major="CS")
    client.force_login(alex)
    response = client.get(f"/api/v1/profiles/{profile.id}/")
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Sam"
    assert "email" not in body
    assert "sam@latech.edu" not in response.content.decode()


def test_cannot_edit_someone_elses_profile(client, sam, alex):
    profile = Profile.objects.create(user=sam, display_name="Sam")
    client.force_login(alex)
    response = client.patch(
        f"/api/v1/profiles/{profile.id}/",
        {"display_name": "Hacked"},
        content_type="application/json",
    )
    assert response.status_code == 403
    profile.refresh_from_db()
    assert profile.display_name == "Sam"
