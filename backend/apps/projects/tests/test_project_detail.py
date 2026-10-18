from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.profiles.models import Skill
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db


def client_for(user):
    api_client = APIClient()
    api_client.force_authenticate(user)
    return api_client


def url(project):
    return f"/api/v1/projects/{project.id}/"


@pytest.fixture
def owner():
    user = get_user_model().objects.create_user(email="owner@latech.edu", password="pw")
    user.profile.display_name = "Owner Name"
    user.profile.save()
    return user


@pytest.fixture
def other():
    return get_user_model().objects.create_user(email="other@latech.edu", password="pw")


@pytest.fixture
def project(owner):
    today = timezone.localdate()
    term = Term.objects.create(
        name="Test term",
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=30),
    )
    return Project.objects.create(owner=owner, term=term, title="TeamMatch", pitch="Find a team")


@pytest.fixture
def skill():
    return Skill.objects.create(name="Test Skill A", slug="test-skill-a")


def test_owner_sees_their_draft_with_roles_and_skills(owner, project, skill):
    role = Role.objects.create(project=project, title="Backend dev", description="APIs")
    role.required_skills.add(skill)
    response = client_for(owner).get(url(project))
    assert response.status_code == 200
    assert response.data["status"] == "draft"
    assert response.data["owner_name"] == "Owner Name"
    assert [r["title"] for r in response.data["roles"]] == ["Backend dev"]
    assert response.data["roles"][0]["required_skills"] == [skill.id]


def test_roles_come_back_in_the_order_they_were_added(owner, project):
    for title in ["First", "Second", "Third"]:
        Role.objects.create(project=project, title=title)
    response = client_for(owner).get(url(project))
    assert [r["title"] for r in response.data["roles"]] == ["First", "Second", "Third"]


def test_someone_else_cannot_see_a_draft(other, project):
    assert client_for(other).get(url(project)).status_code == 404


def test_someone_else_can_see_an_open_project(other, project):
    project.status = ProjectStatus.OPEN
    project.save()
    assert client_for(other).get(url(project)).status_code == 200


def test_someone_else_cannot_see_an_archived_project(other, project):
    project.status = ProjectStatus.ARCHIVED
    project.save()
    assert client_for(other).get(url(project)).status_code == 404


def test_owner_email_is_not_exposed(other, project):
    project.status = ProjectStatus.OPEN
    project.save()
    response = client_for(other).get(url(project))
    assert b"owner@latech.edu" not in response.content


def test_anonymous_user_cannot_see_a_project(project):
    response = APIClient().get(url(project))
    assert response.status_code in (401, 403)
