from django.db.models.functions import Coalesce, Now
from django.http import Http404
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import DefaultCursorPagination
from apps.projects.models import Role

from . import services
from .models import Application, ApplicationStatus, Membership
from .serializers import (
    ApplicationDecisionSerializer,
    ApplySerializer,
    CommitSerializer,
    FeedRoleSerializer,
    MyApplicationSerializer,
    MySummarySerializer,
    MyTeamResponseSerializer,
    RoleApplicationSerializer,
)


class FeedPagination(DefaultCursorPagination):
    ordering = services.FEED_ORDERING


@extend_schema(tags=["feed"])
class FeedView(generics.ListAPIView):
    """Open roles I can still apply to, best match first. Empty while I'm retired (BR-09)."""

    serializer_class = FeedRoleSerializer
    pagination_class = FeedPagination

    def get_queryset(self):
        return services.feed_roles(self.request.user)


@extend_schema(
    tags=["matching"],
    parameters=[OpenApiParameter("status", str, enum=ApplicationStatus.values)],
)
class RoleApplicationsView(generics.ListAPIView):
    """Applicants for one of my roles. Not my project: 403.

    Pending by default, minus retired ones (BR-09), best match first then oldest.
    ?status=liked lists my offers out (F4-10), newest first.
    """

    serializer_class = RoleApplicationSerializer
    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        role = get_object_or_404(Role.objects.select_related("project"), pk=self.kwargs["pk"])
        if role.project.owner_id != self.request.user.id:
            raise PermissionDenied()
        status = self.request.query_params.get("status")
        if status not in ApplicationStatus.values:
            status = ApplicationStatus.PENDING
        if status == ApplicationStatus.PENDING:
            self.paginator.ordering = services.QUEUE_ORDERING
        return services.role_applications(role, status)


@extend_schema(tags=["matching"], request=None, responses=ApplicationDecisionSerializer)
class ApplicationDecisionView(APIView):
    """Like or pass a pending applicant on my role. A like is an offer (F4-10).

    Not pending, the role is filled, or the applicant is on a team or committed: 409.
    """

    decision = None  # set per URL

    def post(self, request, pk):
        application = get_object_or_404(Application.objects.select_related("role__project"), pk=pk)
        if application.role.project.owner_id != request.user.id:
            raise PermissionDenied()
        application, team = services.decide(application, self.decision)
        return Response(ApplicationDecisionSerializer(application, context={"team": team}).data)


@extend_schema(tags=["matching"])
class ApplyView(generics.CreateAPIView):
    """Apply to an open role with an optional note. My own project, or I'm retired: 403."""

    serializer_class = ApplySerializer

    def perform_create(self, serializer):
        role = serializer.validated_data["role"]
        if role.project.owner_id == self.request.user.id:
            raise PermissionDenied()
        serializer.instance = services.apply(
            role, self.request.user, serializer.validated_data.get("note", "")
        )


@extend_schema(tags=["feed"], request=None, responses={204: None})
class ResetPassesView(APIView):
    """Show every role I passed on in my feed again."""

    def post(self, request):
        services.reset_passes(request.user)
        return Response(status=204)


@extend_schema(tags=["matching"], request=None, responses={204: None})
class DismissRoleView(APIView):
    """Pass on a role so it leaves my feed (BR-10). My own project: 403. Not open: 409.

    DELETE takes my pass back (F3-10). It only ever touches my own pass.
    """

    def post(self, request, pk):
        role = get_object_or_404(Role.objects.select_related("project"), pk=pk)
        if role.project.owner_id == request.user.id:
            raise PermissionDenied()
        services.dismiss(role, request.user)
        return Response(status=204)

    def delete(self, request, pk):
        services.undo_dismiss(get_object_or_404(Role, pk=pk), request.user)
        return Response(status=204)


@extend_schema(
    tags=["matching"],
    parameters=[OpenApiParameter("status", str, enum=ApplicationStatus.values)],
)
class MyApplicationsView(generics.ListAPIView):
    """My applications, newest first. ?status= keeps one status (F3-06)."""

    serializer_class = MyApplicationSerializer
    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        applications = Application.objects.filter(applicant=self.request.user).select_related(
            "role__project__owner__profile"
        )
        status = self.request.query_params.get("status")
        if status in ApplicationStatus.values:
            applications = applications.filter(status=status)
        return applications


@extend_schema(tags=["matching"], request=None, responses=MyApplicationSerializer)
class WithdrawApplicationView(APIView):
    """Withdraw my pending application. Someone else's: 404. Not pending: 409 (BR-11)."""

    def post(self, request, pk):
        application = get_object_or_404(Application, pk=pk, applicant=request.user)
        application = services.withdraw(application)
        return Response(MyApplicationSerializer(application).data)


def my_offer(request, pk):
    """The application, if it's mine. Someone else's: 403 (F4-10). Missing: 404."""
    application = get_object_or_404(Application, pk=pk)
    if application.applicant_id != request.user.id:
        raise PermissionDenied()
    return application


@extend_schema(tags=["matching"], request=None, responses=CommitSerializer)
class CommitView(APIView):
    """Take the seat this offer is for (F4-10). Closes my other applications this term.

    409: offer_not_open, role_not_open, owns_open_project or applicant_committed.
    """

    def post(self, request, pk):
        application, team = services.commit(my_offer(request, pk))
        return Response(CommitSerializer(application, context={"team": team}).data)


@extend_schema(tags=["matching"], request=None, responses=MyApplicationSerializer)
class DeclineView(APIView):
    """Turn this offer down (F4-10). The role stays open. Not an open offer: 409."""

    def post(self, request, pk):
        application = services.decline(my_offer(request, pk))
        return Response(MyApplicationSerializer(application).data)


@extend_schema(tags=["matching"], responses=MySummarySerializer)
class MySummaryView(APIView):
    """Badge counts for the navigation: my offers and applicants waiting on my roles.

    deck says whether my deck is open, or closed because I'm benched or committed.
    """

    def get(self, request):
        return Response(MySummarySerializer(services.my_summary(request.user)).data)


@extend_schema(tags=["teams"], responses=MyTeamResponseSerializer)
class MyTeamView(APIView):
    """My team this term, with my seen_at (F4-05). No team this term: team is null."""

    def get(self, request):
        seat = services.my_team_seat(request.user)
        return Response(MyTeamResponseSerializer({"team": seat}).data)


@extend_schema(tags=["teams"], request=None, responses={204: None})
class TeamSeenView(APIView):
    """I saw "It's a Team!" for this team (DD-27). Repeats keep the first time. Not mine: 404."""

    def post(self, request, pk):
        seen = Membership.objects.filter(team_id=pk, user=request.user).update(
            seen_at=Coalesce("seen_at", Now())
        )
        if not seen:
            raise Http404  # same answer as a missing team, so team ids do not leak
        return Response(status=204)
