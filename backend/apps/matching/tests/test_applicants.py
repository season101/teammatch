from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Term
from apps.matching.models import Application, ApplicationStatus
from apps.profiles.models import Profile, Skill
from apps.projects.models import Project, ProjectStatus, Role

pytestmark = pytest.mark.django_db

User = get_user_model()


@pytest.fixture
def owner():
    return User.objects.create_user(email="owner@latech.edu", password="pw")


@pytest.fixture
def role(owner):
    today = timezone.localdate()
    term = Term.objects.create(
        name="Current", start_date=today - timedelta(days=30), end_date=today + timedelta(days=60)
    )
    project = Project.objects.create(
        owner=owner, term=term, title="TeamMatch", pitch="Find a team", status=ProjectStatus.OPEN
    )
    return Role.objects.create(project=project, title="Backend dev")


def url(role):
    return f"/api/v1/roles/{role.id}/applications/"


def as_user(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def apply(role, email, **extra):
    user = User.objects.create_user(email=email, password="pw")
    return Application.objects.create(role=role, applicant=user, **extra)


def test_owner_sees_pending_applicants_with_name_major_skills_and_note(owner, role):
    application = apply(role, "sam@latech.edu", note="I know Django")
    profile = application.applicant.profile
    profile.display_name, profile.major = "Sam", "CS"
    profile.save()
    profile.skills.set(Skill.objects.filter(name="Python"))

    response = as_user(owner).get(url(role))

    assert response.status_code == 200
    [result] = response.json()["results"]
    assert result["note"] == "I know Django"
    assert result["applicant"]["display_name"] == "Sam"
    assert result["applicant"]["major"] == "CS"
    assert [s["name"] for s in result["applicant"]["skills"]] == ["Python"]
    assert "email" not in result["applicant"]


def test_only_pending_applications_are_listed(owner, role):
    pending = apply(role, "a@latech.edu")
    apply(role, "b@latech.edu", status=ApplicationStatus.PASSED)
    apply(role, "c@latech.edu", status=ApplicationStatus.WITHDRAWN)

    response = as_user(owner).get(url(role))

    assert [a["id"] for a in response.json()["results"]] == [pending.id]


def test_retired_applicants_are_left_out(owner, role):
    shown, ended, retired = (apply(role, f"{name}@latech.edu") for name in ("a", "b", "c"))
    today = timezone.localdate()
    Profile.objects.filter(user=ended.applicant).update(retired_until=today - timedelta(days=1))
    Profile.objects.filter(user=retired.applicant).update(retired_until=today)

    response = as_user(owner).get(url(role))

    assert {a["id"] for a in response.json()["results"]} == {shown.id, ended.id}


def test_status_lists_offers_out_and_the_seat_even_once_retired(owner, role):
    pending = apply(role, "a@latech.edu")
    offer = apply(role, "b@latech.edu", status=ApplicationStatus.LIKED)
    seat = apply(role, "c@latech.edu", status=ApplicationStatus.COMMITTED)
    Profile.objects.filter(user=seat.applicant).update(retired_until=timezone.localdate())

    def ids(status):
        response = as_user(owner).get(url(role), {"status": status})
        return [a["id"] for a in response.json()["results"]]

    assert ids("liked") == [offer.id]
    assert ids("committed") == [seat.id]
    assert ids("nonsense") == [pending.id]


# Review queue order: match % first, then the oldest application


def queue(owner, role, **params):
    response = as_user(owner).get(url(role), params)
    assert response.status_code == 200
    return response.json()


def apply_with_skills(role, email, skills):
    application = apply(role, email)
    application.applicant.profile.skills.set(skills)
    return application


def test_queue_is_best_match_first_then_oldest(owner, role):
    skills = list(Skill.objects.order_by("id")[:3])
    role.required_skills.set(skills)
    none = apply_with_skills(role, "none@latech.edu", [])
    two = apply_with_skills(role, "two@latech.edu", skills[:2])
    all_older = apply_with_skills(role, "all-older@latech.edu", skills)
    all_newer = apply_with_skills(role, "all-newer@latech.edu", skills)

    results = queue(owner, role)["results"]

    assert [a["id"] for a in results] == [all_older.id, all_newer.id, two.id, none.id]
    assert [a["match_percent"] for a in results] == [100, 100, 67, 0]


def test_match_percent_counts_only_this_roles_skills(owner, role):
    wanted, other = Skill.objects.order_by("id")[:2]
    role.required_skills.set([wanted])
    other_role = Role.objects.create(project=role.project, title="Designer")
    other_role.required_skills.set([other])
    application = apply_with_skills(role, "sam@latech.edu", [other])
    # someone else has the wanted skill, and Sam also applied to the role he does fit
    apply_with_skills(other_role, "pat@latech.edu", [wanted])
    Application.objects.create(role=other_role, applicant=application.applicant)

    [result] = queue(owner, role)["results"]
    assert result["match_percent"] == 0


def test_match_percent_is_null_when_the_role_asks_for_nothing(owner, role):
    apply_with_skills(role, "sam@latech.edu", list(Skill.objects.all()[:1]))

    [result] = queue(owner, role)["results"]
    assert result["match_percent"] is None


def test_queue_pages_across_a_match_boundary(owner, role):
    skill = Skill.objects.first()
    role.required_skills.set([skill])
    # the weaker matches applied first, so match order is not application order
    weak = [apply(role, f"weak{i}@latech.edu") for i in range(15)]
    strong = [apply_with_skills(role, f"strong{i}@latech.edu", [skill]) for i in range(10)]

    first = queue(owner, role)
    second = as_user(owner).get(first["next"]).json()

    ids = [a["id"] for a in first["results"] + second["results"]]
    assert ids == [a.id for a in strong + weak]
    assert len(first["results"]) == 20
    assert second["next"] is None


def test_other_statuses_stay_newest_first(owner, role):
    older = apply(role, "a@latech.edu", status=ApplicationStatus.LIKED)
    newer = apply(role, "b@latech.edu", status=ApplicationStatus.LIKED)

    results = queue(owner, role, status="liked")["results"]
    assert [a["id"] for a in results] == [newer.id, older.id]


def test_queue_query_count_does_not_grow_with_applicants(
    owner, role, django_assert_max_num_queries
):
    for i in range(5):
        apply(role, f"user{i}@latech.edu")

    # role, applications page, applicant skills
    with django_assert_max_num_queries(4):
        assert len(queue(owner, role)["results"]) == 5


def test_someone_elses_role_returns_403(role):
    stranger = User.objects.create_user(email="stranger@latech.edu", password="pw")
    assert as_user(stranger).get(url(role)).status_code == 403


def test_requires_sign_in(role):
    assert APIClient().get(url(role)).status_code in (401, 403)


# F4-02: like or pass an applicant


def decide(user, application, action):
    return as_user(user).post(f"/api/v1/applications/{application.id}/{action}/")


@pytest.mark.parametrize(
    ("action", "status"), [("like", ApplicationStatus.LIKED), ("pass", ApplicationStatus.PASSED)]
)
def test_owner_decides_a_pending_application(owner, role, action, status):
    application = apply(role, "sam@latech.edu")

    response = decide(owner, application, action)

    assert response.status_code == 200
    assert response.json()["status"] == status
    application.refresh_from_db()
    assert application.status == status


@pytest.mark.parametrize("action", ["like", "pass"])
@pytest.mark.parametrize(
    "status", [ApplicationStatus.LIKED, ApplicationStatus.PASSED, ApplicationStatus.WITHDRAWN]
)
def test_deciding_a_non_pending_application_is_rejected(owner, role, action, status):
    application = apply(role, "sam@latech.edu", status=status)

    response = decide(owner, application, action)

    assert response.status_code == 409
    application.refresh_from_db()
    assert application.status == status


@pytest.mark.parametrize("action", ["like", "pass"])
def test_only_the_project_owner_can_decide(role, action):
    application = apply(role, "sam@latech.edu")

    # the applicant can't decide their own application either
    assert decide(application.applicant, application, action).status_code == 403
    application.refresh_from_db()
    assert application.status == ApplicationStatus.PENDING


def test_deciding_an_unknown_application_returns_404(owner):
    assert as_user(owner).post("/api/v1/applications/999999/like/").status_code == 404


def test_deciding_requires_sign_in(role):
    application = apply(role, "sam@latech.edu")
    assert APIClient().post(f"/api/v1/applications/{application.id}/like/").status_code in (
        401,
        403,
    )
