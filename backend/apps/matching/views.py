from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import DefaultCursorPagination
from apps.projects.models import Role

from . import services
from .models import Application
from .serializers import ApplySerializer, FeedRoleSerializer, RoleApplicationSerializer


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


@extend_schema(tags=["matching"], request=None, responses=RoleApplicationSerializer)
class ApplicationDecisionView(APIView):
    """Like or pass a pending applicant on my role. Not pending: 409."""

    decision = None  # set per URL

    def post(self, request, pk):
        application = get_object_or_404(Application.objects.select_related("role__project"), pk=pk)
        if application.role.project.owner_id != request.user.id:
            raise PermissionDenied()
        application = services.decide(application, self.decision)
        return Response(RoleApplicationSerializer(application).data)


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
