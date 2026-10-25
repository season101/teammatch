from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus, Team
from apps.matching.services import decide, try_lock
from apps.matching.tests.test_fill_and_lock import committed, needs_postgres, race
from apps.profiles.models import Skill
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus
from apps.projects.services import ProjectLocked, close_project

pytestmark = pytest.mark.django_db


def client_for(user):
    api_client = APIClient()
    api_client.force_authenticate(user)
    return api_client


def make_user(email):
    return get_user_model().objects.create_user(email=email, password="pw")


@pytest.fixture
def owner():
    return make_user("owner@latech.edu")


@pytest.fixture
def other():
    return make_user("other@latech.edu")


@pytest.fixture
def third():
    return make_user("third@latech.edu")


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Test term",
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=30),
    )


@pytest.fixture
def skill():
    return Skill.objects.create(name="Test Skill A", slug="test-skill-a")


@pytest.fixture
def project(owner, term):
    return Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )


@pytest.fixture
def role(project, skill):
    new_role = Role.objects.create(project=project, title="Backend dev")
    new_role.required_skills.add(skill)
    return new_role


def detail_url(project):
    return f"/api/v1/projects/{project.id}/"


def close_url(project):
    return f"/api/v1/projects/{project.id}/close/"


def publish_url(project):
    return f"/api/v1/projects/{project.id}/publish/"


# edit


def test_owner_edits_title_and_pitch(owner, project):
    response = client_for(owner).patch(detail_url(project), {"title": "New", "pitch": "Better"})
    assert response.status_code == 200
    project.refresh_from_db()
    assert (project.title, project.pitch) == ("New", "Better")


def test_owner_can_change_only_the_title(owner, project):
    response = client_for(owner).patch(detail_url(project), {"title": "Only title"})
    assert response.status_code == 200
    project.refresh_from_db()
    assert project.title == "Only title"
    assert project.pitch == "Find a team"


def test_editing_cannot_change_the_status(owner, project):
    client_for(owner).patch(detail_url(project), {"status": "locked"})
    project.refresh_from_db()
    assert project.status == ProjectStatus.OPEN


def test_non_owner_cannot_edit(other, project):
    response = client_for(other).patch(detail_url(project), {"title": "Hijack"})
    assert response.status_code == 403
    project.refresh_from_db()
    assert project.title == "TeamMatch"


@pytest.mark.parametrize("status", [ProjectStatus.LOCKED, ProjectStatus.ARCHIVED])
def test_locked_or_archived_project_cannot_be_edited(owner, project, status):
    project.status = status
    project.save()
    response = client_for(owner).patch(detail_url(project), {"title": "Nope"})
    assert response.status_code == 409
    assert response.data["detail"].code == "project_locked"


def test_title_cannot_be_blank_or_too_long(owner, project):
    client = client_for(owner)
    assert client.patch(detail_url(project), {"title": ""}).status_code == 400
    assert client.patch(detail_url(project), {"title": "x" * 101}).status_code == 400


# close


def test_closing_archives_the_project_and_withdraws_pending_applications(
    owner, other, third, project, role
):
    pending = Application.objects.create(role=role, applicant=other)
    passed = Application.objects.create(role=role, applicant=third, status=ApplicationStatus.PASSED)

    response = client_for(owner).post(close_url(project))

    assert response.status_code == 200
    project.refresh_from_db()
    assert project.status == ProjectStatus.ARCHIVED
    pending.refresh_from_db()
    passed.refresh_from_db()
    assert pending.status == ApplicationStatus.WITHDRAWN
    assert passed.status == ApplicationStatus.PASSED


def test_a_closed_project_leaves_the_open_list(owner, other, project, role):
    client_for(owner).post(close_url(project))
    response = client_for(other).get("/api/v1/projects/")
    assert response.data["results"] == []


def test_closing_frees_the_owner_to_publish_another(owner, term, skill, project, role):
    draft = Project.objects.create(owner=owner, term=term, title="Next idea", pitch="Later")
    draft_role = Role.objects.create(project=draft, title="Designer")
    draft_role.required_skills.add(skill)
    assert client_for(owner).post(publish_url(draft)).status_code == 409

    client_for(owner).post(close_url(project))

    assert client_for(owner).post(publish_url(draft)).status_code == 200


def test_a_draft_can_be_closed(owner, term):
    draft = Project.objects.create(owner=owner, term=term, title="Idea", pitch="Maybe")
    response = client_for(owner).post(close_url(draft))
    assert response.status_code == 200
    draft.refresh_from_db()
    assert draft.status == ProjectStatus.ARCHIVED


def test_non_owner_cannot_close(other, project):
    response = client_for(other).post(close_url(project))
    assert response.status_code == 403
    project.refresh_from_db()
    assert project.status == ProjectStatus.OPEN


@pytest.mark.parametrize("status", [ProjectStatus.LOCKED, ProjectStatus.ARCHIVED])
def test_locked_or_archived_project_cannot_be_closed(owner, project, status):
    project.status = status
    project.save()
    response = client_for(owner).post(close_url(project))
    assert response.status_code == 409
    assert response.data["detail"].code == "project_locked"


# close racing a like (F4-05)


@needs_postgres
@committed
def test_close_fails_if_a_like_just_locked_the_project(other, project, role):
    liked = Application.objects.create(role=role, applicant=other)

    outcome = race(lambda: decide(liked, ApplicationStatus.LIKED), lambda: close_project(project))

    assert isinstance(outcome, ProjectLocked)
    project.refresh_from_db()
    assert project.status == ProjectStatus.LOCKED
    assert Team.objects.filter(project=project).exists()


@needs_postgres
@committed
def test_close_does_not_deadlock_with_a_like_about_to_lock_the_project(
    other, third, project, monkeypatch
):
    # Created first, so close holds this filled role while it waits for the liked one.
    Role.objects.create(
        project=project, title="Designer", status=RoleStatus.FILLED, filled_by=third
    )
    liked = Application.objects.create(
        role=Role.objects.create(project=project, title="Backend dev"), applicant=other
    )
    # The like holds its role and application rows and takes the project only once close waits.
    monkeypatch.setattr("apps.matching.services.try_lock", lambda project: None)

    outcome = race(
        lambda: decide(liked, ApplicationStatus.LIKED),
        lambda: close_project(project),
        then=lambda: try_lock(project),
    )

    assert isinstance(outcome, ProjectLocked)
    project.refresh_from_db()
    assert project.status == ProjectStatus.LOCKED
