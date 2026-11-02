from django.db.models import Q
from django.utils import timezone

from .models import Profile


def retire(users, until):
    """Retire these users (or user ids) until a date, usually the term end (BR-08, F1-08).

    Takes a list so a team lock is one query however big the team is.
    A later date someone already has is kept.
    """
    Profile.objects.filter(user__in=users).filter(
        Q(retired_until__isnull=True) | Q(retired_until__lt=until)
    ).update(retired_until=until)


def is_retired(user, today=None):
    """On a team until retired_until, that last day included (BR-09, F1-08).

    Reads the profile fresh, so a caller holding the user's row lock sees a team lock
    that just committed.
    """
    today = today or timezone.localdate()
    return Profile.objects.filter(user=user, retired_until__gte=today).exists()
