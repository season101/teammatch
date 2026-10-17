from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db
URL = "/api/v1/projects/"


@pytest.fixture
def owner():
    user = get_user_model().objects.create_user(email="owner@latech.edu", password="pw")
    user.profile.display_name = "Owner Name"
    user.profile.save()
    return user


@pytest.fixture
def viewer():
    return get_user_model().objects.create_user(email="viewer@latech.edu", password="pw")


@pytest.fixture
def client(viewer):
    api_client = APIClient()
    api_client.force_authenticate(viewer)
    return api_client


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Test term",
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=30),
    )


def make_project(owner, term, title, status=ProjectStatus.OPEN, pitch="A pitch"):
    return Project.objects.create(owner=owner, term=term, title=title, pitch=pitch, status=status)


def test_lists_open_projects_newest_first(client, owner, term):
    for title in ["First", "Second", "Third"]:
        make_project(owner, term, title)
    response = client.get(URL)
    assert response.status_code == 200
    assert [p["title"] for p in response.data["results"]] == ["Third", "Second", "First"]


def test_only_open_projects_are_listed(client, owner, term):
    make_project(owner, term, "Open")
    for status in [ProjectStatus.DRAFT, ProjectStatus.LOCKED, ProjectStatus.ARCHIVED]:
        make_project(owner, term, f"Hidden {status}", status=status)
    response = client.get(URL)
    assert [p["title"] for p in response.data["results"]] == ["Open"]


def test_projects_from_another_term_are_not_listed(client, owner):
    today = timezone.localdate()
    old_term = Term.objects.create(
        name="Old term",
        start_date=today - timedelta(days=200),
        end_date=today - timedelta(days=100),
    )
    make_project(owner, old_term, "Last term")
    assert client.get(URL).data["results"] == []


def test_shows_owner_name_and_open_role_count(client, owner, term):
    project = make_project(owner, term, "TeamMatch")
    Role.objects.create(project=project, title="Backend")
    Role.objects.create(project=project, title="Frontend")
    Role.objects.create(
        project=project, title="Designer", status=RoleStatus.FILLED, filled_by=owner
    )
    item = client.get(URL).data["results"][0]
    assert item["owner_name"] == "Owner Name"
    assert item["open_role_count"] == 2


def test_pitch_is_shortened_and_owner_email_is_not_exposed(client, owner, term):
    make_project(owner, term, "Long pitch", pitch="x" * 500)
    response = client.get(URL)
    assert len(response.data["results"][0]["pitch_preview"]) <= 200
    assert b"owner@latech.edu" not in response.content


def test_list_is_paginated_20_per_page(client, owner, term):
    for number in range(21):
        make_project(owner, term, f"Project {number}")
    first = client.get(URL)
    assert len(first.data["results"]) == 20
    assert first.data["next"] is not None
    second = client.get(first.data["next"])
    assert len(second.data["results"]) == 1


def test_anonymous_user_cannot_list(owner, term):
    response = APIClient().get(URL)
    assert response.status_code in (401, 403)
