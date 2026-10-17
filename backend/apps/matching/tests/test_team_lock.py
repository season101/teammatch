from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from apps.core.models import Term
from apps.matching.models import Membership, Team
from apps.matching.services import try_lock
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def owner():
    return User.objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def project(owner):
    today = timezone.localdate()
    term = Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )
    return Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )


def add_role(project, filled_by_email=None):
    if filled_by_email is None:
        return Role.objects.create(project=project, title="Open role")
    return Role.objects.create(
        project=project,
        title=f"Role for {filled_by_email}",
        status=RoleStatus.FILLED,
        filled_by=User.objects.create_user(email=filled_by_email, password="pw"),
    )


def test_locks_when_every_role_is_filled(project, owner):
    backend = add_role(project, "sam@latech.edu")
    frontend = add_role(project, "kim@latech.edu")

    team = try_lock(project)

    assert team.project == project
    project.refresh_from_db()
    assert project.status == ProjectStatus.LOCKED
    seats = {(m.user, m.role) for m in team.memberships.all()}
    assert seats == {(owner, None), (backend.filled_by, backend), (frontend.filled_by, frontend)}


def test_does_not_lock_while_a_role_is_open(project):
    add_role(project, "sam@latech.edu")
    add_role(project)

    assert try_lock(project) is None
    project.refresh_from_db()
    assert project.status == ProjectStatus.OPEN
    assert not Team.objects.exists()


def test_does_not_lock_a_project_with_no_roles(project):
    assert try_lock(project) is None
    assert not Team.objects.exists()


def test_does_not_lock_a_project_that_is_not_open(project):
    add_role(project, "sam@latech.edu")
    project.status = ProjectStatus.ARCHIVED
    project.save()

    assert try_lock(project) is None
    assert not Team.objects.exists()


def test_calling_twice_keeps_one_team(project):
    add_role(project, "sam@latech.edu")

    first = try_lock(project)
    second = try_lock(project)

    assert first == second
    assert Team.objects.count() == 1
    assert Membership.objects.count() == 2


def test_db_allows_one_team_per_project(project):
    Team.objects.create(project=project)
    with pytest.raises(IntegrityError):
        Team.objects.create(project=project)


def test_db_allows_one_owner_seat_per_team(project, owner):
    team = Team.objects.create(project=project)
    Membership.objects.create(team=team, user=owner)
    with pytest.raises(IntegrityError):
        Membership.objects.create(team=team, user=owner)
