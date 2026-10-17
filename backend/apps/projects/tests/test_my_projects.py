from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db

User = get_user_model()

URL = "/api/v1/projects/mine/"


@pytest.fixture
def owner():
    return User.objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


def make_project(owner, term, title="TeamMatch", status=ProjectStatus.OPEN):
    return Project.objects.create(owner=owner, term=term, title=title, pitch="p", status=status)


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_lists_my_projects_with_their_roles(owner, term):
    project = make_project(owner, term)
    backend = Role.objects.create(project=project, title="Backend dev")
    frontend = Role.objects.create(project=project, title="Frontend dev")

    response = as_user(owner).get(URL)

    assert response.status_code == 200
    [item] = response.json()
    assert (item["id"], item["title"], item["status"]) == (project.id, "TeamMatch", "open")
    roles = {(role["id"], role["title"], role["status"]) for role in item["roles"]}
    assert roles == {(backend.id, "Backend dev", "open"), (frontend.id, "Frontend dev", "open")}


def test_lists_only_my_projects_newest_first(owner, term):
    older = make_project(owner, term, title="Older", status=ProjectStatus.DRAFT)
    newer = make_project(owner, term, title="Newer")
    make_project(User.objects.create_user(email="other@latech.edu", password="pw"), term)

    titles = [p["title"] for p in as_user(owner).get(URL).json()]

    assert titles == [newer.title, older.title]


def test_query_count_does_not_grow_with_projects(owner, term, django_assert_max_num_queries):
    for i in range(4):
        Role.objects.create(project=make_project(owner, term, title=f"P{i}"), title="r")

    # projects, then their roles
    with django_assert_max_num_queries(2):
        assert len(as_user(owner).get(URL).json()) == 4


def test_requires_sign_in():
    assert APIClient().get(URL).status_code in (401, 403)
