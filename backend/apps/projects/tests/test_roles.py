from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.profiles.models import Skill
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

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
