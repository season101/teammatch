"""F2-12: an optional GitHub repository link and more details on a project."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.projects.models import Project, ProjectStatus

pytestmark = pytest.mark.django_db

REPO = "https://github.com/olive/campus-eats"
NOT_GITHUB = "Enter a link that starts with https://github.com/"


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def client(owner):
    api_client = APIClient()
    api_client.force_authenticate(owner)
    return api_client


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Test term",
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=30),
    )


@pytest.fixture
def project(owner, term):
    return Project.objects.create(
        owner=owner, term=term, title="Campus Eats", pitch="Order ahead", status=ProjectStatus.OPEN
    )


def detail(project):
    return f"/api/v1/projects/{project.id}/"


def test_create_saves_the_repository_and_more_details(client, term):
    body = {"title": "Campus Eats", "pitch": "Order ahead", "repo_url": REPO, "details": "Tue"}
    response = client.post("/api/v1/projects/", body, format="json")
    assert response.status_code == 201
    project = Project.objects.get()
    assert (project.repo_url, project.details) == (REPO, "Tue")
    assert (response.data["repo_url"], response.data["details"]) == (REPO, "Tue")


def test_both_are_optional_and_come_back_empty(client, term):
    response = client.post(
        "/api/v1/projects/", {"title": "Campus Eats", "pitch": "Order ahead"}, format="json"
    )
    assert response.status_code == 201
    shown = client.get(detail(Project.objects.get())).data
    assert (shown["repo_url"], shown["details"]) == ("", "")


@pytest.mark.parametrize(
    "link",
    [
        "campus-eats.com",
        "http://github.com/olive/campus-eats",
        "https://gitlab.com/olive/campus-eats",
        "https://github.com.evil.io/olive",
        "https://github.com@evil.io/olive",
        "https://www.github.com/olive/campus-eats",
        "https://github.com/",
    ],
)
def test_a_link_that_is_not_an_https_github_link_is_refused(client, term, project, link):
    created = client.post(
        "/api/v1/projects/", {"title": "A", "pitch": "B", "repo_url": link}, format="json"
    )
    assert created.status_code == 400
    assert created.data == {"repo_url": [NOT_GITHUB]}

    edited = client.patch(detail(project), {"repo_url": link}, format="json")
    assert edited.status_code == 400
    assert edited.data == {"repo_url": [NOT_GITHUB]}
    project.refresh_from_db()
    assert project.repo_url == ""


def test_owner_edits_them_and_anyone_sees_them(client, project):
    response = client.patch(detail(project), {"repo_url": REPO, "details": "Tue"}, format="json")
    assert response.status_code == 200

    reader = get_user_model().objects.create_user(email="reader@latech.edu", password="pw")
    api_client = APIClient()
    api_client.force_authenticate(reader)
    shown = api_client.get(detail(project)).data
    assert (shown["repo_url"], shown["details"]) == (REPO, "Tue")


def test_owner_can_clear_them(client, project):
    project.repo_url, project.details = REPO, "Tue"
    project.save()
    response = client.patch(detail(project), {"repo_url": "", "details": ""}, format="json")
    assert response.status_code == 200
    project.refresh_from_db()
    assert (project.repo_url, project.details) == ("", "")


def test_more_details_is_limited_to_2000_characters(client, project):
    assert client.patch(detail(project), {"details": "x" * 2000}, format="json").status_code == 200
    response = client.patch(detail(project), {"details": "x" * 2001}, format="json")
    assert response.status_code == 400
    assert "details" in response.data
