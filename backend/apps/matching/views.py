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
    FeedRoleSerializer,
    MyApplicationSerializer,
    MyTeamResponseSerializer,
    RoleApplicationSerializer,
)


@extend_schema(tags=["feed"])
class FeedView(generics.ListAPIView):
    serializer_class = FeedRoleSerializer
    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        return services.feed_roles(self.request.user)


@extend_schema(tags=["matching"])
class RoleApplicationsView(generics.ListAPIView):
    """Pending applicants for one of my roles. Not my project: 403."""

    serializer_class = RoleApplicationSerializer
    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        role = get_object_or_404(Role.objects.select_related("project"), pk=self.kwargs["pk"])
        if role.project.owner_id != self.request.user.id:
            raise PermissionDenied()
        return services.pending_applications(role)


@extend_schema(tags=["matching"], request=None, responses=ApplicationDecisionSerializer)
class ApplicationDecisionView(APIView):
    """Like or pass a pending applicant on my role.

    Not pending, or the applicant just joined another team: 409.
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
    """Apply to an open role with an optional note. My own project: 403."""

    serializer_class = ApplySerializer

    def perform_create(self, serializer):
        role = serializer.validated_data["role"]
        if role.project.owner_id == self.request.user.id:
            raise PermissionDenied()
        serializer.instance = services.apply(
            role, self.request.user, serializer.validated_data.get("note", "")
        )


@extend_schema(tags=["matching"], request=None, responses={204: None})
class DismissRoleView(APIView):
    """Pass on a role so it leaves my feed (BR-10). My own project: 403. Not open: 409."""

    def post(self, request, pk):
        role = get_object_or_404(Role.objects.select_related("project"), pk=pk)
        if role.project.owner_id == request.user.id:
            raise PermissionDenied()
        services.dismiss(role, request.user)
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
