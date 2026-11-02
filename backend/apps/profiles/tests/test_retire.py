from datetime import date, timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.accounts.models import User
from apps.profiles.models import Profile
from apps.profiles.services import is_retired, retire

pytestmark = pytest.mark.django_db

TERM_END = date(2026, 12, 12)


@pytest.mark.parametrize(
    ("before", "after"),
    [
        (None, TERM_END),
        (date(2026, 5, 15), TERM_END),
        (date(2027, 5, 15), date(2027, 5, 15)),  # a later date is never shortened
    ],
)
def test_retire_sets_retired_until(before, after):
    sam = User.objects.create_user("sam@latech.edu", "a-long-password")
    sam.profile.retired_until = before
    sam.profile.save()

    retire([sam], TERM_END)

    sam.profile.refresh_from_db()
    assert sam.profile.retired_until == after


def test_retire_only_touches_the_users_given():
    sam = User.objects.create_user("sam@latech.edu", "a-long-password")
    kim = User.objects.create_user("kim@latech.edu", "a-long-password")

    retire([sam.id], TERM_END)

    kim.profile.refresh_from_db()
    assert kim.profile.retired_until is None


def retired_for(email, days):
    user = User.objects.create_user(email, "a-long-password")
    if days is not None:
        user.profile.retired_until = timezone.localdate() + timedelta(days=days)
        user.profile.save()
    return user


@pytest.mark.parametrize(("days", "retired"), [(None, False), (-1, False), (0, True), (30, True)])
def test_retired_through_the_last_day(days, retired):
    assert is_retired(retired_for("sam@latech.edu", days)) is retired


def test_reset_retired_clears_past_dates_only_and_can_run_again():
    retired_for("past@latech.edu", -1)
    retired_for("today@latech.edu", 0)
    retired_for("never@latech.edu", None)
    out = StringIO()

    call_command("reset_retired", stdout=out)
    call_command("reset_retired", stdout=out)

    assert dict(Profile.objects.values_list("user__email", "retired_until")) == {
        "past@latech.edu": None,
        "today@latech.edu": timezone.localdate(),
        "never@latech.edu": None,
    }
    assert out.getvalue().splitlines() == [
        "cleared retired_until on 1 profile(s)",
        "cleared retired_until on 0 profile(s)",
    ]
