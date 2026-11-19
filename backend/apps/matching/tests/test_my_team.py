from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.services import try_lock
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

User = get_user_model()
MINE = "/api/v1/teams/mine/"


def user(email, name=""):
    someone = User.objects.create_user(email=email, password="pw")
    someone.profile.display_name = name
    someone.profile.save()
    return someone


def term(name, days_from_now):
    start = timezone.localdate() + timedelta(days=days_from_now)
    return Term.objects.create(name=name, start_date=start, end_date=start + timedelta(days=90))


@pytest.fixture
def fall():
    return term("Fall 2026", -30)


def locked_team(owner, term, title, members):
    """A project locked into a team: one filled role per (title, user)."""
    project = Project.objects.create(
        owner=owner, term=term, title=title, pitch="Pitch", status=ProjectStatus.OPEN
    )
    for role_title, member in members:
        Role.objects.create(
            project=project, title=role_title, status=RoleStatus.FILLED, filled_by=member
        )
    return try_lock(project)


def get_mine(someone):
    client = APIClient()
    client.force_authenticate(someone)
    return client.get(MINE)


def my_team(someone):
    return get_mine(someone).json()["team"]


@pytest.fixture
def marco():
    return user("marco@latech.edu", "Marco")


@pytest.fixture
def ava():
    return user("ava@latech.edu", "Ava")


@pytest.fixture
def team(fall, marco, ava):
    return locked_team(marco, fall, "Bulldog Bites", [("Backend developer", ava)])


def test_a_member_gets_their_team_with_seen_at_empty(team, fall, ava):
    response = get_mine(ava)

    assert response.status_code == 200
    assert response.json()["team"] == {
        "id": team.id,
        "project": {"id": team.project_id, "title": "Bulldog Bites"},
        "term": {"name": "Fall 2026", "end_date": fall.end_date.isoformat()},
        "members": [
            {"display_name": "Marco", "role": "Owner", "avatar_url": None, "is_me": False},
            {
                "display_name": "Ava",
                "role": "Backend developer",
                "avatar_url": None,
                "is_me": True,
            },
        ],
        "moderators": [],
        "formed_at": timezone.localtime(team.created_at).isoformat(),  # Central, with its offset
        "seen_at": None,
    }


def test_seen_at_is_mine_not_someone_elses(team, marco, ava):
    client = APIClient()
    client.force_authenticate(ava)
    client.post(f"/api/v1/teams/{team.id}/seen/")

    assert my_team(ava)["seen_at"] is not None
    assert my_team(marco)["seen_at"] is None


def test_is_me_marks_only_the_reader(team, marco):
    assert [member["is_me"] for member in my_team(marco)["members"]] == [True, False]


def test_the_owner_gets_their_team(team, marco):
    body = my_team(marco)

    assert body["id"] == team.id
    assert body["members"][0] == {
        "display_name": "Marco",
        "role": "Owner",
        "avatar_url": None,
        "is_me": True,
    }


def test_members_carry_their_avatar_url(team, marco, ava):
    profile = ava.profile
    profile.avatar.name = f"avatars/{ava.id}/abc123.png"  # the row only; nothing is read
    profile.save(update_fields=["avatar"])

    members = my_team(marco)["members"]

    assert members[1]["avatar_url"] == f"/api/v1/profiles/{profile.id}/avatar/?v=abc123"


def test_no_team_is_200_with_team_null(fall, marco):
    response = get_mine(marco)

    assert response.status_code == 200
    assert response.json() == {"team": None}


def test_a_team_from_another_term_is_ignored(fall, marco, ava):
    locked_team(marco, term("Spring 2026", -200), "Old project", [("Backend developer", ava)])

    assert my_team(ava) is None
    assert my_team(marco) is None


def test_between_terms_the_last_team_stays(marco, ava):
    # No term covers today: the team page and its chat link must not vanish (Nov 21).
    team = locked_team(
        marco, term("Spring 2026", -200), "Old project", [("Backend developer", ava)]
    )

    assert my_team(ava)["id"] == team.id


def test_does_not_leak_other_teams_or_emails(team, fall, ava):
    kim = user("kim@latech.edu", "Kim")
    locked_team(kim, fall, "CampusEats", [("Designer", user("lee@latech.edu", "Lee"))])
    outsider = user("outsider@latech.edu", "Outsider")

    response = get_mine(ava)

    assert response.json()["team"]["id"] == team.id
    assert "CampusEats" not in response.content.decode()
    assert "Kim" not in response.content.decode()
    assert "@latech.edu" not in response.content.decode()
    assert my_team(outsider) is None


def test_signed_out_users_get_401(team):
    assert APIClient().get(MINE).status_code == 401
