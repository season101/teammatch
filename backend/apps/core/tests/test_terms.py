from datetime import UTC, date, datetime
from unittest import mock

import pytest
from django.core.exceptions import ValidationError

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


@pytest.mark.parametrize(
    ("start", "end", "overlaps"),
    [
        (date(2026, 11, 20), date(2027, 3, 1), True),  # starts on Fall's last day
        (date(2026, 8, 1), date(2026, 9, 1), True),  # ends on Fall's first day
        (date(2026, 10, 1), date(2026, 10, 2), True),  # inside Fall
        (date(2026, 11, 21), date(2027, 3, 1), False),  # the day after
    ],
)
def test_terms_cannot_overlap(start, end, overlaps):
    Term.objects.create(name="Fall", start_date=date(2026, 9, 1), end_date=date(2026, 11, 20))
    winter = Term(name="Winter", start_date=start, end_date=end)

    if overlaps:
        with pytest.raises(ValidationError, match="overlap Fall"):
            winter.full_clean()
    else:
        winter.full_clean()


def test_a_term_can_be_saved_again_without_overlapping_itself():
    fall = Term.objects.create(
        name="Fall", start_date=date(2026, 9, 1), end_date=date(2026, 11, 20)
    )
    fall.end_date = date(2026, 11, 22)

    fall.full_clean()
