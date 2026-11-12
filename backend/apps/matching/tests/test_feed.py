from base64 import b64encode
from datetime import timedelta
from unittest import mock
from urllib.parse import urlencode

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus, RoleDismissal
from apps.profiles.models import Skill
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

pytestmark = pytest.mark.django_db

FEED_URL = "/api/v1/feed/"


@pytest.fixture
def term():
    today = timezone.localdate()
    return Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def candidate():
    return get_user_model().objects.create_user(email="candidate@latech.edu", password="pw")


@pytest.fixture
def api(candidate):
    client = APIClient()
    client.force_authenticate(candidate)
    return client


def make_role(project, title="Backend dev", **extra):
    return Role.objects.create(project=project, title=title, **extra)


@pytest.fixture
def project(owner, term):
    return Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )


def feed_ids(api):
    response = api.get(FEED_URL)
    assert response.status_code == 200
    return [role["id"] for role in response.json()["results"]]


def test_feed_requires_sign_in():
    assert APIClient().get(FEED_URL).status_code == 403


def test_feed_lists_open_roles_with_project(api, project, owner):
    owner.profile.display_name = "Olive Owner"
    owner.profile.save()
    django = Skill.objects.create(name="Test Django", slug="test-django")
    role = make_role(project, description="Django + DRF")
    role.required_skills.add(django)

    response = api.get(FEED_URL)

    assert response.status_code == 200
    # the owner's display name only, never their email
    assert response.json()["results"] == [
        {
            "id": role.id,
            "title": "Backend dev",
            "description": "Django + DRF",
            "project": {
                "id": project.id,
                "title": "TeamMatch",
                "pitch": "Find a team",
                "owner_name": "Olive Owner",
            },
            "required_skills": [{"id": django.id, "name": "Test Django", "slug": "test-django"}],
            "created_at": mock.ANY,
            "match_percent": 0,
            "roles_filled": 0,
            "roles_total": 1,
            "term": "Current",
        }
    ]


# Deck card extras: match % (DD-20), team progress and the term (DD-21)


def feed_role(api, role):
    return next(r for r in api.get(FEED_URL).json()["results"] if r["id"] == role.id)


def test_match_percent_is_the_share_of_required_skills_i_have(api, candidate, project):
    skills = [Skill.objects.create(name=f"Test {i}", slug=f"test-{i}") for i in range(3)]
    role = make_role(project)
    role.required_skills.set(skills)
    candidate.profile.skills.set(skills[:2])

    assert feed_role(api, role)["match_percent"] == 67


def test_match_percent_is_null_when_the_role_asks_for_nothing(api, project):
    assert feed_role(api, make_role(project))["match_percent"] is None


def test_match_percent_ignores_other_peoples_skills(api, owner, project):
    skill = Skill.objects.create(name="Test Django", slug="test-django")
    role = make_role(project)
    role.required_skills.add(skill)
    owner.profile.skills.add(skill)

    assert feed_role(api, role)["match_percent"] == 0


def test_team_progress_counts_the_projects_roles(api, owner, project):
    role = make_role(project, title="Open one")
    make_role(project, title="Open two")
    make_role(project, title="Taken", status=RoleStatus.FILLED, filled_by=owner)
    skills = [Skill.objects.create(name=f"Test {i}", slug=f"test-{i}") for i in range(2)]
    role.required_skills.set(skills)  # extra joins must not inflate the counts

    card = feed_role(api, role)
    assert (card["roles_filled"], card["roles_total"]) == (1, 3)


def test_feed_query_count_does_not_grow_with_roles(api, project, django_assert_max_num_queries):
    skill = Skill.objects.create(name="Test Django", slug="test-django")
    for i in range(5):
        make_role(project, title=f"Role {i}").required_skills.add(skill)

    # session user, roles page, required skills
    with django_assert_max_num_queries(4):
        assert len(feed_ids(api)) == 5


def test_feed_excludes_my_own_projects(project, owner):
    make_role(project)
    client = APIClient()
    client.force_authenticate(owner)
    assert feed_ids(client) == []


@pytest.mark.parametrize("status", ApplicationStatus.values)
def test_feed_excludes_roles_i_applied_to(api, candidate, project, status):
    applied = make_role(project, title="Applied")
    other = make_role(project, title="Other")
    Application.objects.create(role=applied, applicant=candidate, status=status)
    assert feed_ids(api) == [other.id]


def test_feed_excludes_roles_i_passed(api, candidate, project):
    passed = make_role(project, title="Passed")
    other = make_role(project, title="Other")
    RoleDismissal.objects.create(user=candidate, role=passed)
    assert feed_ids(api) == [other.id]


def test_other_users_activity_does_not_hide_roles(api, project):
    role = make_role(project)
    someone = get_user_model().objects.create_user(email="someone@latech.edu", password="pw")
    Application.objects.create(role=role, applicant=someone)
    RoleDismissal.objects.create(user=someone, role=role)
    assert feed_ids(api) == [role.id]


def test_feed_excludes_filled_roles(api, project, owner):
    make_role(project, status=RoleStatus.FILLED, filled_by=owner)
    assert feed_ids(api) == []


@pytest.mark.parametrize(
    "status", [ProjectStatus.DRAFT, ProjectStatus.LOCKED, ProjectStatus.ARCHIVED]
)
def test_feed_excludes_projects_that_are_not_open(api, project, status):
    make_role(project)
    project.status = status
    project.save()
    assert feed_ids(api) == []


def test_feed_excludes_other_terms(api, owner):
    today = timezone.localdate()
    past = Term.objects.create(
        name="Past", start_date=today - timedelta(days=200), end_date=today - timedelta(days=100)
    )
    old = Project.objects.create(
        owner=owner, term=past, title="Old", pitch="x", status=ProjectStatus.OPEN
    )
    make_role(old)
    assert feed_ids(api) == []


def page_ids(api, url=FEED_URL):
    page = api.get(url).json()
    return [r["id"] for r in page["results"]], page["next"]


def test_feed_pages_20_at_a_time_newest_first_when_matches_tie(api, project):
    roles = [make_role(project, title=f"Role {i}") for i in range(25)]
    newest_first = [role.id for role in reversed(roles)]

    first, next_url = page_ids(api)
    assert first == newest_first[:20]
    assert next_url is not None

    second, next_url = page_ids(api, next_url)
    assert second == newest_first[20:]
    assert next_url is None


# F3-04: best match first, then newest


def make_skills(count):
    return [Skill.objects.create(name=f"Test {i}", slug=f"test-{i}") for i in range(count)]


def test_feed_ranks_by_share_of_required_skills_then_newest(api, candidate, project):
    skills = make_skills(4)
    candidate.profile.skills.set(skills[:2])
    wanted = {
        "none required": [],
        "half": skills[1:3],
        "all": skills[:2],
        "no overlap": skills[2:],
        "half, newer": skills[:4],
        # one of one beats two of four: it is the share that counts, not the number
        "all, newer": skills[:1],
    }
    ids = {}
    for title, required in wanted.items():
        role = make_role(project, title=title)
        role.required_skills.set(required)
        ids[title] = role.id

    order = ["all, newer", "all", "half, newer", "half", "no overlap", "none required"]
    assert feed_ids(api) == [ids[title] for title in order]


def test_feed_pages_across_a_rank_boundary(api, candidate, project):
    skills = make_skills(2)
    candidate.profile.skills.set(skills[:1])
    # oldest roles match best, so rank order is the reverse of newest first
    groups = [(skills[:1], 15), (skills, 10), ([], 5)]
    expected = []
    for required, count in groups:
        made = [make_role(project, title=f"Role {len(required)}-{i}") for i in range(count)]
        for role in made:
            role.required_skills.set(required)
        expected += [role.id for role in reversed(made)]

    first, next_url = page_ids(api)
    second, next_url = page_ids(api, next_url)
    assert first + second == expected
    assert len(first) == 20
    assert next_url is None


def test_feed_rejects_a_forged_cursor(api, project):
    make_role(project)
    cursor = b64encode(urlencode({"p": "not-a-number"}).encode("ascii")).decode("ascii")
    assert api.get(FEED_URL, {"cursor": cursor}).status_code == 404


# F1-08: a retired candidate's deck is empty (BR-09)


@pytest.mark.parametrize(("days", "shown"), [(-1, True), (0, False), (60, False)])
def test_feed_is_empty_while_im_retired(api, candidate, project, days, shown):
    role = make_role(project)
    candidate.profile.retired_until = timezone.localdate() + timedelta(days=days)
    candidate.profile.save()

    assert feed_ids(api) == ([role.id] if shown else [])
