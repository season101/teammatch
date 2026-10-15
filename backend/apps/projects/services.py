from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.core.models import Term

from .models import Project


class NoActiveTerm(APIException):
    status_code = 409
    default_detail = "There is no active term, so projects cannot be created yet."
    default_code = "no_active_term"


def get_active_term(today=None):
    """The term whose dates include today, or None."""
    today = today or timezone.localdate()
    return Term.objects.filter(start_date__lte=today, end_date__gte=today).first()


def create_project(*, owner, title, pitch):
    term = get_active_term()
    if term is None:
        raise NoActiveTerm()
    return Project.objects.create(owner=owner, term=term, title=title, pitch=pitch)
