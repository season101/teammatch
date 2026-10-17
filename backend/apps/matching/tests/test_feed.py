from datetime import timedelta
from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus, RoleDismissal
from apps.profiles.models import Skill
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

FEED_URL = "/api/v1/feed/"


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def candidate():
    return get_user_model().objects.create_user(email="candidate@latech.edu", password="pw")


@pytest.fixture
def api(candidate):
    client = APIClient()
    client.force_authenticate(candidate)
    return client


def make_role(project, title="Backend dev", **extra):
    return Role.objects.create(project=project, title=title, **extra)


@pytest.fixture
def project(owner, term):
    return Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )


def feed_ids(api):
    response = api.get(FEED_URL)
    assert response.status_code == 200
    return [role["id"] for role in response.json()["results"]]


def test_feed_requires_sign_in():
    assert APIClient().get(FEED_URL).status_code == 403


def test_feed_lists_open_roles_with_project(api, project, owner):
    owner.profile.display_name = "Olive Owner"
    owner.profile.save()
    django = Skill.objects.create(name="Test Django", slug="test-django")
    role = make_role(project, description="Django + DRF")
    role.required_skills.add(django)

    response = api.get(FEED_URL)

    assert response.status_code == 200
    # the owner's display name only, never their email
    assert response.json()["results"] == [
        {
            "id": role.id,
            "title": "Backend dev",
            "description": "Django + DRF",
            "project": {
                "id": project.id,
                "title": "TeamMatch",
                "pitch": "Find a team",
                "owner_name": "Olive Owner",
            },
            "required_skills": [{"id": django.id, "name": "Test Django", "slug": "test-django"}],
            "created_at": mock.ANY,
        }
    ]


def test_feed_query_count_does_not_grow_with_roles(api, project, django_assert_max_num_queries):
    skill = Skill.objects.create(name="Test Django", slug="test-django")
    for i in range(5):
        make_role(project, title=f"Role {i}").required_skills.add(skill)

    # session user, roles page, required skills
    with django_assert_max_num_queries(4):
        assert len(feed_ids(api)) == 5


def test_feed_excludes_my_own_projects(project, owner):
    make_role(project)
    client = APIClient()
    client.force_authenticate(owner)
    assert feed_ids(client) == []


@pytest.mark.parametrize("status", ApplicationStatus.values)
def test_feed_excludes_roles_i_applied_to(api, candidate, project, status):
    applied = make_role(project, title="Applied")
    other = make_role(project, title="Other")
    Application.objects.create(role=applied, applicant=candidate, status=status)
    assert feed_ids(api) == [other.id]


def test_feed_excludes_roles_i_passed(api, candidate, project):
    passed = make_role(project, title="Passed")
    other = make_role(project, title="Other")
    RoleDismissal.objects.create(user=candidate, role=passed)
    assert feed_ids(api) == [other.id]


def test_other_users_activity_does_not_hide_roles(api, project):
    role = make_role(project)
    someone = get_user_model().objects.create_user(email="someone@latech.edu", password="pw")
    Application.objects.create(role=role, applicant=someone)
    RoleDismissal.objects.create(user=someone, role=role)
    assert feed_ids(api) == [role.id]


def test_feed_excludes_filled_roles(api, project, owner):
    make_role(project, status=RoleStatus.FILLED, filled_by=owner)
    assert feed_ids(api) == []


@pytest.mark.parametrize(
    "status", [ProjectStatus.DRAFT, ProjectStatus.LOCKED, ProjectStatus.ARCHIVED]
)
def test_feed_excludes_projects_that_are_not_open(api, project, status):
    make_role(project)
    project.status = status
    project.save()
    assert feed_ids(api) == []


def test_feed_excludes_other_terms(api, owner):
    today = timezone.localdate()
    past = Term.objects.create(
        name="Past", start_date=today - timedelta(days=200), end_date=today - timedelta(days=100)
    )
    old = Project.objects.create(
        owner=owner, term=past, title="Old", pitch="x", status=ProjectStatus.OPEN
    )
    make_role(old)
    assert feed_ids(api) == []


def test_feed_pages_20_at_a_time_newest_first(api, project):
    roles = [make_role(project, title=f"Role {i}") for i in range(25)]
    newest_first = [role.id for role in reversed(roles)]

    first = api.get(FEED_URL).json()
    assert [r["id"] for r in first["results"]] == newest_first[:20]
    assert first["next"] is not None

    second = api.get(first["next"]).json()
    assert [r["id"] for r in second["results"]] == newest_first[20:]
    assert second["next"] is None
