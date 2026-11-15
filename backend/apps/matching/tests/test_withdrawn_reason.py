"""A withdrawn application says why it closed, so the candidate isn't told "You withdrew"."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.matching.services import commit, withdraw
from apps.matching.tests.test_fill_and_lock import add_role, apply, as_user, offer, user
from apps.projects.models import Project, ProjectStatus
from apps.projects.services import close_project

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return user("owner@latech.edu")


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


def open_project(owner, term, title):
    return Project.objects.create(
        owner=owner, term=term, title=title, pitch="x", status=ProjectStatus.OPEN
    )


@pytest.fixture
def project(owner, term):
    return open_project(owner, term, "Mine")


def reason(application):
    application.refresh_from_db()
    assert application.status == ApplicationStatus.WITHDRAWN
    return application.withdrawn_reason


def test_withdrawing_my_own_says_i_did(project):
    mine = apply(add_role(project), "sam@latech.edu")

    withdraw(mine)

    assert reason(mine) == "applicant"
    body = as_user(mine.applicant).get("/api/v1/applications/mine/").json()["results"]
    assert body[0]["withdrawn_reason"] == "applicant"


def test_closing_a_project_says_so_and_stamps_the_time(project):
    role = add_role(project)
    pending, liked = apply(role, "sam@latech.edu"), offer(apply(role, "kim@latech.edu"))
    long_ago = timezone.now() - timedelta(days=3)
    Application.objects.filter(pk__in=[pending.pk, liked.pk]).update(updated_at=long_ago)

    close_project(project)

    assert reason(pending) == reason(liked) == "project_closed"
    assert pending.updated_at > long_ago


def test_committing_closes_my_other_applications_as_committed(owner, project, term):
    elsewhere = open_project(user("other@latech.edu"), term, "Other")
    add_role(project)  # keeps my project open after the commit
    seat = offer(apply(add_role(project), "sam@latech.edu"))
    other = apply(add_role(elsewhere), "sam@latech.edu")

    commit(seat)

    assert reason(other) == "committed"


def test_a_team_locking_closes_the_owners_other_applications(owner, project, term):
    elsewhere = open_project(user("other@latech.edu"), term, "Other")
    owners_other = apply(add_role(elsewhere), owner.email)
    seat = offer(apply(add_role(project), "sam@latech.edu"))

    _, team = commit(seat)  # the last open role: the team locks

    assert team is not None
    assert reason(owners_other) == "team_locked"
