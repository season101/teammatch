from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.projects.models import Project, ProjectStatus

pytestmark = pytest.mark.django_db
URL = "/api/v1/projects/"


@pytest.fixture
def user():
    return get_user_model().objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def client(user):
    api_client = APIClient()
    api_client.force_authenticate(user)
    return api_client


@pytest.fixture
def active_term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Test term",
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=30),
    )


def test_create_makes_a_draft_owned_by_me(client, user, active_term):
    response = client.post(URL, {"title": "TeamMatch", "pitch": "Find a team"}, format="json")
    assert response.status_code == 201
    project = Project.objects.get()
    assert project.owner == user
    assert project.term == active_term
    assert project.status == ProjectStatus.DRAFT


def test_missing_fields_are_rejected(client, active_term):
    response = client.post(URL, {}, format="json")
    assert response.status_code == 400
    assert "title" in response.data
    assert "pitch" in response.data


def test_too_long_values_are_rejected(client, active_term):
    response = client.post(URL, {"title": "x" * 101, "pitch": "y" * 2001}, format="json")
    assert response.status_code == 400


def test_no_active_term_blocks_creation(client):
    response = client.post(URL, {"title": "TeamMatch", "pitch": "Find a team"}, format="json")
    assert response.status_code == 409
    assert Project.objects.count() == 0


def test_anonymous_user_cannot_create(active_term):
    response = APIClient().post(URL, {"title": "A", "pitch": "B"}, format="json")
    assert response.status_code in (401, 403)
