from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError

from apps.core.models import Term
from apps.projects.models import Project, ProjectStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def term():
    return Term.objects.create(
        name="Fall 2026",
        start_date=date(2026, 8, 24),
        end_date=date(2026, 12, 11),
    )


def test_new_project_defaults_to_draft(owner, term):
    project = Project.objects.create(owner=owner, term=term, title="TeamMatch", pitch="Find a team")
    assert project.status == ProjectStatus.DRAFT
    assert project.created_at is not None
    assert str(project) == "TeamMatch"


def test_status_must_be_a_known_value(owner, term):
    with pytest.raises(IntegrityError), transaction.atomic():
        Project.objects.create(owner=owner, term=term, title="Bad", pitch="x", status="closed")


def test_owner_with_projects_cannot_be_deleted(owner, term):
    Project.objects.create(owner=owner, term=term, title="Mine", pitch="x")
    with pytest.raises(ProtectedError):
        owner.delete()
