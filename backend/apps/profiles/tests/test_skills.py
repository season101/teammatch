import pytest
from django.db import IntegrityError

from apps.accounts.models import User
from apps.profiles.models import Profile, Skill

pytestmark = pytest.mark.django_db


@pytest.fixture
def sam(client):
    user = User.objects.create_user("sam@latech.edu", "a-long-password")
    client.force_login(user)
    return user


def skill(name):
    return Skill.objects.get(name=name)


def test_skill_list_is_seeded(client, sam):
    response = client.get("/api/v1/skills/")
    assert response.status_code == 200
    names = [s["name"] for s in response.json()]
    assert "Django" in names
    assert "React" in names


def test_search_skills(client, sam):
    response = client.get("/api/v1/skills/?q=scr")
    names = [s["name"] for s in response.json()]
    assert names == ["JavaScript", "TypeScript"]


def test_add_skills_to_my_profile(client, sam):
    response = client.patch(
        "/api/v1/me/profile/",
        {"skill_ids": [skill("Django").id, skill("React").id]},
        content_type="application/json",
    )
    assert response.status_code == 200
    assert [s["name"] for s in response.json()["skills"]] == ["Django", "React"]


def test_remove_a_skill(client, sam):
    profile = Profile.objects.create(user=sam)
    profile.skills.set([skill("Django"), skill("React")])
    response = client.patch(
        "/api/v1/me/profile/", {"skill_ids": [skill("React").id]}, content_type="application/json"
    )
    assert response.status_code == 200
    assert list(profile.skills.values_list("name", flat=True)) == ["React"]


def test_unknown_skill_is_rejected(client, sam):
    response = client.patch(
        "/api/v1/me/profile/", {"skill_ids": [999999]}, content_type="application/json"
    )
    assert response.status_code == 400
    assert "skill_ids" in response.json()


def test_public_profile_shows_skills(client, sam):
    alex = User.objects.create_user("alex@latech.edu", "a-long-password")
    profile = Profile.objects.create(user=alex)
    profile.skills.set([skill("Python")])
    response = client.get(f"/api/v1/profiles/{profile.id}/")
    assert [s["name"] for s in response.json()["skills"]] == ["Python"]


def test_skill_names_are_unique_ignoring_case():
    with pytest.raises(IntegrityError):
        Skill.objects.create(name="django", slug="django-2")
