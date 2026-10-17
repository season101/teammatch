from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

from .models import Application, ApplicationStatus, Membership, Team


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
        .select_related("project__owner__profile")
        .prefetch_related("required_skills")
    )


def pending_applications(role):
    """The review queue for one role (F4-01)."""
    return (
        role.applications.filter(status=ApplicationStatus.PENDING)
        .select_related("applicant__profile")
        .prefetch_related("applicant__profile__skills")
    )


class ApplicationNotPending(APIException):
    status_code = 409
    default_detail = "This application is no longer pending."
    default_code = "application_not_pending"


@transaction.atomic
def decide(application, status):
    """The owner likes or passes a pending application (F4-02).

    The row lock stops two clicks from both deciding. Filling the role is F4-05.
    """
    application = Application.objects.select_for_update().get(pk=application.pk)
    if application.status != ApplicationStatus.PENDING:
        raise ApplicationNotPending()
    application.status = status
    application.save(update_fields=["status", "updated_at"])
    return application


@transaction.atomic
def try_lock(project):
    """Lock the project into a team once all its roles are filled (BR-06, F4-03).

    Returns the team, or None while the project can't lock. Safe to call twice:
    the project row lock serialises callers and Team.project is unique.
    """
    project = Project.objects.select_for_update().get(pk=project.pk)
    team = Team.objects.filter(project=project).first()
    if team or project.status != ProjectStatus.OPEN:
        return team
    roles = list(project.roles.all())
    if not roles or any(role.status != RoleStatus.FILLED for role in roles):
        return None
    team = Team.objects.create(project=project)
    Membership.objects.bulk_create(
        [Membership(team=team, user_id=project.owner_id)]
        + [Membership(team=team, user_id=role.filled_by_id, role=role) for role in roles]
    )
    project.status = ProjectStatus.LOCKED
    project.save(update_fields=["status", "updated_at"])
    return team


class RoleNotOpen(APIException):
    status_code = 409
    default_detail = "This role is no longer open."
    default_code = "role_not_open"


class AlreadyApplied(APIException):
    status_code = 409
    default_detail = "You already applied to this role."
    default_code = "already_applied"


@transaction.atomic
def apply(role, user, note=""):
    """A candidate applies to an open role (F3-02).

    Locking the role row makes the filled check and the one-per-role check (BR-02)
    race-free. Only the role is locked, so this can't deadlock with a like.
    """
    role = Role.objects.select_related("project").select_for_update(of=("self",)).get(pk=role.pk)
    if role.status == RoleStatus.FILLED:
        raise RoleNotOpen("This role was just filled.")
    if role.project.status != ProjectStatus.OPEN:
        raise RoleNotOpen()
    if role.applications.filter(applicant=user).exists():
        raise AlreadyApplied()
    return Application.objects.create(role=role, applicant=user, note=note)
