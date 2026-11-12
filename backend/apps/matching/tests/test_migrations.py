from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone

from apps.core.models import Term
from apps.matching.models import Application
from apps.projects.models import Project, Role

BEFORE = [("matching", "0004_membership_one_seat_per_user")]
AFTER = [("matching", "0005_application_committed_declined")]


def migrate(target=None):
    """Migrate to target, or back to the latest state."""
    executor = MigrationExecutor(connection)
    executor.migrate(target or executor.loader.graph.leaf_nodes())


def status_of(application):
    application.refresh_from_db()
    return application.status


# Only matching moves back, and 0005 adds no columns, so today's models can write the rows.
@pytest.mark.django_db(transaction=True, serialized_rollback=True)
def test_0005_turns_old_likes_into_commits_and_back():
    """Before F4-10 a like took the seat, so existing teams must not change (F4-10)."""
    today = timezone.localdate()
    term = Term.objects.create(
        name="Now", start_date=today - timedelta(days=1), end_date=today + timedelta(days=1)
    )
    owner, sam, kim = (
        get_user_model().objects.create_user(email=f"{name}@latech.edu", password="pw")
        for name in ("owner", "sam", "kim")
    )
    project = Project.objects.create(owner=owner, term=term, title="T", pitch="p")
    role = Role.objects.create(project=project, title="Backend")
    try:
        migrate(BEFORE)
        seat = Application.objects.create(role=role, applicant=sam, status="liked")
        passed = Application.objects.create(role=role, applicant=kim, status="passed")

        migrate(AFTER)
        assert (status_of(seat), status_of(passed)) == ("committed", "passed")

        passed.status = "declined"
        passed.save(update_fields=["status"])
        migrate(BEFORE)
        assert (status_of(seat), status_of(passed)) == ("liked", "passed")
    finally:
        migrate()
