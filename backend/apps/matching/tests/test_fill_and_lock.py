import threading
import time
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
from apps.matching.services import (
    ApplicantRetired,
    OfferNotOpen,
    RoleNotOpen,
    commit,
    decide,
)
from apps.profiles.models import Profile
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

User = get_user_model()
PENDING, LIKED = ApplicationStatus.PENDING, ApplicationStatus.LIKED
PASSED, WITHDRAWN = ApplicationStatus.PASSED, ApplicationStatus.WITHDRAWN
COMMITTED = ApplicationStatus.COMMITTED


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


def take(owner, application):
    """The owner likes them, then they commit: the seat is theirs (F4-10)."""
    assert like(owner, application).status_code == 200
    return as_user(application.applicant).post(f"/api/v1/applications/{application.id}/commit/")


def offer(application):
    """Make an application an open offer, as if the owner had just liked it."""
    application.status = ApplicationStatus.LIKED
    application.save(update_fields=["status"])
    return application


def status_of(application):
    application.refresh_from_db()
    return application.status


# F4-10: a like is an offer; the seat fills when the candidate commits (BR-05)


def test_like_is_an_offer_and_leaves_the_role_open(owner, project):
    role = add_role(project)
    liked, rival = apply(role, "sam@latech.edu"), apply(role, "kim@latech.edu")

    response = like(owner, liked)

    assert response.status_code == 200
    assert response.json()["team_locked"] is False
    role.refresh_from_db()
    assert (role.status, role.filled_by) == (RoleStatus.OPEN, None)
    assert (status_of(liked), status_of(rival)) == (LIKED, PENDING)
    # the owner can make offers to several people for one role
    assert like(owner, rival).status_code == 200


def test_commit_fills_the_role_and_closes_its_other_applications_and_offers(owner, project):
    role, other_role = add_role(project), add_role(project)
    liked, rival = apply(role, "sam@latech.edu"), apply(role, "kim@latech.edu")
    rival_offer = offer(apply(role, "max@latech.edu"))
    elsewhere = apply(other_role, "lee@latech.edu")

    response = take(owner, liked)

    assert response.status_code == 200
    assert response.json()["status"] == COMMITTED
    role.refresh_from_db()
    assert (role.status, role.filled_by) == (RoleStatus.FILLED, liked.applicant)
    assert (status_of(rival), status_of(rival_offer)) == (PASSED, PASSED)
    assert status_of(elsewhere) == PENDING  # other roles are untouched


def test_project_stays_open_while_a_role_is_open(owner, project):
    role = add_role(project)
    add_role(project)

    body = take(owner, apply(role, "sam@latech.edu")).json()

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


# BR-06: a commit to the last open role locks the team


def test_committing_to_the_last_open_role_locks_the_team(owner, project):
    earlier = add_role(project, filled_by="kim@latech.edu")
    role = add_role(project)
    liked = apply(role, "sam@latech.edu")

    response = take(owner, liked)

    assert response.status_code == 200
    body = response.json()
    team = Team.objects.get(project=project)
    assert (body["team_locked"], body["team_id"]) == (True, team.id)
    # the fields My applications already reads are still there
    assert {"id", "role", "note", "status", "created_at", "updated_at"} <= body.keys()
    project.refresh_from_db()
    assert project.status == ProjectStatus.LOCKED
    seats = {(m.user, m.role) for m in team.memberships.all()}
    assert seats == {(owner, None), (earlier.filled_by, earlier), (liked.applicant, role)}
    assert all(m.seen_at is None for m in team.memberships.all())


@pytest.mark.parametrize("filled_roles", [0, 3])
def test_a_locking_commit_runs_a_fixed_number_of_queries(
    owner, project, filled_roles, django_assert_num_queries
):
    for i in range(filled_roles):
        add_role(project, filled_by=f"member{i}@latech.edu")
    role = add_role(project)
    liked = offer(apply(role, "sam@latech.edu"))
    apply(role, "kim@latech.edu")
    offer(apply(role, "lee@latech.edu"))
    client = as_user(liked.applicant)

    with django_assert_num_queries(28):  # same count however many roles or rivals
        response = client.post(f"/api/v1/applications/{liked.id}/commit/")

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
    assert response.json() == {
        "detail": "This person just joined another team.",
        "code": "applicant_retired",
    }
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


# BR-08: a lock withdraws the members' other pending applications and retires them (F4-07)


@pytest.fixture
def other(term):
    return Project.objects.create(
        owner=user("other@latech.edu"), term=term, title="Other", pitch="p", status="open"
    )


def lock(owner, project):
    """Sam takes a new last role, which locks the project."""
    assert take(owner, apply(add_role(project), "sam@latech.edu")).json()["team_locked"]


def test_a_lock_withdraws_every_members_other_pending_applications(owner, project, other):
    add_role(project, filled_by="kim@latech.edu")
    members = ["sam@latech.edu", "kim@latech.edu", "owner@latech.edu"]  # liked, earlier, owner
    elsewhere = [apply(add_role(other), email) for email in members]

    lock(owner, project)

    assert [status_of(a) for a in elsewhere] == [WITHDRAWN] * 3


def test_a_lock_leaves_other_terms_other_people_and_this_project_alone(owner, project, other):
    today = timezone.localdate()
    next_term = Term.objects.create(
        name="Next", start_date=today + timedelta(days=90), end_date=today + timedelta(days=200)
    )
    later = Project.objects.create(
        owner=user("other@latech.edu"), term=next_term, title="Later", pitch="p", status="open"
    )
    add_role(project, filled_by="kim@latech.edu")
    untouched = [
        apply(add_role(later), "sam@latech.edu"),
        apply(add_role(other), "lee@latech.edu"),
        apply(add_role(project, filled_by="max@latech.edu"), "kim@latech.edu"),  # a member here
    ]

    lock(owner, project)

    assert [status_of(a) for a in untouched] == [PENDING] * 3


def test_a_lock_withdraws_members_offers_too_but_leaves_passed_ones_alone(owner, project, other):
    kim = user("kim@latech.edu")
    liked = Application.objects.create(role=add_role(other), applicant=kim, status=LIKED)
    passed = Application.objects.create(role=add_role(other), applicant=kim, status=PASSED)
    add_role(project, filled_by="kim@latech.edu")

    lock(owner, project)

    assert (status_of(liked), status_of(passed)) == (WITHDRAWN, PASSED)


def test_a_lock_retires_every_member_until_the_term_ends(owner, project, term):
    add_role(project, filled_by="kim@latech.edu")
    user("lee@latech.edu")  # not on the team

    lock(owner, project)

    assert dict(Profile.objects.values_list("user__email", "retired_until")) == {
        "owner@latech.edu": term.end_date,
        "kim@latech.edu": term.end_date,
        "sam@latech.edu": term.end_date,
        "lee@latech.edu": None,
    }


def test_withdrawn_applications_leave_the_other_owners_queue(owner, project, other):
    other_role = add_role(other)
    apply(other_role, "sam@latech.edu")
    lee = apply(other_role, "lee@latech.edu")

    lock(owner, project)

    response = as_user(other.owner).get(f"/api/v1/roles/{other_role.id}/applications/")
    assert [a["id"] for a in response.json()["results"]] == [lee.id]


def test_no_lock_means_nobody_retires(owner, project, other):
    add_role(project)  # still open after the commit
    elsewhere = apply(add_role(other), "kim@latech.edu")

    assert take(owner, apply(add_role(project), "sam@latech.edu")).json()["team_locked"] is False

    assert status_of(elsewhere) == PENDING  # someone else's application
    assert not Profile.objects.filter(retired_until__isnull=False).exists()


# One seat per person per term (F4-10)


def commit_as(application):
    return as_user(application.applicant).post(f"/api/v1/applications/{application.id}/commit/")


def decline_as(application):
    return as_user(application.applicant).post(f"/api/v1/applications/{application.id}/decline/")


def test_commit_withdraws_my_other_applications_and_offers_this_term(owner, project, other):
    first, second = add_role(project), add_role(project)
    liked, same_project = apply(first, "sam@latech.edu"), apply(second, "sam@latech.edu")
    other_offer = offer(apply(add_role(other), "sam@latech.edu"))
    rival = apply(second, "lee@latech.edu")

    take(owner, liked)

    assert (status_of(same_project), status_of(other_offer)) == (WITHDRAWN, WITHDRAWN)
    assert status_of(rival) == PENDING  # Lee stays in the second role's queue
    assert like(owner, same_project).status_code == 409


def test_like_fails_if_the_applicant_already_committed_to_an_open_project(owner, project, other):
    mine, theirs, their_last = add_role(project), add_role(other), add_role(other)
    here, there = apply(mine, "sam@latech.edu"), apply(theirs, "sam@latech.edu")
    assert take(other.owner, there).json()["team_locked"] is False

    response = like(owner, here)

    assert response.status_code == 409
    assert response.json() == {
        "detail": "This person already has a spot on an open project.",
        "code": "applicant_committed",
    }
    assert status_of(here) == WITHDRAWN  # the commit closed it
    mine.refresh_from_db()
    assert mine.status == RoleStatus.OPEN
    # the other project still locks, and Sam is on one team
    assert take(other.owner, apply(their_last, "lee@latech.edu")).json()["team_locked"]
    assert Membership.objects.filter(user=here.applicant).count() == 1


def test_an_owner_of_an_open_project_can_be_liked_but_not_commit(owner, project, other):
    add_role(other)
    application = apply(add_role(project), "other@latech.edu")  # other's owner

    assert like(owner, application).status_code == 200
    response = commit_as(application)

    assert response.status_code == 409
    assert response.data["detail"].code == "owns_open_project"
    assert status_of(application) == LIKED  # the offer stays


def test_commit_fails_if_i_already_hold_a_seat_on_an_open_project(owner, project, other):
    add_role(other)  # keeps the other project open
    add_role(other, filled_by="sam@latech.edu")
    application = offer(apply(add_role(project), "sam@latech.edu"))

    response = commit_as(application)

    assert response.status_code == 409
    assert response.data["detail"].code == "applicant_committed"
    assert status_of(application) == LIKED


def test_commit_fails_if_the_role_filled_meanwhile(owner, project):
    role = add_role(project)
    add_role(project)
    first, second = offer(apply(role, "sam@latech.edu")), offer(apply(role, "kim@latech.edu"))
    assert commit_as(first).status_code == 200

    response = commit_as(second)

    assert response.status_code == 409
    assert response.data["detail"].code in ("role_not_open", "offer_not_open")
    assert status_of(second) == PASSED


def test_only_an_open_offer_can_be_committed_or_declined(owner, project):
    pending = apply(add_role(project), "sam@latech.edu")

    assert commit_as(pending).data["detail"].code == "offer_not_open"
    assert decline_as(pending).data["detail"].code == "offer_not_open"
    assert status_of(pending) == PENDING


def test_decline_closes_the_offer_and_leaves_the_role_open(owner, project):
    role = add_role(project)
    liked = offer(apply(role, "sam@latech.edu"))

    response = decline_as(liked)

    assert response.status_code == 200
    assert response.json()["status"] == ApplicationStatus.DECLINED
    role.refresh_from_db()
    assert (role.status, role.filled_by) == (RoleStatus.OPEN, None)
    assert commit_as(liked).status_code == 409


def test_commit_and_decline_are_403_for_someone_elses_offer(owner, project):
    liked = offer(apply(add_role(project), "sam@latech.edu"))
    stranger = as_user(user("kim@latech.edu"))

    assert stranger.post(f"/api/v1/applications/{liked.id}/commit/").status_code == 403
    assert stranger.post(f"/api/v1/applications/{liked.id}/decline/").status_code == 403
    assert as_user(owner).post(f"/api/v1/applications/{liked.id}/commit/").status_code == 403
    assert status_of(liked) == LIKED


def test_after_a_commit_i_cant_apply_and_my_feed_is_empty(owner, project, other):
    open_elsewhere = add_role(other)
    add_role(project)  # keeps my project open
    take(owner, apply(add_role(project), "sam@latech.edu"))
    sam = as_user(user("sam@latech.edu"))

    assert sam.get("/api/v1/feed/").json()["results"] == []
    response = sam.post("/api/v1/applications/", {"role": open_elsewhere.id}, format="json")
    assert response.status_code == 409
    assert response.data["detail"].code == "applicant_committed"


def test_closing_a_project_withdraws_its_offers(owner, project):
    liked = offer(apply(add_role(project), "sam@latech.edu"))

    as_user(owner).post(f"/api/v1/projects/{project.id}/close/")

    assert status_of(liked) == WITHDRAWN


def test_a_closed_project_or_a_draft_does_not_block_a_like(owner, project, other, term):
    add_role(other, filled_by="sam@latech.edu")
    other.status = ProjectStatus.ARCHIVED
    other.save()
    Project.objects.create(owner=user("sam@latech.edu"), term=term, title="Idea", pitch="p")

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


def waiting_on_a_lock():
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM pg_stat_activity"
            " WHERE datname = current_database() AND wait_event_type = 'Lock'"
        )
        return cursor.fetchone() is not None


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
        # Ask Postgres: a cold first request can take over 0.5 s without ever waiting on a lock.
        deadline = time.monotonic() + 5
        while not waiting_on_a_lock():
            assert not raced.done(), "second() finished without waiting on first's locks"
            assert time.monotonic() < deadline, "second() never waited on first's locks"
            time.sleep(0.01)
        release.set()
        held.result(5)
        return raced.result(5)


@needs_postgres
@committed
def test_two_commits_on_one_role_fill_it_once(project):
    role = add_role(project)
    first, second = offer(apply(role, "sam@latech.edu")), offer(apply(role, "kim@latech.edu"))

    outcome = race(lambda: commit(first), lambda: commit(second))

    assert isinstance(outcome, (RoleNotOpen, OfferNotOpen))
    role.refresh_from_db()
    assert role.filled_by == first.applicant
    assert Team.objects.count() == 1


@needs_postgres
@committed
def test_commits_on_the_last_two_roles_lock_one_team(owner, project):
    first = offer(apply(add_role(project), "sam@latech.edu"))
    second = offer(apply(add_role(project), "kim@latech.edu"))

    _, team = race(lambda: commit(first), lambda: commit(second))

    assert team == Team.objects.get()  # the second commit saw the first fill and locked
    assert {m.user for m in team.memberships.all()} == {owner, first.applicant, second.applicant}


@needs_postgres
@committed
def test_like_fails_if_another_team_took_the_applicant_a_moment_earlier(project, term):
    first = offer(apply(add_role(project), "sam@latech.edu"))
    other = Project.objects.create(
        owner=user("other@latech.edu"), term=term, title="Other", pitch="p", status="open"
    )
    other_role = add_role(other)
    second = apply(other_role, "sam@latech.edu")

    outcome = race(lambda: commit(first), lambda: decide(second, LIKED))

    assert isinstance(outcome, ApplicantRetired)
    other_role.refresh_from_db()
    assert other_role.status == RoleStatus.OPEN
    assert status_of(second) == WITHDRAWN  # the commit withdrew it


@needs_postgres
@committed
def test_two_commits_of_one_person_on_two_open_projects_fill_one_role(project, other):
    add_role(project), add_role(other)  # neither project locks
    first = offer(apply(add_role(project), "sam@latech.edu"))
    second = offer(apply(add_role(other), "sam@latech.edu"))

    outcome = race(lambda: commit(first), lambda: commit(second))

    assert isinstance(outcome, OfferNotOpen)  # the first commit withdrew it
    assert list(Role.objects.filter(filled_by=first.applicant)) == [first.role]


@needs_postgres
@committed
def test_a_pass_that_commits_while_a_lock_waits_stays_passed(project, other):
    elsewhere = apply(add_role(other), "sam@latech.edu")
    liked = offer(apply(add_role(project), "sam@latech.edu"))

    # the commit's withdraw waits on the pass's row lock, then rechecks the status
    _, team = race(lambda: decide(elsewhere, PASSED), lambda: commit(liked))

    assert team == Team.objects.get()
    assert status_of(elsewhere) == PASSED


def test_field_errors_keep_their_shape(owner):
    # Only single-message errors gain a code; a validation error stays {field: [...]}.
    client = APIClient()
    client.force_authenticate(owner)
    response = client.post("/api/v1/applications/", {"role": 999999}, format="json")
    assert response.status_code == 400
    assert "code" not in response.json()
