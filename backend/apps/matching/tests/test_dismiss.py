from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import RoleDismissal
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def owner():
    return User.objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def candidate():
    return User.objects.create_user(email="sam@latech.edu", password="pw")


@pytest.fixture
def role(owner):
    today = timezone.localdate()
    term = Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )
    project = Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )
    return Role.objects.create(project=project, title="Backend dev")


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def dismiss(user, role):
    return as_user(user).post(f"/api/v1/roles/{role.id}/dismiss/")


def feed_ids(user):
    return [r["id"] for r in as_user(user).get("/api/v1/feed/").json()["results"]]


def test_pass_saves_a_dismissal_and_the_role_leaves_my_feed(candidate, role):
    assert feed_ids(candidate) == [role.id]

    response = dismiss(candidate, role)

    assert response.status_code == 204
    assert RoleDismissal.objects.filter(user=candidate, role=role).exists()
    assert feed_ids(candidate) == []


def test_pass_only_hides_the_role_for_me(candidate, role):
    other = User.objects.create_user(email="kim@latech.edu", password="pw")
    dismiss(candidate, role)

    assert feed_ids(other) == [role.id]


def test_owner_is_not_told(owner, candidate, role):
    dismiss(candidate, role)

    queue = as_user(owner).get(f"/api/v1/roles/{role.id}/applications/").json()["results"]
    assert queue == []


def test_passing_twice_keeps_one_dismissal(candidate, role):
    assert dismiss(candidate, role).status_code == 204
    assert dismiss(candidate, role).status_code == 204
    assert RoleDismissal.objects.count() == 1


def test_owner_cannot_pass_on_their_own_role(owner, role):
    assert dismiss(owner, role).status_code == 403
    assert not RoleDismissal.objects.exists()


def test_filled_role_is_rejected(candidate, role):
    role.status = RoleStatus.FILLED
    role.filled_by = User.objects.create_user(email="kim@latech.edu", password="pw")
    role.save()

    assert dismiss(candidate, role).status_code == 409
    assert not RoleDismissal.objects.exists()


@pytest.mark.parametrize("status", [ProjectStatus.DRAFT, ProjectStatus.ARCHIVED])
def test_role_on_a_project_that_is_not_open_is_rejected(candidate, role, status):
    role.project.status = status
    role.project.save()

    assert dismiss(candidate, role).status_code == 409
    assert not RoleDismissal.objects.exists()


def test_unknown_role_is_404(candidate):
    assert as_user(candidate).post("/api/v1/roles/999999/dismiss/").status_code == 404


def test_requires_sign_in(role):
    assert APIClient().post(f"/api/v1/roles/{role.id}/dismiss/").status_code in (401, 403)
    assert not RoleDismissal.objects.exists()
