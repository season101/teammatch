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
    # Only the status column: back at 0004/0005 the table lacks withdrawn_reason (0006).
    return Application.objects.values_list("status", flat=True).get(pk=application.pk)


# Only matching moves back. Its rows are written with the 0004 model, which matches the
# table there; the other apps' rows with today's.
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
        old = MigrationExecutor(connection).loader.project_state(BEFORE).apps
        OldApplication = old.get_model("matching", "Application")
        seat = OldApplication.objects.create(role_id=role.id, applicant_id=sam.id, status="liked")
        passed = OldApplication.objects.create(
            role_id=role.id, applicant_id=kim.id, status="passed"
        )

        migrate(AFTER)
        assert (status_of(seat), status_of(passed)) == ("committed", "passed")

        passed.status = "declined"
        passed.save(update_fields=["status"])
        migrate(BEFORE)
        assert (status_of(seat), status_of(passed)) == ("liked", "passed")
    finally:
        migrate()


@pytest.mark.django_db
def test_0006_lets_the_previous_release_insert_applications():
    """After a rollback, old code inserts rows without withdrawn_reason; the DB default fills it."""
    today = timezone.localdate()
    term = Term.objects.create(name="Now", start_date=today, end_date=today + timedelta(days=1))
    owner, sam = (
        get_user_model().objects.create_user(email=f"{name}@latech.edu", password="pw")
        for name in ("owner", "sam")
    )
    project = Project.objects.create(owner=owner, term=term, title="T", pitch="p")
    role = Role.objects.create(project=project, title="Backend")
    old = MigrationExecutor(connection).loader.project_state(AFTER).apps

    row = old.get_model("matching", "Application").objects.create(
        role_id=role.id, applicant_id=sam.id
    )

    assert Application.objects.get(pk=row.pk).withdrawn_reason == ""
