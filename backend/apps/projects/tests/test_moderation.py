from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.chat.services import is_member
from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.matching.tests.test_my_team import locked_team, term, user
from apps.projects.models import Project, ProjectModerator, ProjectStatus, Role
from apps.projects.services import set_moderator

pytestmark = pytest.mark.django_db

TERMS = "/api/v1/moderation/terms/"
MODERATORS = "/api/v1/moderation/moderators/"
PROJECTS = "/api/v1/moderation/projects/"
MODERATING = "/api/v1/teams/moderating/"


def as_user(someone):
    client = APIClient()
    client.force_authenticate(someone)
    return client


def assign_url(project, someone):
    return f"{PROJECTS}{project.id}/moderators/{someone.id}/"


@pytest.fixture
def fall():
    return term("Fall 2026", -30)


@pytest.fixture
def admin():
    someone = user("admin@latech.edu", "Admin")
    someone.is_staff = True
    someone.save()
    return someone


@pytest.fixture
def mod():
    return set_moderator(user("mod@latech.edu", "Mo Derator"), True)


@pytest.fixture
def marco():
    return user("marco@latech.edu", "Marco")


@pytest.fixture
def ava():
    return user("ava@latech.edu", "Ava")


@pytest.fixture
def team(fall, marco, ava):
    return locked_team(marco, fall, "Bulldog Bites", [("Backend developer", ava)])


# --- who I am


@pytest.mark.parametrize(
    ("who", "role"), [("admin", "admin"), ("mod", "moderator"), ("marco", "student")]
)
def test_my_profile_says_my_role(who, role, request):
    someone = request.getfixturevalue(who)

    assert as_user(someone).get("/api/v1/me/profile/").json()["role"] == role


# --- the admin's page is admin only


@pytest.mark.parametrize("who", ["mod", "marco"])
def test_only_an_admin_reaches_the_moderation_endpoints(who, team, mod, request):
    client = as_user(request.getfixturevalue(who))
    assign = assign_url(team.project, mod)

    assert client.get(TERMS).status_code == 403
    assert client.post(TERMS, {"name": "X"}).status_code == 403
    assert client.get(MODERATORS).status_code == 403
    assert client.post(MODERATORS, {"email": "marco@latech.edu"}).status_code == 403
    assert client.delete(f"{MODERATORS}{mod.id}/").status_code == 403
    assert client.get(PROJECTS).status_code == 403
    assert client.put(assign).status_code == 403
    assert client.delete(assign).status_code == 403
    assert not Term.objects.filter(name="X").exists()
    assert not ProjectModerator.objects.exists()


def test_signed_out_gets_401_or_403():
    assert APIClient().get(TERMS).status_code in (401, 403)


# --- terms


def test_admin_creates_a_term(admin, fall):
    start = fall.end_date + timedelta(days=1)
    body = {"name": "Winter 2027", "start_date": start, "end_date": start + timedelta(days=60)}

    response = as_user(admin).post(TERMS, body)

    assert response.status_code == 201
    assert [each["name"] for each in as_user(admin).get(TERMS).json()] == [
        "Winter 2027",
        "Fall 2026",
    ]


def test_a_term_that_overlaps_another_is_refused(admin, fall):
    body = {"name": "Clash", "start_date": fall.end_date, "end_date": fall.end_date + timedelta(9)}

    response = as_user(admin).post(TERMS, body)

    assert response.status_code == 400
    assert "overlap Fall 2026" in response.json()["start_date"][0]
    assert not Term.objects.filter(name="Clash").exists()


def test_a_term_must_end_after_it_starts(admin):
    today = timezone.localdate()

    response = as_user(admin).post(TERMS, {"name": "Back", "start_date": today, "end_date": today})

    assert response.status_code == 400
    assert "end_date" in response.json()


# --- moderators


def test_admin_promotes_by_email_and_demotes(admin, marco, team):
    client = as_user(admin)

    promoted = client.post(MODERATORS, {"email": "Marco@latech.edu"})
    assert promoted.status_code == 201
    assert promoted.json() == {"id": marco.id, "email": "marco@latech.edu", "display_name": "Marco"}
    assert [each["id"] for each in client.get(MODERATORS).json()] == [marco.id]

    client.put(assign_url(team.project, marco))
    assert client.delete(f"{MODERATORS}{marco.id}/").status_code == 204
    marco.refresh_from_db()
    assert not marco.is_moderator
    assert not ProjectModerator.objects.exists()  # off their projects too


@pytest.mark.parametrize("email", ["nobody@latech.edu", "admin@latech.edu"])
def test_an_unknown_or_admin_email_is_not_promoted(email, admin):
    response = as_user(admin).post(MODERATORS, {"email": email})

    assert response.status_code == 400
    assert "email" in response.json()


# --- assigning


def test_admin_assigns_and_removes_a_moderator(admin, mod, team):
    client = as_user(admin)
    url = assign_url(team.project, mod)

    assert client.put(url).status_code == 204
    assert client.put(url).status_code == 204  # again is fine
    listed = client.get(PROJECTS).json()
    assert [(each["title"], each["moderators"]) for each in listed] == [
        ("Bulldog Bites", [{"id": mod.id, "email": "mod@latech.edu", "display_name": "Mo Derator"}])
    ]

    assert client.delete(url).status_code == 204
    assert client.get(PROJECTS).json()[0]["moderators"] == []


def test_only_a_moderator_can_be_assigned(admin, marco, team):
    assert as_user(admin).put(assign_url(team.project, marco)).status_code == 404
    assert not ProjectModerator.objects.exists()


# --- what an assigned moderator sees


def test_a_moderator_sees_their_projects_with_the_team(mod, team, fall, marco):
    draft = Project.objects.create(owner=marco, term=fall, title="Draft", pitch="P")
    for project in (team.project, draft):
        ProjectModerator.objects.create(project=project, user=mod)

    listed = as_user(mod).get(MODERATING).json()

    assert [each["title"] for each in listed] == ["Draft", "Bulldog Bites"]
    assert listed[0]["team"] is None
    assert listed[1]["moderators"] == ["Mo Derator"]
    assert listed[1]["team"]["id"] == team.id
    assert [member["role"] for member in listed[1]["team"]["members"]] == [
        "Owner",
        "Backend developer",
    ]
    # a draft is visible to its moderator, but not theirs to change
    assert as_user(mod).get(f"/api/v1/projects/{draft.id}/").status_code == 200
    assert as_user(mod).patch(f"/api/v1/projects/{draft.id}/", {"title": "X"}).status_code == 403
    assert as_user(mod).post(f"/api/v1/projects/{draft.id}/close/").status_code == 403


def test_moderators_show_on_the_project_and_the_team(mod, team, ava):
    ProjectModerator.objects.create(project=team.project, user=mod)
    client = as_user(ava)

    assert client.get(f"/api/v1/projects/{team.project.id}/").json()["moderators"] == ["Mo Derator"]
    assert client.get("/api/v1/teams/mine/").json()["team"]["moderators"] == ["Mo Derator"]


def test_chat_opens_for_an_assigned_moderator_only(mod, team):
    messages = f"/api/v1/teams/{team.id}/messages/"

    # not assigned: the same 404 as anyone off the team
    assert not is_member(mod, team.id)
    assert as_user(mod).get(messages).status_code == 404
    assert as_user(mod).get(MODERATING).json() == []

    ProjectModerator.objects.create(project=team.project, user=mod)

    assert is_member(mod, team.id)
    assert as_user(mod).get(messages).status_code == 200


def test_a_link_left_by_a_demotion_grants_nothing(mod, team, fall, marco):
    # The Django admin clears the flag without going through set_moderator.
    draft = Project.objects.create(owner=marco, term=fall, title="Draft", pitch="P")
    for project in (team.project, draft):
        ProjectModerator.objects.create(project=project, user=mod)
    mod.is_moderator = False
    mod.save()

    assert not is_member(mod, team.id)
    assert as_user(mod).get(f"/api/v1/teams/{team.id}/messages/").status_code == 404
    assert as_user(mod).get(f"/api/v1/projects/{draft.id}/").status_code == 404


# --- moderators and admins don't act as students


@pytest.mark.parametrize("who", ["admin", "mod"])
def test_staff_cannot_create_or_publish_a_project(who, fall, request):
    someone = request.getfixturevalue(who)
    draft = Project.objects.create(owner=someone, term=fall, title="Mine", pitch="P")
    Role.objects.create(project=draft, title="Dev")

    created = as_user(someone).post("/api/v1/projects/", {"title": "T", "pitch": "P"})
    published = as_user(someone).post(f"/api/v1/projects/{draft.id}/publish/")

    assert created.status_code == 403
    assert created.json()["code"] == "not_a_student"
    assert published.status_code == 403
    assert Project.objects.count() == 1
    draft.refresh_from_db()
    assert draft.status == ProjectStatus.DRAFT


@pytest.mark.parametrize("who", ["admin", "mod"])
def test_staff_cannot_apply_or_commit_and_get_no_deck(who, fall, marco, request):
    someone = request.getfixturevalue(who)
    project = Project.objects.create(
        owner=marco, term=fall, title="Open", pitch="P", status=ProjectStatus.OPEN
    )
    role = Role.objects.create(project=project, title="Dev")
    offer = Application.objects.create(
        role=Role.objects.create(project=project, title="Design"),
        applicant=someone,
        status=ApplicationStatus.LIKED,
    )
    client = as_user(someone)

    applied = client.post("/api/v1/applications/", {"role": role.id})
    committed = client.post(f"/api/v1/applications/{offer.id}/commit/")

    assert applied.status_code == 403
    assert applied.json()["code"] == "not_a_student"
    assert committed.status_code == 403
    assert Application.objects.count() == 1
    offer.refresh_from_db()
    assert offer.status == ApplicationStatus.LIKED
    assert client.get("/api/v1/feed/").json()["results"] == []


def test_a_student_still_sees_the_deck(fall, marco, ava):
    project = Project.objects.create(
        owner=marco, term=fall, title="Open", pitch="P", status=ProjectStatus.OPEN
    )
    Role.objects.create(project=project, title="Dev")

    assert len(as_user(ava).get("/api/v1/feed/").json()["results"]) == 1


def test_a_demoted_moderator_lists_no_projects(mod, team):
    ProjectModerator.objects.create(project=team.project, user=mod)
    mod.is_moderator = False
    mod.save()

    assert as_user(mod).get(MODERATING).json() == []
