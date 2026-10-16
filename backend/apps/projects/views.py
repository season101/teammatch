from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Project, Role
from .serializers import ProjectSerializer, RoleSerializer


def owned_project(request, pk):
    """The project, or 404. Not mine: 403."""
    project = get_object_or_404(Project, pk=pk)
    if project.owner_id != request.user.id:
        raise PermissionDenied()
    return project


class ProjectCreateView(generics.CreateAPIView):
    serializer_class = ProjectSerializer


@extend_schema(tags=["projects"])
class ProjectRoleCreateView(generics.CreateAPIView):
    """Add a role (with required skills) to one of my draft or open projects."""

    serializer_class = RoleSerializer

    def create(self, request, *args, **kwargs):
        # check ownership first, so a non-owner gets 403 even with a bad body
        self.project = owned_project(request, kwargs["pk"])
        services.ensure_roles_editable(self.project)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(project=self.project)


@extend_schema(tags=["projects"])
class RoleUpdateView(generics.UpdateAPIView):
    """Edit one of my open roles, including its required skills."""

    serializer_class = RoleSerializer
    http_method_names = ["patch", "options"]

    def get_object(self):
        role = get_object_or_404(Role.objects.select_related("project"), pk=self.kwargs["pk"])
        if role.project.owner_id != self.request.user.id:
            raise PermissionDenied()
        services.ensure_role_editable(role)
        return role


@extend_schema(tags=["projects"], request=None, responses=ProjectSerializer)
class ProjectPublishView(APIView):
    """Open my draft project for applications. Blocked when it has no roles."""

    def post(self, request, pk):
        project = services.publish_project(owned_project(request, pk))
        return Response(ProjectSerializer(project).data)
