"""A role or application deleted while a request held a stale copy answers 404, not 500."""

from datetime import timedelta

import pytest
from django.http import Http404
from django.utils import timezone

from apps.accounts.models import User
from apps.core.models import Term
from apps.matching import services
from apps.matching.models import Application, ApplicationStatus
from apps.projects.models import Project, ProjectStatus, Role
from apps.projects.services import delete_role

pytestmark = pytest.mark.django_db


@pytest.fixture
def role():
    today = timezone.localdate()
    term = Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )
    owner = User.objects.create_user("owner@latech.edu", "pw")
    project = Project.objects.create(
        owner=owner, term=term, title="Open", pitch="x", status=ProjectStatus.OPEN
    )
    Role.objects.create(project=project, title="Keeps the project open")
    return Role.objects.create(project=project, title="Backend dev")


@pytest.fixture
def sam():
    return User.objects.create_user("sam@latech.edu", "pw")


def test_applying_to_a_role_deleted_meanwhile(role, sam):
    Role.objects.filter(pk=role.pk).delete()

    with pytest.raises(Http404):
        services.apply(role, sam)


@pytest.mark.parametrize(
    ("status", "act"),
    [
        (ApplicationStatus.PENDING, lambda a: services.decide(a, ApplicationStatus.LIKED)),
        (ApplicationStatus.PENDING, lambda a: services.decide(a, ApplicationStatus.PASSED)),
        (ApplicationStatus.PENDING, services.withdraw),
        (ApplicationStatus.LIKED, services.commit),
        (ApplicationStatus.LIKED, services.decline),
    ],
)
def test_acting_on_an_application_whose_role_was_deleted_meanwhile(role, sam, status, act):
    application = Application.objects.create(role=role, applicant=sam, status=status)
    Role.objects.filter(pk=role.pk).delete()  # its applications go with it

    with pytest.raises(Http404):
        act(application)


def test_deleting_a_role_twice(role):
    delete_role(role)

    with pytest.raises(Http404):
        delete_role(role)
