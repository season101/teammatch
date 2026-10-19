from datetime import timedelta

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone

from apps.accounts.models import User
from apps.core.models import Term
from apps.profiles.models import Profile
from apps.projects.models import Project, ProjectStatus

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
    assert projects.count() == 5
    for project in projects:
        assert project.status == ProjectStatus.OPEN
        assert project.term == current_term
        assert project.roles.count() >= 2
        assert all(role.required_skills.exists() for role in project.roles.all())
        assert project.owner.email.endswith("@example.com")
        assert not project.owner.has_usable_password()
        assert project.owner.profile.display_name


def test_running_again_adds_nothing(current_term):
    seed()
    seed()

    assert Project.objects.count() == 5
    assert User.objects.filter(email__endswith="@example.com").count() == 4


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
