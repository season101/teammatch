"""PL-07: a user an admin deactivates is hidden from the app."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.models import Term
from apps.matching.models import Application
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


def open_project(owner, term, title):
    project = Project.objects.create(
        owner=owner, term=term, title=title, pitch="x", status=ProjectStatus.OPEN
    )
    Role.objects.create(project=project, title=f"{title} dev")
    return project


def get(someone, path):
    client = APIClient()
    client.force_authenticate(someone)
    response = client.get(path)
    assert response.status_code == 200
    return response.json()


def deactivate(someone):
    User.objects.filter(pk=someone.pk).update(is_active=False)


def test_a_deactivated_owners_projects_leave_the_feed_and_the_project_list(term):
    kept_owner = User.objects.create_user("kept@latech.edu", "pw")
    gone_owner = User.objects.create_user("gone@latech.edu", "pw")
    sam = User.objects.create_user("sam@latech.edu", "pw")
    open_project(kept_owner, term, "Kept")
    open_project(gone_owner, term, "Gone")

    deactivate(gone_owner)

    assert [p["title"] for p in get(sam, "/api/v1/projects/")["results"]] == ["Kept"]
    assert [r["title"] for r in get(sam, "/api/v1/feed/")["results"]] == ["Kept dev"]


def test_a_deactivated_applicant_leaves_the_review_queue_and_its_count(term):
    owner = User.objects.create_user("owner@latech.edu", "pw")
    role = open_project(owner, term, "Mine").roles.get()
    kept = User.objects.create_user("kept@latech.edu", "pw")
    gone = User.objects.create_user("gone@latech.edu", "pw")
    Application.objects.create(role=role, applicant=kept)
    Application.objects.create(role=role, applicant=gone)

    deactivate(gone)

    queue = get(owner, f"/api/v1/roles/{role.id}/applications/")["results"]
    assert [a["applicant"]["id"] for a in queue] == [kept.profile.id]
    assert get(owner, "/api/v1/me/summary/")["applicants_waiting"] == 1
