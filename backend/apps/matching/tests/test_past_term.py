"""A past term's projects take no new step (409 term_over), even by id."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db


@pytest.fixture
def last_term():
    yesterday = timezone.localdate() - timedelta(days=1)
    return Term.objects.create(
        name="Last term", start_date=yesterday - timedelta(days=90), end_date=yesterday
    )


@pytest.fixture
def owner():
    return User.objects.create_user("owner@latech.edu", "pw")


@pytest.fixture
def sam():
    return User.objects.create_user("sam@latech.edu", "pw")


@pytest.fixture
def role(owner, last_term):
    project = Project.objects.create(
        owner=owner, term=last_term, title="Old", pitch="x", status=ProjectStatus.OPEN
    )
    return Role.objects.create(project=project, title="Backend dev")


def post(someone, path, body=None):
    client = APIClient()
    client.force_authenticate(someone)
    return client.post(path, body or {}, format="json")


def assert_term_over(response):
    assert response.status_code == 409
    assert response.json()["code"] == "term_over"


def test_applying_to_a_past_terms_role_is_refused(sam, role):
    assert_term_over(post(sam, "/api/v1/applications/", {"role": role.id}))
    assert not Application.objects.exists()


@pytest.mark.parametrize("action", ["like", "pass"])
def test_deciding_on_a_past_term_is_refused(owner, sam, role, action):
    application = Application.objects.create(role=role, applicant=sam)

    assert_term_over(post(owner, f"/api/v1/applications/{application.id}/{action}/"))
    application.refresh_from_db()
    assert application.status == ApplicationStatus.PENDING


def test_committing_on_a_past_term_is_refused(sam, role):
    offer = Application.objects.create(role=role, applicant=sam, status=ApplicationStatus.LIKED)

    assert_term_over(post(sam, f"/api/v1/applications/{offer.id}/commit/"))
    offer.refresh_from_db()
    assert offer.status == ApplicationStatus.LIKED


def test_publishing_a_past_terms_draft_is_refused(owner, last_term):
    draft = Project.objects.create(owner=owner, term=last_term, title="Draft", pitch="x")
    Role.objects.create(project=draft, title="Dev")

    assert_term_over(post(owner, f"/api/v1/projects/{draft.id}/publish/"))
    draft.refresh_from_db()
    assert draft.status == ProjectStatus.DRAFT


def test_the_terms_last_day_still_counts(sam, role, last_term):
    Term.objects.filter(pk=last_term.pk).update(end_date=timezone.localdate())

    assert post(sam, "/api/v1/applications/", {"role": role.id}).status_code == 201
