from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.core.models import Term

from .models import Project, ProjectStatus, Role, RoleStatus


class NoActiveTerm(APIException):
    status_code = 409
    default_detail = "There is no active term, so projects cannot be created yet."
    default_code = "no_active_term"


class ProjectLocked(APIException):
    status_code = 409
    default_detail = "This project is locked or archived, so its roles cannot change."
    default_code = "project_locked"


class RoleNotOpen(APIException):
    status_code = 409
    default_detail = "Only an open role can be edited."
    default_code = "role_not_open"


class ProjectNotDraft(APIException):
    status_code = 409
    default_detail = "Only a draft project can be published."
    default_code = "project_not_draft"


class ProjectNeedsRoles(APIException):
    status_code = 409
    default_detail = "Add at least one role before publishing."
    default_code = "project_needs_roles"


class LastRole(APIException):
    status_code = 409
    default_detail = "An open project needs at least one role. Close the project instead."
    default_code = "project_needs_roles"


class OpenProjectExists(APIException):
    status_code = 409
    default_detail = "You already have an open project. Close it or wait until it locks."
    default_code = "open_project_exists"


def get_active_term(today=None):
    """The term whose dates include today, or None."""
    today = today or timezone.localdate()
    return Term.objects.filter(start_date__lte=today, end_date__gte=today).first()


def create_project(*, owner, title, pitch):
    term = get_active_term()
    if term is None:
        raise NoActiveTerm()
    return Project.objects.create(owner=owner, term=term, title=title, pitch=pitch)


def ensure_roles_editable(project):
    """Roles can be added to a draft or open project only."""
    if project.status not in (ProjectStatus.DRAFT, ProjectStatus.OPEN):
        raise ProjectLocked()


def ensure_role_editable(role):
    ensure_roles_editable(role.project)
    if role.status != RoleStatus.OPEN:
        raise RoleNotOpen()


def publish_project(project):
    """Draft to open. A project with no roles cannot be opened (BR-06)."""
    if project.status != ProjectStatus.DRAFT:
        raise ProjectNotDraft()
    if not project.roles.exists():
        raise ProjectNeedsRoles()
    already_open = (
        Project.objects.filter(owner=project.owner, term=project.term, status=ProjectStatus.OPEN)
        .exclude(pk=project.pk)
        .exists()
    )
    if already_open:
        raise OpenProjectExists()
    project.status = ProjectStatus.OPEN
    project.save()
    return project


def open_projects(today=None):
    """Open projects in the current term, with how many roles are still open (F2-03)."""
    today = today or timezone.localdate()
    return (
        Project.objects.filter(
            status=ProjectStatus.OPEN,
            term__start_date__lte=today,
            term__end_date__gte=today,
        )
        .select_related("owner__profile")
        .annotate(open_role_count=Count("roles", filter=Q(roles__status=RoleStatus.OPEN)))
    )


def my_projects(user):
    """Projects I own, newest first, with their roles (F4-01 review page)."""
    return Project.objects.filter(owner=user).prefetch_related("roles")


def visible_projects(user):
    """Projects this user may open: their own, and anyone's open or locked ones (F2-02)."""
    roles = (
        Role.objects.order_by("created_at")
        .select_related("filled_by__profile")
        .prefetch_related("required_skills")
    )
    return (
        Project.objects.filter(
            Q(owner=user) | Q(status__in=[ProjectStatus.OPEN, ProjectStatus.LOCKED])
        )
        .select_related("owner__profile")
        .prefetch_related(Prefetch("roles", queryset=roles))
    )


@transaction.atomic
def delete_role(role):
    """Delete an open role nobody fits (F2-06, BR-07).

    Its applications go with it. If every remaining role is already filled,
    the project locks now (BR-06).

    Locks the role, then the project, the order a like uses (matching.services.decide),
    so a like or a close committing at the same moment is seen, not overwritten.
    """
    role = Role.objects.select_for_update().get(pk=role.pk)
    project = role.project = Project.objects.select_for_update().get(pk=role.project_id)
    ensure_role_editable(role)  # 409 if the project is locked/archived or the role is filled
    if project.status == ProjectStatus.OPEN and project.roles.count() == 1:
        raise LastRole()  # an open project may not end up with zero roles
    role.delete()

    from apps.matching.services import try_lock  # imported here: matching imports projects

    try_lock(project)
    return project


def ensure_project_editable(project):
    """Only a draft or open project can be changed or closed (BR-13)."""
    if project.status not in (ProjectStatus.DRAFT, ProjectStatus.OPEN):
        raise ProjectLocked("This project is locked or archived, so it cannot be changed.")


@transaction.atomic
def close_project(project):
    """Archive a project: it leaves the feeds and its pending applications are withdrawn (F2-05).

    Locks its roles, then the project, then its applications. A like locks its role
    first and the project last (matching.services.decide), so the two queue on the role.
    Locking the project first would deadlock with a like holding its application row.
    no_key: a like that locks the team still takes KEY SHARE on filled roles for its seats.
    """
    list(Role.objects.filter(project=project).order_by("pk").select_for_update(no_key=True))
    project = Project.objects.select_for_update().get(pk=project.pk)
    ensure_project_editable(project)

    from apps.matching.models import Application, ApplicationStatus  # matching imports projects

    Application.objects.filter(role__project=project, status=ApplicationStatus.PENDING).update(
        status=ApplicationStatus.WITHDRAWN
    )
    project.status = ProjectStatus.ARCHIVED
    project.save()
    return project
