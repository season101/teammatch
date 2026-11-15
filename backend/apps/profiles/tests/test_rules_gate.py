"""The API refuses the actions that matter until the Team rules are accepted (DD-12, DD-47)."""

from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.profiles.models import Profile
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = [pytest.mark.django_db, pytest.mark.rules_not_accepted]


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


@pytest.fixture
def owner():
    return User.objects.create_user("olive@latech.edu", "pw")


@pytest.fixture
def sam():
    return User.objects.create_user("sam@latech.edu", "pw")


@pytest.fixture
def role(owner, term):
    project = Project.objects.create(
        owner=owner, term=term, title="Open", pitch="x", status=ProjectStatus.OPEN
    )
    return Role.objects.create(project=project, title="Backend dev")


def as_user(someone):
    client = APIClient()
    client.force_authenticate(someone)
    return client


def accept(someone):
    assert as_user(someone).post("/api/v1/me/rules/accept/").status_code == 204


def assert_refused(response):
    assert response.status_code == 403
    assert response.json()["code"] == "rules_not_accepted"


def test_apply_needs_the_rules(sam, role):
    assert_refused(as_user(sam).post("/api/v1/applications/", {"role": role.id}))
    assert not Application.objects.exists()

    accept(sam)
    assert as_user(sam).post("/api/v1/applications/", {"role": role.id}).status_code == 201


def test_creating_and_publishing_a_project_need_the_rules(owner, term):
    body = {"title": "TeamMatch", "pitch": "Find a team"}
    assert_refused(as_user(owner).post("/api/v1/projects/", body))
    draft = Project.objects.create(owner=owner, term=term, title="Draft", pitch="x")
    Role.objects.create(project=draft, title="Dev")
    assert_refused(as_user(owner).post(f"/api/v1/projects/{draft.id}/publish/"))
    draft.refresh_from_db()
    assert draft.status == ProjectStatus.DRAFT

    accept(owner)
    assert as_user(owner).post("/api/v1/projects/", body).status_code == 201
    assert as_user(owner).post(f"/api/v1/projects/{draft.id}/publish/").status_code == 200


@pytest.mark.parametrize("action", ["like", "pass"])
def test_deciding_needs_the_rules(owner, sam, role, action):
    application = Application.objects.create(role=role, applicant=sam)

    assert_refused(as_user(owner).post(f"/api/v1/applications/{application.id}/{action}/"))
    application.refresh_from_db()
    assert application.status == ApplicationStatus.PENDING


def test_committing_needs_the_rules(sam, role):
    offer = Application.objects.create(role=role, applicant=sam, status=ApplicationStatus.LIKED)

    assert_refused(as_user(sam).post(f"/api/v1/applications/{offer.id}/commit/"))
    offer.refresh_from_db()
    assert offer.status == ApplicationStatus.LIKED

    accept(sam)
    assert as_user(sam).post(f"/api/v1/applications/{offer.id}/commit/").status_code == 200


def test_reading_and_backing_out_dont_need_the_rules(sam, role):
    client = as_user(sam)
    assert client.get("/api/v1/projects/").status_code == 200
    assert client.get("/api/v1/feed/").status_code == 200
    assert client.get("/api/v1/me/profile/").status_code == 200
    offer = Application.objects.create(role=role, applicant=sam, status=ApplicationStatus.LIKED)
    assert client.post(f"/api/v1/applications/{offer.id}/decline/").status_code == 200


def test_signed_out_is_still_401_not_rules(role):
    response = APIClient().post("/api/v1/applications/", {"role": role.id})
    assert response.status_code == 401


def test_bootstrap_accounts_have_the_rules_accepted(monkeypatch):
    monkeypatch.setenv("SEED_OWNER_EMAIL", "olive.owner@latech.edu")
    monkeypatch.setenv("SEED_OWNER_PASSWORD", "owner-pass-123")  # gitleaks:allow (test-only)

    call_command("bootstrap", stdout=StringIO())

    assert Profile.objects.get(user__email="olive.owner@latech.edu").rules_accepted_at


def test_seed_demo_people_and_accounts_have_the_rules_accepted(term, owner, sam):
    call_command("seed_demo", "--owner", owner.email, "--candidate", sam.email, stdout=StringIO())

    assert not Profile.objects.filter(rules_accepted_at__isnull=True).exists()
