from datetime import date

import pytest

from apps.accounts.models import User
from apps.profiles.services import retire

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
