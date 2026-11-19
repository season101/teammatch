from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.core.models import Term

from .models import Project, ProjectModerator, ProjectStatus, Role, RoleStatus


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


class OwnerHasASpot(APIException):
    status_code = 409
    default_detail = "You already have a spot on another project this term."
    default_code = "owner_has_a_spot"


class TermOver(APIException):
    status_code = 409
    default_detail = "This project's term is over."
    default_code = "term_over"


# A project's moderators with their profiles, for moderator_names.
MODERATORS = Prefetch(
    "moderator_links", queryset=ProjectModerator.objects.select_related("user__profile")
)


def moderator_names(project):
    """Display names of a project's moderators, never their emails."""
    names = []
    for link in project.moderator_links.all():
        profile = getattr(link.user, "profile", None)
        names.append(profile.display_name if profile else "")
    return names


def set_moderator(user, on):
    """Make someone a moderator, or a student again (which takes them off their projects).

    shortcut: a student's projects, applications and seat stay as they are when promoted;
    clear them here if moderators must start clean.
    """
    with transaction.atomic():
        user.is_moderator = on
        user.save(update_fields=["is_moderator"])
        if not on:
            ProjectModerator.objects.filter(user=user).delete()
    return user


def ensure_term_not_over(term, today=None):
    """A past term's projects take no new step: publish, apply, like, pass or commit."""
    if term.end_date < (today or timezone.localdate()):
        raise TermOver()


def get_active_term(today=None):
    """The term whose dates include today, or None."""
    today = today or timezone.localdate()
    return Term.objects.filter(start_date__lte=today, end_date__gte=today).first()


def create_project(*, owner, title, pitch, repo_url="", details=""):
    term = get_active_term()
    if term is None:
        raise NoActiveTerm()
    return Project.objects.create(
        owner=owner, term=term, title=title, pitch=pitch, repo_url=repo_url, details=details
    )


def ensure_roles_editable(project):
    """Roles can be added to a draft or open project only."""
    if project.status not in (ProjectStatus.DRAFT, ProjectStatus.OPEN):
        raise ProjectLocked()


def ensure_role_editable(role):
    ensure_roles_editable(role.project)
    if role.status != RoleStatus.OPEN:
        raise RoleNotOpen()


@transaction.atomic
def publish_project(project):
    """Draft to open. A project with no roles cannot be opened (BR-06).

    Nor can it while the owner is on a team or fills a role on an open project this term.
    Their user row is locked first, as a commit locks its applicant's, so a commit can't give
    them a role between the check and the publish.
    """
    get_user_model().objects.select_for_update().get(pk=project.owner_id)
    if project.status != ProjectStatus.DRAFT:
        raise ProjectNotDraft()
    ensure_term_not_over(project.term)
    if not project.roles.exists():
        raise ProjectNeedsRoles()
    already_open = (
        Project.objects.filter(owner=project.owner, term=project.term, status=ProjectStatus.OPEN)
        .exclude(pk=project.pk)
        .exists()
    )
    if already_open:
        raise OpenProjectExists()
    has_a_spot = Project.objects.filter(
        Q(status=ProjectStatus.OPEN, roles__filled_by_id=project.owner_id)
        | Q(team__memberships__user_id=project.owner_id),
        term_id=project.term_id,
    )
    if has_a_spot.exists():
        raise OwnerHasASpot()
    project.status = ProjectStatus.OPEN
    project.save()
    return project


def open_projects(today=None, q=""):
    """Open projects in the current term, with how many roles are still open (F2-03).
    Not the projects of owners an admin deactivated (PL-07).

    q keeps the ones whose title, pitch, or an open role's title or required skill
    contains it, ignoring case (F2-07).
    """
    today = today or timezone.localdate()
    projects = (
        Project.objects.filter(
            status=ProjectStatus.OPEN,
            term__start_date__lte=today,
            term__end_date__gte=today,
            owner__is_active=True,
        )
        .select_related("owner__profile")
        .annotate(
            open_role_count=Count("roles", filter=Q(roles__status=RoleStatus.OPEN)),
            # With open_role_count, the list can say "2 of 5 roles filled".
            role_count=Count("roles"),
        )
    )
    q = q.strip()
    if q:
        role_matches = Q(roles__title__icontains=q) | Q(roles__required_skills__name__icontains=q)
        matches = Project.objects.filter(
            Q(title__icontains=q)
            | Q(pitch__icontains=q)
            | (Q(roles__status=RoleStatus.OPEN) & role_matches)
        )
        # A subquery, so the role and skill joins can't repeat a project or bend the count.
        projects = projects.filter(pk__in=matches.values("pk"))
    return projects


def my_projects(user):
    """Projects I own, newest first, with their roles in the order they were added (F4-01).

    The same role order as the project page (visible_projects), so Review's tabs match it.
    """
    roles = Role.objects.order_by("created_at")
    return Project.objects.filter(owner=user).prefetch_related(Prefetch("roles", queryset=roles))


def visible_to(user, via=""):
    """Projects this user may see: their own, the ones they moderate, and anyone's open
    or locked ones (F2-02).

    via is the lookup path to the project, e.g. "project__" to filter roles.
    """
    shown = [ProjectStatus.OPEN, ProjectStatus.LOCKED]
    # A subquery, so a project with several moderators isn't repeated.
    # user__is_moderator: a link left behind by a demotion grants nothing.
    moderated = ProjectModerator.objects.filter(user=user, user__is_moderator=True).values(
        "project_id"
    )
    return (
        Q(**{f"{via}owner": user})
        | Q(**{f"{via}status__in": shown})
        | Q(**{f"{via}pk__in": moderated})
    )


def visible_projects(user):
    """Projects this user may open (visible_to), with their roles."""
    roles = (
        Role.objects.order_by("created_at")
        .select_related("filled_by__profile")
        .prefetch_related("required_skills")
    )
    return (
        Project.objects.filter(visible_to(user))
        .select_related("owner__profile")
        .prefetch_related(Prefetch("roles", queryset=roles), MODERATORS)
    )


@transaction.atomic
def delete_role(role):
    """Delete an open role nobody fits (F2-06, BR-07).

    Its applications go with it. If every remaining role is already filled,
    the project locks now (BR-06).

    Locks the role, then the project, the order a commit uses (matching.services.commit),
    so a commit or a close landing at the same moment is seen, not overwritten.
    """
    # Deleted meanwhile (say, a double click): 404, not a 500.
    role = get_object_or_404(Role.objects.select_for_update(), pk=role.pk)
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
    """Archive a project: it leaves the feeds, and its pending applications and offers
    are withdrawn (F2-05, F4-10).

    Locks its roles, then the project, then its applications. A commit locks its role
    first and the project last (matching.services.commit), so the two queue on the role.
    Locking the project first would deadlock with a commit holding its application row.
    no_key: a commit that locks the team still takes KEY SHARE on filled roles for its seats.
    """
    list(Role.objects.filter(project=project).order_by("pk").select_for_update(no_key=True))
    project = Project.objects.select_for_update().get(pk=project.pk)
    ensure_project_editable(project)

    from apps.matching.models import (  # matching imports projects
        Application,
        ApplicationStatus,
        WithdrawnReason,
    )

    Application.objects.filter(
        role__project=project, status__in=[ApplicationStatus.PENDING, ApplicationStatus.LIKED]
    ).update(
        status=ApplicationStatus.WITHDRAWN,
        withdrawn_reason=WithdrawnReason.PROJECT_CLOSED,
        updated_at=timezone.now(),  # .update() skips auto_now
    )
    project.status = ProjectStatus.ARCHIVED
    project.save()
    return project
