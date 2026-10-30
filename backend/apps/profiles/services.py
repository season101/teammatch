from django.db.models import Q

from .models import Profile


def retire(users, until):
    """Retire these users (or user ids) until a date, usually the term end (BR-08, F1-08).

    Takes a list so a team lock is one query however big the team is.
    A later date someone already has is kept.
    """
    Profile.objects.filter(user__in=users).filter(
        Q(retired_until__isnull=True) | Q(retired_until__lt=until)
    ).update(retired_until=until)
