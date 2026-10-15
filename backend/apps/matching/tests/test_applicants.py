from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.profiles.models import Skill
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def owner():
    return User.objects.create_user(email="owner@latech.edu", password="pw")


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


def url(role):
    return f"/api/v1/roles/{role.id}/applications/"


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def apply(role, email, **extra):
    user = User.objects.create_user(email=email, password="pw")
    return Application.objects.create(role=role, applicant=user, **extra)


def test_owner_sees_pending_applicants_with_name_major_skills_and_note(owner, role):
    application = apply(role, "sam@latech.edu", note="I know Django")
    profile = application.applicant.profile
    profile.display_name, profile.major = "Sam", "CS"
    profile.save()
    profile.skills.set(Skill.objects.filter(name="Python"))

    response = as_user(owner).get(url(role))

    assert response.status_code == 200
    [result] = response.json()["results"]
    assert result["note"] == "I know Django"
    assert result["applicant"]["display_name"] == "Sam"
    assert result["applicant"]["major"] == "CS"
    assert [s["name"] for s in result["applicant"]["skills"]] == ["Python"]
    assert "email" not in result["applicant"]


def test_only_pending_applications_are_listed(owner, role):
    pending = apply(role, "a@latech.edu")
    apply(role, "b@latech.edu", status=ApplicationStatus.PASSED)
    apply(role, "c@latech.edu", status=ApplicationStatus.WITHDRAWN)

    response = as_user(owner).get(url(role))

    assert [a["id"] for a in response.json()["results"]] == [pending.id]


def test_someone_elses_role_returns_403(role):
    stranger = User.objects.create_user(email="stranger@latech.edu", password="pw")
    assert as_user(stranger).get(url(role)).status_code == 403


def test_requires_sign_in(role):
    assert APIClient().get(url(role)).status_code in (401, 403)
