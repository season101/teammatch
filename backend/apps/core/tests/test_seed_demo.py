from datetime import timedelta

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.profiles.models import Profile
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def current_term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


def seed(*args):
    call_command("seed_demo", *args, stdout=None)


def test_adds_open_sample_projects_with_skilled_roles(current_term):
    seed()

    projects = Project.objects.all()
    assert projects.count() == 6
    for project in projects:
        assert project.status == ProjectStatus.OPEN
        assert project.term == current_term
        assert 3 <= project.roles.count() <= 5
        assert all(role.required_skills.exists() for role in project.roles.all())
        assert project.owner.email.endswith("@example.com")
        assert not project.owner.has_usable_password()
        assert project.owner.profile.display_name


def test_running_again_adds_nothing(current_term):
    seed()
    seed()

    assert Project.objects.count() == 6
    assert User.objects.filter(email__endswith="@example.com").count() == 14


def test_fills_an_empty_candidate_profile(current_term, monkeypatch):
    sam = User.objects.create_user("sam.student@latech.edu", "x-long-password")
    monkeypatch.setenv("SEED_CANDIDATE_EMAIL", "sam.student@latech.edu")

    seed()

    profile = Profile.objects.get(user=sam)
    assert profile.display_name == "Sam Student"
    assert set(profile.skills.values_list("name", flat=True)) >= {"React", "TypeScript"}


def test_leaves_a_filled_candidate_profile_alone(current_term, monkeypatch):
    sam = User.objects.create_user("sam.student@latech.edu", "x-long-password")
    Profile.objects.filter(user=sam).update(display_name="Sam Real")
    monkeypatch.setenv("SEED_CANDIDATE_EMAIL", "sam.student@latech.edu")

    seed()

    assert Profile.objects.get(user=sam).display_name == "Sam Real"


def test_needs_a_current_term():
    with pytest.raises(CommandError, match="current term"):
        seed()


def test_remove_deletes_only_the_sample_data(current_term):
    real_owner = User.objects.create_user("olive.owner@latech.edu", "x-long-password")
    Project.objects.create(owner=real_owner, term=current_term, title="Real project", pitch="Real")
    seed()

    seed("--remove")

    assert list(Project.objects.values_list("title", flat=True)) == ["Real project"]
    assert not User.objects.filter(email__endswith="@example.com").exists()


# Redesign demo data: team progress, the owner's review queue, the candidate's deck and offer


@pytest.fixture
def olive():
    return User.objects.create_user("olive.owner@latech.edu", "x-long-password")


@pytest.fixture
def sam():
    return User.objects.create_user("sam.student@latech.edu", "x-long-password")


def get(user, path):
    client = APIClient()
    client.force_authenticate(user)
    response = client.get(path)
    assert response.status_code == 200
    return response.json()


def test_sample_students_have_profiles_and_cant_sign_in(current_term):
    seed()

    students = User.objects.filter(email__endswith=".demo@example.com", projects=None)
    assert students.count() == 9
    for student in students:
        assert not student.has_usable_password()
        assert student.profile.display_name.endswith(" Demo")
        assert student.profile.major and student.profile.bio
        assert student.profile.skills.exists()


def test_team_progress_varies_and_seats_follow_the_rules(current_term):
    seed()

    filled = [p.roles.filter(status=RoleStatus.FILLED).count() for p in Project.objects.all()]
    assert len(set(filled)) >= 3
    assert all(p.roles.filter(status=RoleStatus.OPEN).exists() for p in Project.objects.all())
    seats = Role.objects.filter(status=RoleStatus.FILLED)
    # one seat per person, each with the committed application a real commit leaves
    assert seats.values("filled_by").distinct().count() == seats.count()
    for seat in seats:
        assert seat.applications.get(applicant=seat.filled_by).status == "committed"


def test_seed_owner_gets_a_project_with_applicants_waiting(current_term, olive):
    seed("--owner", "olive.owner@latech.edu")

    project = Project.objects.get(owner=olive)
    assert project.status == ProjectStatus.OPEN
    assert 3 <= project.roles.count() <= 5
    assert get(olive, "/api/v1/me/summary/")["applicants_waiting"] >= 4
    waiting = Application.objects.filter(role__project=project, status="pending")
    assert all(a.applicant.email.endswith(".demo@example.com") for a in waiting)
    assert Profile.objects.get(user=olive).display_name == "Olive Owner"


def test_seed_owner_with_an_open_project_keeps_just_that_one(current_term, olive):
    Project.objects.create(
        owner=olive, term=current_term, title="Mine", pitch="x", status=ProjectStatus.OPEN
    )

    seed("--owner", "olive.owner@latech.edu")

    assert list(Project.objects.filter(owner=olive).values_list("title", flat=True)) == ["Mine"]


def test_candidate_gets_two_pending_applications_an_offer_and_a_varied_deck(current_term, sam):
    seed("--candidate", "sam.student@latech.edu")

    statuses = sorted(Application.objects.filter(applicant=sam).values_list("status", flat=True))
    assert statuses == ["liked", "pending", "pending"]
    assert get(sam, "/api/v1/me/summary/") == {"offers": 1, "applicants_waiting": 0, "deck": "open"}
    deck = get(sam, "/api/v1/feed/?page_size=50")["results"]
    assert len({role["match_percent"] for role in deck}) >= 4


def test_running_again_with_accounts_adds_nothing(current_term, olive, sam):
    args = ("--owner", "olive.owner@latech.edu", "--candidate", "sam.student@latech.edu")
    seed(*args)
    counts = Project.objects.count(), Role.objects.count(), Application.objects.count()
    Application.objects.filter(applicant=sam, status="pending").update(
        status=ApplicationStatus.WITHDRAWN
    )

    seed(*args)

    assert (Project.objects.count(), Role.objects.count(), Application.objects.count()) == counts
    # a withdrawn application is not brought back
    assert Application.objects.filter(applicant=sam, status="withdrawn").count() == 2


@pytest.mark.parametrize("remove_args", [(), ("--owner", "olive.owner@latech.edu")])
def test_remove_takes_out_everything_seeded_for_the_accounts(
    current_term, olive, sam, remove_args, monkeypatch
):
    monkeypatch.delenv("SEED_OWNER_EMAIL", raising=False)
    seed("--owner", "olive.owner@latech.edu", "--candidate", "sam.student@latech.edu")

    seed("--remove", *remove_args)

    assert not Project.objects.exists()
    assert not Application.objects.exists()
    assert not User.objects.filter(email__endswith="@example.com").exists()
    # the real accounts stay
    assert User.objects.filter(pk__in=[olive.pk, sam.pk]).count() == 2
