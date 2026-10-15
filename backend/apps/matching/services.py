from django.utils import timezone

from apps.projects.models import ProjectStatus, Role, RoleStatus

from .models import ApplicationStatus


def feed_roles(user, today=None):
    """Open roles in the current term the user can still act on.

    Skips the user's own projects (BR-04) and roles they already applied to
    (any status, since an application is one per user per role) or passed.
    """
    today = today or timezone.localdate()
    return (
        Role.objects.filter(
            status=RoleStatus.OPEN,
            project__status=ProjectStatus.OPEN,
            project__term__start_date__lte=today,
            project__term__end_date__gte=today,
        )
        .exclude(project__owner=user)
        .exclude(applications__applicant=user)
        .exclude(dismissals__user=user)
        .select_related("project")
    )


def pending_applications(role):
    """The review queue for one role (F4-01)."""
    return (
        role.applications.filter(status=ApplicationStatus.PENDING)
        .select_related("applicant__profile")
        .prefetch_related("applicant__profile__skills")
    )
