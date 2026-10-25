from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus, Team
from apps.matching.services import decide
from apps.matching.tests.test_fill_and_lock import committed, needs_postgres, race
from apps.profiles.models import Skill
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus
from apps.projects.services import RoleNotOpen, delete_role

pytestmark = pytest.mark.django_db


def client_for(user):
    api_client = APIClient()
    api_client.force_authenticate(user)
    return api_client


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def other():
    return get_user_model().objects.create_user(email="other@latech.edu", password="pw")


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Test term",
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=30),
    )


@pytest.fixture
def project(owner, term):
    return Project.objects.create(owner=owner, term=term, title="TeamMatch", pitch="Find a team")


@pytest.fixture
def skill():
    return Skill.objects.create(name="Test Skill A", slug="test-skill-a")


@pytest.fixture
def skill_b():
    return Skill.objects.create(name="Test Skill B", slug="test-skill-b")


@pytest.fixture
def role(project, skill):
    role = Role.objects.create(project=project, title="Backend dev")
    role.required_skills.add(skill)
    return role


def roles_url(project):
    return f"/api/v1/projects/{project.id}/roles/"


def publish_url(project):
    return f"/api/v1/projects/{project.id}/publish/"


def role_url(role):
    return f"/api/v1/roles/{role.id}/"


# add a role


def test_owner_adds_a_role_with_skills(owner, project, skill, skill_b):
    body = {
        "title": "Backend dev",
        "description": "APIs",
        "required_skills": [skill.id, skill_b.id],
    }
    response = client_for(owner).post(roles_url(project), body, format="json")
    assert response.status_code == 201
    role = Role.objects.get()
    assert role.project == project
    assert role.status == RoleStatus.OPEN
    assert set(role.required_skills.all()) == {skill, skill_b}


def test_role_needs_at_least_one_skill(owner, project):
    response = client_for(owner).post(roles_url(project), {"title": "Dev"}, format="json")
    assert response.status_code == 400
    assert "required_skills" in response.data

    response = client_for(owner).post(
        roles_url(project), {"title": "Dev", "required_skills": []}, format="json"
    )
    assert response.status_code == 400
    assert Role.objects.count() == 0


def test_role_needs_a_title(owner, project, skill):
    response = client_for(owner).post(
        roles_url(project), {"required_skills": [skill.id]}, format="json"
    )
    assert response.status_code == 400
    assert "title" in response.data


def test_non_owner_cannot_add_a_role(other, project, skill):
    body = {"title": "Dev", "required_skills": [skill.id]}
    response = client_for(other).post(roles_url(project), body, format="json")
    assert response.status_code == 403
    assert Role.objects.count() == 0


def test_anonymous_cannot_add_a_role(project, skill):
    body = {"title": "Dev", "required_skills": [skill.id]}
    response = APIClient().post(roles_url(project), body, format="json")
    assert response.status_code in (401, 403)


def test_cannot_add_a_role_to_a_locked_project(owner, project, skill):
    project.status = ProjectStatus.LOCKED
    project.save()
    body = {"title": "Dev", "required_skills": [skill.id]}
    response = client_for(owner).post(roles_url(project), body, format="json")
    assert response.status_code == 409
    assert Role.objects.count() == 0


# edit a role


def test_owner_edits_a_role_and_its_skills(owner, role, skill_b):
    body = {"title": "Frontend dev", "required_skills": [skill_b.id]}
    response = client_for(owner).patch(role_url(role), body, format="json")
    assert response.status_code == 200
    role.refresh_from_db()
    assert role.title == "Frontend dev"
    assert list(role.required_skills.all()) == [skill_b]


def test_non_owner_cannot_edit_a_role(other, role):
    response = client_for(other).patch(role_url(role), {"title": "Hacked"}, format="json")
    assert response.status_code == 403
    role.refresh_from_db()
    assert role.title == "Backend dev"


def test_cannot_edit_a_filled_role(owner, other, project, skill):
    filled = Role.objects.create(
        project=project, title="Done", status=RoleStatus.FILLED, filled_by=other
    )
    filled.required_skills.add(skill)
    response = client_for(owner).patch(role_url(filled), {"title": "New"}, format="json")
    assert response.status_code == 409


# publish


def test_owner_publishes_a_project_with_a_role(owner, project, role):
    response = client_for(owner).post(publish_url(project))
    assert response.status_code == 200
    project.refresh_from_db()
    assert project.status == ProjectStatus.OPEN


def test_project_without_roles_cannot_be_published(owner, project):
    response = client_for(owner).post(publish_url(project))
    assert response.status_code == 409
    assert response.data["detail"].code == "project_needs_roles"
    project.refresh_from_db()
    assert project.status == ProjectStatus.DRAFT


def test_non_owner_cannot_publish(other, project, role):
    response = client_for(other).post(publish_url(project))
    assert response.status_code == 403
    project.refresh_from_db()
    assert project.status == ProjectStatus.DRAFT


def test_an_open_project_cannot_be_published_again(owner, project, role):
    project.status = ProjectStatus.OPEN
    project.save()
    response = client_for(owner).post(publish_url(project))
    assert response.status_code == 409

    # one open project per owner (BR-14)


def second_draft(owner, term, skill):
    """A second draft project with a role, ready to publish."""
    draft = Project.objects.create(owner=owner, term=term, title="Second idea", pitch="Another")
    draft_role = Role.objects.create(project=draft, title="Designer")
    draft_role.required_skills.add(skill)
    return draft


def test_cannot_publish_a_second_project_while_one_is_open(owner, term, project, role, skill):
    project.status = ProjectStatus.OPEN
    project.save()
    draft = second_draft(owner, term, skill)

    response = client_for(owner).post(publish_url(draft))

    assert response.status_code == 409
    assert response.data["detail"].code == "open_project_exists"
    draft.refresh_from_db()
    assert draft.status == ProjectStatus.DRAFT


def test_can_publish_another_once_the_first_is_archived(owner, term, project, role, skill):
    project.status = ProjectStatus.ARCHIVED
    project.save()
    draft = second_draft(owner, term, skill)

    response = client_for(owner).post(publish_url(draft))

    assert response.status_code == 200
    draft.refresh_from_db()
    assert draft.status == ProjectStatus.OPEN


def test_can_publish_another_once_the_first_is_locked(owner, term, project, role, skill):
    project.status = ProjectStatus.LOCKED
    project.save()
    draft = second_draft(owner, term, skill)

    response = client_for(owner).post(publish_url(draft))

    assert response.status_code == 200


def test_another_owners_open_project_does_not_block_me(owner, other, term, project, role, skill):
    other_project = Project.objects.create(
        owner=other, term=term, title="Theirs", pitch="Open", status=ProjectStatus.OPEN
    )
    assert other_project.status == ProjectStatus.OPEN
    project_to_publish = project  # owner's draft, with a role from the fixture

    response = client_for(owner).post(publish_url(project_to_publish))

    assert response.status_code == 200


def test_drafts_do_not_count_as_open(owner, term, project, role, skill):
    second_draft(owner, term, skill)  # a draft sitting next to mine

    response = client_for(owner).post(publish_url(project))

    assert response.status_code == 200


# delete a role (F2-06, BR-07)


def open_role(project, title, skill):
    new_role = Role.objects.create(project=project, title=title)
    new_role.required_skills.add(skill)
    return new_role


def filled_role(project, title, user):
    return Role.objects.create(
        project=project, title=title, status=RoleStatus.FILLED, filled_by=user
    )


def test_owner_deletes_an_open_role_and_its_applications(owner, other, project, role, skill):
    open_role(project, "Designer", skill)
    Application.objects.create(role=role, applicant=other)

    response = client_for(owner).delete(role_url(role))

    assert response.status_code == 204
    assert not Role.objects.filter(pk=role.pk).exists()
    assert not Application.objects.filter(applicant=other).exists()


def test_non_owner_cannot_delete_a_role(other, project, role):
    response = client_for(other).delete(role_url(role))
    assert response.status_code == 403
    assert Role.objects.filter(pk=role.pk).exists()


def test_cannot_delete_a_filled_role(owner, other, project, skill):
    open_role(project, "Designer", skill)
    taken = filled_role(project, "Backend", other)

    response = client_for(owner).delete(role_url(taken))

    assert response.status_code == 409
    assert response.data["detail"].code == "role_not_open"
    assert Role.objects.filter(pk=taken.pk).exists()


def test_cannot_delete_a_role_from_a_locked_project(owner, other, project, role):
    project.status = ProjectStatus.LOCKED
    project.save()

    response = client_for(owner).delete(role_url(role))

    assert response.status_code == 409
    assert response.data["detail"].code == "project_locked"


def test_an_open_project_keeps_its_last_role(owner, project, role):
    project.status = ProjectStatus.OPEN
    project.save()

    response = client_for(owner).delete(role_url(role))

    assert response.status_code == 409
    assert response.data["detail"].code == "project_needs_roles"
    assert Role.objects.filter(pk=role.pk).exists()


def test_a_draft_can_lose_its_only_role(owner, project, role):
    response = client_for(owner).delete(role_url(role))
    assert response.status_code == 204


def test_deleting_the_last_unfilled_role_locks_the_project(owner, other, project, role):
    filled_role(project, "Backend", other)
    project.status = ProjectStatus.OPEN
    project.save()

    response = client_for(owner).delete(role_url(role))

    assert response.status_code == 204
    project.refresh_from_db()
    assert project.status == ProjectStatus.LOCKED
    assert Team.objects.filter(project=project).exists()


def test_deleting_a_role_while_others_are_open_does_not_lock(owner, project, role, skill):
    open_role(project, "Designer", skill)
    project.status = ProjectStatus.OPEN
    project.save()

    response = client_for(owner).delete(role_url(role))

    assert response.status_code == 204
    project.refresh_from_db()
    assert project.status == ProjectStatus.OPEN
    assert not Team.objects.filter(project=project).exists()


@needs_postgres
@committed
def test_delete_fails_if_a_like_just_filled_the_role(other, project, role, skill):
    open_role(project, "Designer", skill)
    project.status = ProjectStatus.OPEN
    project.save()
    liked = Application.objects.create(role=role, applicant=other)

    outcome = race(lambda: decide(liked, ApplicationStatus.LIKED), lambda: delete_role(role))

    assert isinstance(outcome, RoleNotOpen)
    role.refresh_from_db()
    assert (role.status, role.filled_by) == (RoleStatus.FILLED, other)


@needs_postgres
@committed
def test_edit_fails_if_a_like_just_filled_the_role(owner, other, role):
    liked = Application.objects.create(role=role, applicant=other)

    outcome = race(
        lambda: decide(liked, ApplicationStatus.LIKED),
        lambda: client_for(owner).patch(role_url(role), {"title": "New"}, format="json"),
    )

    assert outcome.status_code == 409
    role.refresh_from_db()
    assert (role.title, role.status, role.filled_by) == ("Backend dev", RoleStatus.FILLED, other)
