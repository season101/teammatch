from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied

from apps.core.pagination import DefaultCursorPagination
from apps.projects.models import Role

from . import services
from .serializers import FeedRoleSerializer, RoleApplicationSerializer


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
