from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Prefetch, Q
from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.profiles.services import is_retired, retire
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

from .models import Application, ApplicationStatus, Membership, RoleDismissal, Team


def feed_roles(user, today=None):
    """Open roles in the current term the user can still act on.

    Skips the user's own projects (BR-04) and roles they already applied to
    (any status, since an application is one per user per role) or passed.
    Empty while they're retired (BR-09).
    """
    today = today or timezone.localdate()
    if is_retired(user, today):
        return Role.objects.none()
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
    """The review queue for one role (F4-01). Retired applicants are left out (BR-09)."""
    return (
        role.applications.filter(status=ApplicationStatus.PENDING)
        .exclude(applicant__profile__retired_until__gte=timezone.localdate())
        .select_related("applicant__profile")
        .prefetch_related("applicant__profile__skills")
    )


def my_team_seat(user, today=None):
    """My seat on a team in the current term, or None (F4-05).

    Comes with the team's project, term and members, owner first.
    """
    today = today or timezone.localdate()
    members = Membership.objects.select_related("user__profile", "role").order_by(
        F("role").asc(nulls_first=True), "id"
    )
    return (
        Membership.objects.filter(
            user=user,
            team__project__term__start_date__lte=today,
            team__project__term__end_date__gte=today,
        )
        .select_related("team__project__term")
        .prefetch_related(Prefetch("team__memberships", queryset=members))
        .order_by("-team__created_at")
        .first()
    )


class ApplicationNotPending(APIException):
    status_code = 409
    default_detail = "This application is no longer pending."
    default_code = "application_not_pending"


class ApplicantRetired(APIException):
    status_code = 409
    default_detail = "This person just joined another team."
    default_code = "applicant_retired"


class ApplicantCommitted(APIException):
    status_code = 409
    default_detail = "This person already has a spot on an open project."
    default_code = "applicant_committed"


@transaction.atomic
def decide(application, status):
    """The owner likes or passes a pending application (F4-02, F4-05).

    A like fills the role, passes its other pending applications, withdraws the
    applicant's other pending applications on the project (BR-05) and locks the
    team if that was the last open role (BR-06). Returns (application, team);
    team is None unless this like locked it.

    Rows are locked role, applicant, application, then project (in try_lock), so
    two likes on one role, two likes of one person, or likes on the last two
    roles wait for each other instead of double-filling or skipping the lock.
    """
    role = Role.objects.select_related("project").select_for_update(of=("self",))
    role = role.get(pk=application.role_id)
    if status == ApplicationStatus.LIKED:
        get_user_model().objects.select_for_update().get(pk=application.applicant_id)
        # A seat on any team this term means they're retired (BR-08).
        on_a_team = Membership.objects.filter(
            user_id=application.applicant_id, team__project__term_id=role.project.term_id
        )
        if on_a_team.exists():
            raise ApplicantRetired()
        # A like can't be undone (BR-11), so an open project they own or fill a role on
        # already holds their one spot this term.
        committed = Project.objects.filter(
            Q(owner_id=application.applicant_id) | Q(roles__filled_by_id=application.applicant_id),
            term_id=role.project.term_id,
            status=ProjectStatus.OPEN,
        )
        if committed.exists():
            raise ApplicantCommitted()
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
    # One seat per person per team: their other roles here leave the queue, as at a lock (BR-08).
    Application.objects.filter(
        status=ApplicationStatus.PENDING,
        applicant_id=application.applicant_id,
        role_id__in=Role.objects.filter(project_id=role.project_id),
    ).update(status=ApplicationStatus.WITHDRAWN, updated_at=timezone.now())
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

    Then every member's other pending applications that term are withdrawn and
    they're retired until the term ends (BR-08, F4-07).

    Returns the team, or None while the project can't lock. Safe to call twice:
    the project row lock serialises callers and Team.project is unique.

    Lock order: role, applicant, application, project (as in decide), then the
    members' other applications and profiles. The membership inserts wait for any
    like holding a member's user row, so we never hold an application that like
    needs next. Two teams locking at the same moment with crossed applicants can
    still deadlock; Postgres then rolls one like back.
    """
    project = (
        Project.objects.select_related("term").select_for_update(of=("self",)).get(pk=project.pk)
    )
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
    members = [project.owner_id] + [role.filled_by_id for role in roles]
    # role_id__in, not role__project: a join would hide status from the recheck after a
    # row lock wait, and a pass that committed meanwhile would be turned into withdrawn.
    other_roles = Role.objects.filter(project__term_id=project.term_id).exclude(project=project)
    Application.objects.filter(
        status=ApplicationStatus.PENDING, applicant_id__in=members, role_id__in=other_roles
    ).update(status=ApplicationStatus.WITHDRAWN, updated_at=timezone.now())
    retire(members, project.term.end_date)
    project.status = ProjectStatus.LOCKED
    project.save(update_fields=["status", "updated_at"])
    return team


class RoleNotOpen(APIException):
    status_code = 409
    default_detail = "This role is no longer open."
    default_code = "role_not_open"


class ProfileRetired(APIException):
    status_code = 403
    default_detail = "You're on a team this term, so you can't apply until it ends."
    default_code = "profile_retired"


class AlreadyApplied(APIException):
    status_code = 409
    default_detail = "You already applied to this role."
    default_code = "already_applied"


@transaction.atomic
def apply(role, user, note=""):
    """A candidate applies to an open role (F3-02).

    Locking the role row makes the filled check and the one-per-role check (BR-02)
    race-free. The user row is locked next, as in decide, so an apply waits for a
    team lock seating this user and then sees them retired (BR-09).
    The project is read after that lock in its own query: a row joined to the locked
    role would come from before a close that held it committed (F2-05).
    """
    role = Role.objects.select_for_update().get(pk=role.pk)
    get_user_model().objects.select_for_update().get(pk=user.pk)
    if is_retired(user):
        raise ProfileRetired()
    if role.status == RoleStatus.FILLED:
        raise RoleNotOpen("This role was just filled.")
    if Project.objects.get(pk=role.project_id).status != ProjectStatus.OPEN:
        raise RoleNotOpen()
    if role.applications.filter(applicant=user).exists():
        raise AlreadyApplied()
    return Application.objects.create(role=role, applicant=user, note=note)


def dismiss(role, user):
    """A candidate passes on a role so it leaves their feed (F3-05, BR-10).

    The owner is never told. Passing twice keeps the first pass.
    """
    if role.status != RoleStatus.OPEN or role.project.status != ProjectStatus.OPEN:
        raise RoleNotOpen()
    RoleDismissal.objects.get_or_create(user=user, role=role)
