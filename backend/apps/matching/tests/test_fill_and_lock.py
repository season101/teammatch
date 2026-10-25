import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.utils import timezone
from rest_framework.exceptions import APIException
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus, Membership, Team
from apps.matching.services import ApplicantRetired, ApplicationNotPending, decide
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

User = get_user_model()
LIKED = ApplicationStatus.LIKED


@pytest.fixture
def owner():
    return User.objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


@pytest.fixture
def project(owner, term):
    return Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )


def user(email):
    return User.objects.filter(email=email).first() or User.objects.create_user(
        email=email, password="pw"
    )


def add_role(project, filled_by=None):
    if filled_by is None:
        return Role.objects.create(project=project, title="Open role")
    return Role.objects.create(
        project=project, title="Filled role", status=RoleStatus.FILLED, filled_by=user(filled_by)
    )


def apply(role, email):
    return Application.objects.create(role=role, applicant=user(email))


def as_user(someone):
    client = APIClient()
    client.force_authenticate(someone)
    return client


def like(owner, application):
    return as_user(owner).post(f"/api/v1/applications/{application.id}/like/")


def status_of(application):
    application.refresh_from_db()
    return application.status


# BR-05: a like fills the role


def test_like_fills_the_role_and_passes_its_other_applicants(owner, project):
    role, other_role = add_role(project), add_role(project)
    liked, rival = apply(role, "sam@latech.edu"), apply(role, "kim@latech.edu")
    elsewhere = apply(other_role, "lee@latech.edu")

    response = like(owner, liked)

    assert response.status_code == 200
    role.refresh_from_db()
    assert (role.status, role.filled_by) == (RoleStatus.FILLED, liked.applicant)
    assert status_of(liked) == ApplicationStatus.LIKED
    assert status_of(rival) == ApplicationStatus.PASSED
    assert status_of(elsewhere) == ApplicationStatus.PENDING  # other roles are untouched


def test_project_stays_open_while_a_role_is_open(owner, project):
    role = add_role(project)
    add_role(project)

    body = like(owner, apply(role, "sam@latech.edu")).json()

    assert (body["team_locked"], body["team_id"]) == (False, None)
    project.refresh_from_db()
    assert project.status == ProjectStatus.OPEN
    assert not Team.objects.exists()


def test_pass_leaves_the_role_open(owner, project):
    role = add_role(project)
    application = apply(role, "sam@latech.edu")

    response = as_user(owner).post(f"/api/v1/applications/{application.id}/pass/")

    assert response.json()["team_locked"] is False
    role.refresh_from_db()
    assert role.status == RoleStatus.OPEN


# BR-06: liking the last open role locks the team


def test_liking_the_last_open_role_locks_the_team(owner, project):
    earlier = add_role(project, filled_by="kim@latech.edu")
    role = add_role(project)
    liked = apply(role, "sam@latech.edu")

    response = like(owner, liked)

    assert response.status_code == 200
    body = response.json()
    team = Team.objects.get(project=project)
    assert (body["team_locked"], body["team_id"]) == (True, team.id)
    # the fields the review page already reads are still there
    assert {"id", "applicant", "note", "status", "created_at"} <= body.keys()
    project.refresh_from_db()
    assert project.status == ProjectStatus.LOCKED
    seats = {(m.user, m.role) for m in team.memberships.all()}
    assert seats == {(owner, None), (earlier.filled_by, earlier), (liked.applicant, role)}
    assert all(m.seen_at is None for m in team.memberships.all())


@pytest.mark.parametrize("filled_roles", [0, 3])
def test_a_locking_like_runs_a_fixed_number_of_queries(
    owner, project, filled_roles, django_assert_num_queries
):
    for i in range(filled_roles):
        add_role(project, filled_by=f"member{i}@latech.edu")
    role = add_role(project)
    liked = apply(role, "sam@latech.edu")
    apply(role, "kim@latech.edu")
    apply(role, "lee@latech.edu")
    client = as_user(owner)

    with django_assert_num_queries(19):  # same count however many roles or rivals
        response = client.post(f"/api/v1/applications/{liked.id}/like/")

    assert response.json()["team_locked"] is True


# Retired: already on a team this term


def test_like_fails_if_the_applicant_is_already_on_a_team(owner, project, term):
    other_owner = user("other@latech.edu")
    other = Project.objects.create(
        owner=other_owner, term=term, title="Other", pitch="p", status=ProjectStatus.LOCKED
    )
    team = Team.objects.create(project=other)
    Membership.objects.create(team=team, user=user("sam@latech.edu"))
    role = add_role(project)
    application = apply(role, "sam@latech.edu")

    response = like(owner, application)

    assert response.status_code == 409
    assert response.json() == {"detail": "This person just joined another team."}
    assert status_of(application) == ApplicationStatus.PENDING
    role.refresh_from_db()
    assert role.status == RoleStatus.OPEN


def test_a_team_from_a_past_term_does_not_block_a_like(owner, project):
    today = timezone.localdate()
    past = Term.objects.create(
        name="Past", start_date=today - timedelta(days=200), end_date=today - timedelta(days=100)
    )
    old = Project.objects.create(
        owner=user("other@latech.edu"), term=past, title="Old", pitch="p", status="locked"
    )
    Membership.objects.create(team=Team.objects.create(project=old), user=user("sam@latech.edu"))

    response = like(owner, apply(add_role(project), "sam@latech.edu"))

    assert response.status_code == 200


# DD-27: POST /teams/{id}/seen/


@pytest.fixture
def team(owner, project):
    team = Team.objects.create(project=project)
    Membership.objects.create(team=team, user=owner)
    Membership.objects.create(team=team, user=user("sam@latech.edu"), role=add_role(project))
    return team


def seen(someone, team_id):
    return as_user(someone).post(f"/api/v1/teams/{team_id}/seen/")


def test_seen_marks_only_my_seat(owner, team):
    assert seen(owner, team.id).status_code == 204

    seats = {m.user: m.seen_at for m in team.memberships.all()}
    assert seats[owner] is not None
    assert seats[user("sam@latech.edu")] is None


def test_seen_twice_keeps_the_first_time(owner, team):
    seen(owner, team.id)
    first = Membership.objects.get(team=team, user=owner).seen_at

    assert seen(owner, team.id).status_code == 204

    assert Membership.objects.get(team=team, user=owner).seen_at == first


def test_seen_is_404_for_a_non_member_and_an_unknown_team(team):
    stranger = user("stranger@latech.edu")
    assert seen(stranger, team.id).status_code == 404
    assert seen(stranger, 999999).status_code == 404
    assert not Membership.objects.filter(seen_at__isnull=False).exists()


def test_seen_requires_sign_in(team):
    assert APIClient().post(f"/api/v1/teams/{team.id}/seen/").status_code in (401, 403)


# Races. SQLite ignores select_for_update, so these need Postgres (CI has it).

needs_postgres = pytest.mark.skipif(
    connection.vendor != "postgresql", reason="needs Postgres row locks"
)
# Threads need committed rows; serialized_rollback restores the seeded skills after the flush.
committed = pytest.mark.django_db(transaction=True, serialized_rollback=True)


def race(first, second, then=lambda: None):
    """Run second() while first() sits in an open transaction, and return second's outcome.

    second() must block on first's row locks. Once it does, then() runs in first's
    transaction, which then commits.
    """
    holding, release = threading.Event(), threading.Event()

    def run_first():
        try:
            with transaction.atomic():
                first()
                holding.set()
                release.wait(5)
                then()
        finally:
            connection.close()

    def run_second():
        try:
            return second()
        except APIException as error:
            return error
        finally:
            connection.close()

    with ThreadPoolExecutor(2) as pool:
        held = pool.submit(run_first)
        assert holding.wait(5)
        raced = pool.submit(run_second)
        with pytest.raises(TimeoutError):
            raced.result(timeout=0.5)  # still waiting on first's locks
        release.set()
        held.result(5)
        return raced.result(5)


@needs_postgres
@committed
def test_two_likes_on_one_role_fill_it_once(project):
    role = add_role(project)
    first, second = apply(role, "sam@latech.edu"), apply(role, "kim@latech.edu")

    outcome = race(lambda: decide(first, LIKED), lambda: decide(second, LIKED))

    assert isinstance(outcome, ApplicationNotPending)
    role.refresh_from_db()
    assert role.filled_by == first.applicant
    assert Team.objects.count() == 1


@needs_postgres
@committed
def test_likes_on_the_last_two_roles_lock_one_team(owner, project):
    first = apply(add_role(project), "sam@latech.edu")
    second = apply(add_role(project), "kim@latech.edu")

    _, team = race(lambda: decide(first, LIKED), lambda: decide(second, LIKED))

    assert team == Team.objects.get()  # the second like saw the first fill and locked
    assert {m.user for m in team.memberships.all()} == {owner, first.applicant, second.applicant}


@needs_postgres
@committed
def test_like_fails_if_another_team_took_the_applicant_a_moment_earlier(project, term):
    first = apply(add_role(project), "sam@latech.edu")
    other = Project.objects.create(
        owner=user("other@latech.edu"), term=term, title="Other", pitch="p", status="open"
    )
    other_role = add_role(other)
    second = apply(other_role, "sam@latech.edu")

    outcome = race(lambda: decide(first, LIKED), lambda: decide(second, LIKED))

    assert isinstance(outcome, ApplicantRetired)
    other_role.refresh_from_db()
    assert other_role.status == RoleStatus.OPEN
