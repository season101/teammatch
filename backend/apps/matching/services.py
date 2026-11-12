from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import BigIntegerField, Count, ExpressionWrapper, F, Prefetch, Q, Value
from django.db.models.functions import Cast, Coalesce, Extract, NullIf
from django.utils import timezone
from rest_framework.exceptions import APIException

from apps.profiles.services import is_retired, retire
from apps.projects.models import Project, ProjectStatus, Role, RoleStatus

from .models import Application, ApplicationStatus, Membership, RoleDismissal, Team

# Match % in SQL, rounded half up like serializers.match_percent. 0 when nothing is required.
MATCH_PERCENT = Coalesce(
    (F("skills_matched") * 200 + F("skills_total")) / NullIf(F("skills_total") * 2, Value(0)),
    Value(0),
)
CREATED_MICROS = Cast(Extract("created_at", "epoch") * 1_000_000, BigIntegerField())
# Match % and created_at packed into one number, so a cursor page starts at an exact row.
# DRF's cursor only remembers the first ordering field; a bare match % would tie on most rows.
FEED_ORDERING = ("-rank_key", "-id")  # best match first, then newest
QUEUE_ORDERING = ("queue_key", "id")  # best match first, then oldest


def feed_roles(user, today=None):
    """Open roles in the current term the user can still act on, best match first (F3-04).

    Skips the user's own projects (BR-04) and roles they already applied to
    (any status, since an application is one per user per role) or passed.
    Empty while they're retired (BR-09) or hold a seat they committed to (F4-10).
    """
    today = today or timezone.localdate()
    roles = (
        Role.objects.filter(
            status=RoleStatus.OPEN,
            project__status=ProjectStatus.OPEN,
            project__term__start_date__lte=today,
            project__term__end_date__gte=today,
        )
        .exclude(project__owner=user)
        .exclude(applications__applicant=user)
        .exclude(dismissals__user=user)
        .select_related("project__owner__profile", "project__term")
        .prefetch_related("required_skills")
        # For the deck card: match % (DD-20) and team progress. distinct, as the joins multiply.
        .annotate(
            skills_total=Count("required_skills", distinct=True),
            skills_matched=Count(
                "required_skills",
                filter=Q(required_skills__profiles__user=user),
                distinct=True,
            ),
            roles_total=Count("project__roles", distinct=True),
            roles_filled=Count(
                "project__roles",
                filter=Q(project__roles__status=RoleStatus.FILLED),
                distinct=True,
            ),
        )
        .annotate(
            rank_key=ExpressionWrapper(
                MATCH_PERCENT * 10**16 + CREATED_MICROS, output_field=BigIntegerField()
            )
        )
    )
    # none() on the annotated queryset, so the view can still order it by rank_key
    if is_retired(user, today) or holds_seat(user, today=today):
        return roles.none()
    return roles


def my_summary(user, today=None):
    """Counts for the navigation badges, and whether my deck is open.

    The deck is closed while I'm benched (BR-09) or hold a seat I committed to (F4-10).
    applicants_waiting matches the review queue: pending, on my open roles, not benched.
    """
    today = today or timezone.localdate()
    if is_retired(user, today):
        deck = "benched"
    elif holds_seat(user, today=today):
        deck = "committed"
    else:
        deck = "open"
    waiting = Application.objects.filter(
        status=ApplicationStatus.PENDING,
        role__status=RoleStatus.OPEN,
        role__project__owner=user,
        role__project__status=ProjectStatus.OPEN,
    ).exclude(applicant__profile__retired_until__gte=today)
    offers = Application.objects.filter(applicant=user, status=ApplicationStatus.LIKED)
    return {"offers": offers.count(), "applicants_waiting": waiting.count(), "deck": deck}


def role_applications(role, status=ApplicationStatus.PENDING):
    """One role's applications with one status: the review queue by default (F4-01).

    The queue leaves out retired applicants (BR-09). Other statuses don't, so the owner
    still sees offers out and who committed after the team locks (F4-10).
    Each comes with the applicant's match for this role; queue_key sorts by it (QUEUE_ORDERING).
    """
    applications = role.applications.filter(status=status)
    if status == ApplicationStatus.PENDING:
        applications = applications.exclude(
            applicant__profile__retired_until__gte=timezone.localdate()
        )
    return (
        applications.select_related("applicant__profile")
        .prefetch_related("applicant__profile__skills")
        .annotate(
            skills_total=Count("role__required_skills", distinct=True),
            skills_matched=Count(
                "role__required_skills",
                filter=Q(role__required_skills__profiles__user=F("applicant")),
                distinct=True,
            ),
        )
        .annotate(
            queue_key=ExpressionWrapper(
                (100 - MATCH_PERCENT) * 10**16 + CREATED_MICROS, output_field=BigIntegerField()
            )
        )
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


class OfferNotOpen(APIException):
    status_code = 409
    default_detail = "This offer is no longer open."
    default_code = "offer_not_open"


class OwnsOpenProject(APIException):
    status_code = 409
    default_detail = "Close your open project before you commit to another team."
    default_code = "owns_open_project"


def holds_seat(user_id, term_id=None, today=None):
    """Does this person hold a seat on an open project this term (one seat per term, F4-10)?

    A seat is a role they fill. Once the project locks, they're retired instead (BR-08).
    Pass term_id, or today to mean the term running then.
    """
    user_id = getattr(user_id, "pk", user_id)
    seats = Role.objects.filter(filled_by_id=user_id, project__status=ProjectStatus.OPEN)
    if term_id is not None:
        return seats.filter(project__term_id=term_id).exists()
    today = today or timezone.localdate()
    return seats.filter(
        project__term__start_date__lte=today, project__term__end_date__gte=today
    ).exists()


@transaction.atomic
def decide(application, status):
    """The owner likes or passes a pending application (F4-02, F4-10).

    A like is an offer: the application becomes liked, the role stays open and no
    seat fills. The candidate takes the seat with commit(). An owner can like
    someone who owns an open project; they have to close it before committing.
    Returns (application, None); only a commit can lock a team now.

    Rows are locked role, applicant, then application, as in commit, so a like and
    a commit on the same role or person wait for each other.
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
        # They already committed to a seat on another open project this term.
        if holds_seat(application.applicant_id, term_id=role.project.term_id):
            raise ApplicantCommitted()
        if role.status != RoleStatus.OPEN:
            raise RoleNotOpen("This role was just filled.")
    application = (
        Application.objects.select_related("applicant__profile")
        .select_for_update(of=("self",))
        .get(pk=application.pk)
    )
    if application.status != ApplicationStatus.PENDING:
        raise ApplicationNotPending()
    application.status = status
    application.save(update_fields=["status", "updated_at"])
    return application, None


@transaction.atomic
def commit(application):
    """The candidate takes the seat an offer is for (F4-10, BR-05).

    In one transaction: the application becomes committed, the role is filled by
    them, the role's other pending and liked applications are passed, their own
    other pending and liked applications that term are withdrawn, and the team
    locks if that was the last open role (BR-06). Returns (application, team);
    team is None unless this commit locked it.

    Locks role, applicant, application, then project (in try_lock), like decide.
    Two commits on one role queue on the role row, and the second sees it filled.
    Two commits that each pass the other's application on their own role can still
    deadlock; Postgres then rolls one back.
    """
    role = Role.objects.select_for_update().get(pk=application.role_id)
    get_user_model().objects.select_for_update().get(pk=application.applicant_id)
    application = Application.objects.select_for_update().get(pk=application.pk)
    if application.status != ApplicationStatus.LIKED:
        raise OfferNotOpen()
    # Read after the role lock, so a close that held it is seen (see apply).
    project = Project.objects.get(pk=role.project_id)
    if role.status != RoleStatus.OPEN or project.status != ProjectStatus.OPEN:
        raise RoleNotOpen("This role was just filled.")
    applicant_id = application.applicant_id
    if is_retired(applicant_id) or holds_seat(applicant_id, term_id=project.term_id):
        raise ApplicantCommitted("You already have a spot on a team this term.")
    owns_open = Project.objects.filter(
        owner_id=applicant_id, term_id=project.term_id, status=ProjectStatus.OPEN
    )
    if owns_open.exists():
        raise OwnsOpenProject()

    application.status = ApplicationStatus.COMMITTED
    application.save(update_fields=["status", "updated_at"])
    role.status, role.filled_by_id = RoleStatus.FILLED, applicant_id
    role.save(update_fields=["status", "filled_by", "updated_at"])
    still_open = [ApplicationStatus.PENDING, ApplicationStatus.LIKED]
    now = timezone.now()
    # The others on this role: the seat is gone, and their offers close.
    role.applications.filter(status__in=still_open).update(
        status=ApplicationStatus.PASSED, updated_at=now
    )
    # One seat per person per term: my other applications and offers close.
    Application.objects.filter(
        status__in=still_open,
        applicant_id=applicant_id,
        role_id__in=Role.objects.filter(project__term_id=project.term_id),
    ).update(status=ApplicationStatus.WITHDRAWN, updated_at=now)
    return application, try_lock(project)


@transaction.atomic
def decline(application):
    """The candidate turns an offer down (F4-10). The role stays open."""
    application = Application.objects.select_for_update().get(pk=application.pk)
    if application.status != ApplicationStatus.LIKED:
        raise OfferNotOpen()
    application.status = ApplicationStatus.DECLINED
    application.save(update_fields=["status", "updated_at"])
    return application


@transaction.atomic
def withdraw(application):
    """The candidate withdraws a pending application (F3-06).

    It leaves the owner's queue. An offer is declined instead, and a committed seat
    can't be withdrawn (BR-11).
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

    Then every member's other pending applications and offers that term are withdrawn and
    they're retired until the term ends (BR-08, F4-07).

    Returns the team, or None while the project can't lock. Safe to call twice:
    the project row lock serialises callers and Team.project is unique.

    Lock order: role, applicant, application, project (as in commit), then the
    members' other applications and profiles. The membership inserts wait for any
    commit holding a member's user row, so we never hold an application that commit
    needs next. Two teams locking at the same moment with crossed applicants can
    still deadlock; Postgres then rolls one commit back.
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
        status__in=[ApplicationStatus.PENDING, ApplicationStatus.LIKED],
        applicant_id__in=members,
        role_id__in=other_roles,
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
    if holds_seat(user):
        raise ApplicantCommitted("You already committed to a team this term.")
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


def reset_passes(user):
    """Bring every role I passed on back into my feed. Applied roles stay out."""
    RoleDismissal.objects.filter(user=user).delete()
