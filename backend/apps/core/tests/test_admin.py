"""PL-07: staff can search and filter users, projects, applications, messages, terms, skills."""

from datetime import date

import pytest
from django.apps import apps
from django.contrib import admin

from apps.accounts.models import User
from apps.core.models import Term

pytestmark = pytest.mark.django_db

PAGES = [
    "accounts/user",
    "projects/project",
    "projects/role",
    "matching/application",
    "matching/roledismissal",
    "chat/chatmessage",
    "core/term",
    "profiles/skill",
    "profiles/profile",
]


def model_admin(page):
    return admin.site._registry[apps.get_model(*page.split("/"))]


@pytest.mark.parametrize("page", PAGES)
def test_each_list_has_search_and_loads_with_its_filters(client, page):
    client.force_login(User.objects.create_superuser("admin@latech.edu", "a-long-password"))

    assert model_admin(page).search_fields
    assert client.get(f"/admin/{page}/").status_code == 200
    assert client.get(f"/admin/{page}/", {"q": "x"}).status_code == 200


@pytest.mark.parametrize(
    "page", ["accounts/user", "projects/project", "matching/application", "chat/chatmessage"]
)
def test_users_projects_applications_and_messages_can_be_filtered(page):
    assert model_admin(page).list_filter


def test_the_term_form_refuses_dates_that_overlap_another_term(client):
    client.force_login(User.objects.create_superuser("admin@latech.edu", "a-long-password"))
    Term.objects.create(name="Fall", start_date=date(2026, 9, 1), end_date=date(2026, 11, 20))

    response = client.post(
        "/admin/core/term/add/",
        {"name": "Winter", "start_date": "2026-11-01", "end_date": "2027-02-01"},
    )

    assert response.status_code == 200  # the form again, with the error
    assert "overlap Fall" in response.content.decode()
    assert not Term.objects.filter(name="Winter").exists()


def test_moving_a_terms_end_moves_its_teams_bench_date(rf):
    term = Term.objects.create(
        name="Fall", start_date=date(2026, 9, 1), end_date=date(2026, 11, 20)
    )
    benched = User.objects.create_user("benched@latech.edu")
    benched.profile.retired_until = term.end_date
    benched.profile.save()

    term.end_date = date(2026, 12, 18)
    model_admin("core/term").save_model(rf.post("/"), term, form=None, change=True)

    benched.profile.refresh_from_db()
    assert benched.profile.retired_until == date(2026, 12, 18)
