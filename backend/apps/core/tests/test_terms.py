from datetime import UTC, date, datetime
from unittest import mock

import pytest

from apps.core.models import Term
from apps.projects.services import get_active_term

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ("utc_now", "active"),
    [
        (datetime(2026, 11, 21, 5, 30, tzinfo=UTC), True),  # 11:30 pm Nov 20 in Ruston
        (datetime(2026, 11, 21, 6, 30, tzinfo=UTC), False),  # 12:30 am Nov 21 in Ruston
    ],
)
def test_the_term_ends_at_midnight_central_not_utc(utc_now, active):
    fall = Term.objects.create(
        name="Fall", start_date=date(2026, 9, 1), end_date=date(2026, 11, 20)
    )

    with mock.patch("django.utils.timezone.now", return_value=utc_now):
        assert (get_active_term() == fall) is active
