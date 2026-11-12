from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

URL = "/api/v1/me/summary/"


def user(name):
    return get_user_model().objects.create_user(email=f"{name}@latech.edu", password="pw")


def client_for(who):
    client = APIClient()
    client.force_authenticate(who)
    return client


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


@pytest.fixture
def owner():
    return user("owner")


@pytest.fixture
def me():
    return user("me")


@pytest.fixture
def project(owner, term):
    return Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )


def test_summary_requires_sign_in():
    assert APIClient().get(URL).status_code == 403


def test_summary_starts_empty(me):
    assert client_for(me).get(URL).json() == {
        "offers": 0,
        "applicants_waiting": 0,
        "deck": "open",
    }


def test_offers_counts_only_my_liked_applications(me, project):
    liked = Role.objects.create(project=project, title="Liked")
    pending = Role.objects.create(project=project, title="Pending")
    Application.objects.create(role=liked, applicant=me, status=ApplicationStatus.LIKED)
    Application.objects.create(role=pending, applicant=me)
    Application.objects.create(role=liked, applicant=user("other"), status=ApplicationStatus.LIKED)

    assert client_for(me).get(URL).json()["offers"] == 1


def test_applicants_waiting_counts_the_review_queue(owner, project):
    open_role = Role.objects.create(project=project, title="Open")
    filled = Role.objects.create(
        project=project, title="Filled", status=RoleStatus.FILLED, filled_by=user("seat")
    )
    Application.objects.create(role=open_role, applicant=user("a"))
    Application.objects.create(role=open_role, applicant=user("b"))
    # not in the queue: decided, on a filled role, or from someone benched (BR-09)
    Application.objects.create(role=open_role, applicant=user("c"), status=ApplicationStatus.LIKED)
    Application.objects.create(role=filled, applicant=user("d"))
    benched = user("e")
    benched.profile.retired_until = timezone.localdate()
    benched.profile.save()
    Application.objects.create(role=open_role, applicant=benched)

    assert client_for(owner).get(URL).json()["applicants_waiting"] == 2


def test_applicants_on_someone_elses_project_are_not_mine(me, project):
    role = Role.objects.create(project=project, title="Open")
    Application.objects.create(role=role, applicant=user("a"))

    assert client_for(me).get(URL).json()["applicants_waiting"] == 0


def test_applicants_on_my_closed_project_do_not_count(owner, project):
    role = Role.objects.create(project=project, title="Open")
    Application.objects.create(role=role, applicant=user("a"))
    project.status = ProjectStatus.ARCHIVED
    project.save()

    assert client_for(owner).get(URL).json()["applicants_waiting"] == 0


def test_deck_is_benched_while_im_retired(me):
    me.profile.retired_until = timezone.localdate()
    me.profile.save()

    assert client_for(me).get(URL).json()["deck"] == "benched"


def test_deck_is_committed_while_i_hold_a_seat(me, project):
    Role.objects.create(project=project, title="Mine", status=RoleStatus.FILLED, filled_by=me)

    assert client_for(me).get(URL).json()["deck"] == "committed"
