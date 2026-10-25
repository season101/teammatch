from django.contrib.auth import get_user_model
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


class ApplicantRetired(APIException):
    status_code = 409
    default_detail = "This person just joined another team."
    default_code = "applicant_retired"


@transaction.atomic
def decide(application, status):
    """The owner likes or passes a pending application (F4-02, F4-05).

    A like fills the role, passes its other pending applications (BR-05) and
    locks the team if that was the last open role (BR-06). Returns
    (application, team); team is None unless this like locked it.

    Rows are locked role, applicant, application, then project (in try_lock), so
    two likes on one role, two likes of one person, or likes on the last two
    roles wait for each other instead of double-filling or skipping the lock.
    """
    role = Role.objects.select_related("project").select_for_update(of=("self",))
    role = role.get(pk=application.role_id)
    if status == ApplicationStatus.LIKED:
        get_user_model().objects.select_for_update().get(pk=application.applicant_id)
        # A seat on any team this term means they're retired (BR-08), even before F4-07.
        on_a_team = Membership.objects.filter(
            user_id=application.applicant_id, team__project__term_id=role.project.term_id
        )
        if on_a_team.exists():
            raise ApplicantRetired()
    application = (
        Application.objects.select_related("applicant__profile")
        .select_for_update(of=("self",))
        .get(pk=application.pk)
    )
    if application.status != ApplicationStatus.PENDING:
        raise ApplicationNotPending()
    application.status = status
    application.save(update_fields=["status", "updated_at"])
    if status != ApplicationStatus.LIKED:
        return application, None
    if role.status != RoleStatus.OPEN:
        raise RoleNotOpen("This role was just filled.")
    role.status, role.filled_by_id = RoleStatus.FILLED, application.applicant_id
    role.save(update_fields=["status", "filled_by", "updated_at"])
    role.applications.filter(status=ApplicationStatus.PENDING).update(
        status=ApplicationStatus.PASSED
    )
    return application, try_lock(role.project)


@transaction.atomic
def withdraw(application):
    """The candidate withdraws a pending application (F3-06).

    It leaves the owner's queue. Liked (filled) applications can't be withdrawn (BR-11).
    """
    application = Application.objects.select_for_update().get(pk=application.pk)
    if application.status != ApplicationStatus.PENDING:
        raise ApplicationNotPending()
    application.status = ApplicationStatus.WITHDRAWN
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
