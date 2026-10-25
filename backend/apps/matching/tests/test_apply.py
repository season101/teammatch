from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.matching.tests.test_fill_and_lock import committed, needs_postgres, race
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus
from apps.projects.services import close_project

pytestmark = pytest.mark.django_db

User = get_user_model()

URL = "/api/v1/applications/"


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


def apply(user, role, **body):
    return as_user(user).post(URL, {"role": role.id, **body}, format="json")


def test_apply_creates_a_pending_application_the_owner_sees(owner, candidate, role):
    response = apply(candidate, role, note="I built two Django apps")

    assert response.status_code == 201
    assert response.json()["status"] == ApplicationStatus.PENDING
    assert response.json()["note"] == "I built two Django apps"
    queue = as_user(owner).get(f"/api/v1/roles/{role.id}/applications/").json()["results"]
    assert [a["note"] for a in queue] == ["I built two Django apps"]


def test_note_is_optional(candidate, role):
    response = apply(candidate, role)

    assert response.status_code == 201
    assert response.json()["note"] == ""


def test_note_longer_than_300_chars_is_rejected(candidate, role):
    assert apply(candidate, role, note="x" * 301).status_code == 400
    assert not Application.objects.exists()


@pytest.mark.parametrize("status", [ApplicationStatus.PENDING, ApplicationStatus.WITHDRAWN])
def test_applying_twice_is_rejected(candidate, role, status):
    Application.objects.create(role=role, applicant=candidate, status=status)

    response = apply(candidate, role)

    assert response.status_code == 409
    assert Application.objects.count() == 1


def test_owner_cannot_apply_to_their_own_role(owner, role):
    assert apply(owner, role).status_code == 403
    assert not Application.objects.exists()


def test_filled_role_says_it_was_just_filled(candidate, role):
    role.status = RoleStatus.FILLED
    role.filled_by = User.objects.create_user(email="kim@latech.edu", password="pw")
    role.save()

    response = apply(candidate, role)

    assert response.status_code == 409
    assert response.json()["detail"] == "This role was just filled."
    assert not Application.objects.exists()


def test_role_on_a_project_that_is_not_open_is_rejected(candidate, role):
    role.project.status = ProjectStatus.ARCHIVED
    role.project.save()

    assert apply(candidate, role).status_code == 409
    assert not Application.objects.exists()


def test_unknown_role_is_rejected(candidate):
    response = as_user(candidate).post(URL, {"role": 999999}, format="json")
    assert response.status_code == 400


def test_requires_sign_in(role):
    assert APIClient().post(URL, {"role": role.id}, format="json").status_code in (401, 403)


@needs_postgres
@committed
def test_apply_fails_if_the_project_was_just_closed(candidate, role):
    outcome = race(lambda: close_project(role.project), lambda: apply(candidate, role))

    assert outcome.status_code == 409
    assert not Application.objects.exists()
