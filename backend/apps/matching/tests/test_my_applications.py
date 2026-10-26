from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db

User = get_user_model()
MINE = "/api/v1/applications/mine/"


def withdraw_url(application):
    return f"/api/v1/applications/{application.id}/withdraw/"


@pytest.fixture
def owner():
    owner = User.objects.create_user(email="owner@latech.edu", password="pw")
    owner.profile.display_name = "Olive Owner"
    owner.profile.save()
    return owner


@pytest.fixture
def project(owner):
    today = timezone.localdate()
    term = Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )
    return Project.objects.create(
        owner=owner,
        term=term,
        title="Campus Ride Share",
        pitch="Share rides",
        status=ProjectStatus.OPEN,
    )


@pytest.fixture
def sam():
    return User.objects.create_user(email="sam@latech.edu", password="pw")


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def apply(project, user, title="Frontend developer", **extra):
    role = Role.objects.create(project=project, title=title)
    return Application.objects.create(role=role, applicant=user, **extra)


def test_lists_my_applications_with_role_project_and_status(project, sam):
    apply(project, sam, note="I know React")
    apply(project, sam, title="Backend developer", status=ApplicationStatus.LIKED)
    someone_else = User.objects.create_user(email="pat@latech.edu", password="pw")
    apply(project, someone_else, title="Designer")

    response = as_user(sam).get(MINE)

    assert response.status_code == 200
    results = response.json()["results"]
    assert [a["role"]["title"] for a in results] == ["Backend developer", "Frontend developer"]
    first = results[1]
    assert first["status"] == "pending"
    assert first["note"] == "I know React"
    assert first["role"]["project"]["title"] == "Campus Ride Share"
    assert first["role"]["project"]["owner_name"] == "Olive Owner"
    assert "email" not in str(response.json())  # nobody's email is shown


def test_status_filter(project, sam):
    apply(project, sam)
    apply(project, sam, title="Backend developer", status=ApplicationStatus.PASSED)

    results = as_user(sam).get(MINE, {"status": "passed"}).json()["results"]

    assert [a["status"] for a in results] == ["passed"]


def test_withdraw_a_pending_application(owner, project, sam):
    application = apply(project, sam)

    response = as_user(sam).post(withdraw_url(application))

    assert response.status_code == 200
    assert response.json()["status"] == "withdrawn"
    application.refresh_from_db()
    assert application.status == ApplicationStatus.WITHDRAWN
    # it leaves the owner's queue
    queue = as_user(owner).get(f"/api/v1/roles/{application.role_id}/applications/")
    assert queue.json()["results"] == []


@pytest.mark.parametrize(
    "status", [ApplicationStatus.LIKED, ApplicationStatus.PASSED, ApplicationStatus.WITHDRAWN]
)
def test_only_pending_applications_can_be_withdrawn(project, sam, status):
    application = apply(project, sam, status=status)

    response = as_user(sam).post(withdraw_url(application))

    assert response.status_code == 409  # BR-11: a liked (filled) application stays
    assert response.json()["detail"] == "This application is no longer pending."
    application.refresh_from_db()
    assert application.status == status


def test_cannot_withdraw_someone_elses_application(project, sam):
    application = apply(project, sam)
    pat = User.objects.create_user(email="pat@latech.edu", password="pw")

    response = as_user(pat).post(withdraw_url(application))

    assert response.status_code == 404
    application.refresh_from_db()
    assert application.status == ApplicationStatus.PENDING


def test_signed_out_users_get_403(project, sam):
    application = apply(project, sam)

    assert APIClient().get(MINE).status_code == 403
    assert APIClient().post(withdraw_url(application)).status_code == 403
