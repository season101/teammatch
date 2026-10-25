from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import DefaultCursorPagination

from . import services
from .models import Project, Role
from .serializers import (
    MyProjectSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectSerializer,
    RoleSerializer,
)


def owned_project(request, pk):
    """The project, or 404. Not mine: 403."""
    project = get_object_or_404(Project, pk=pk)
    if project.owner_id != request.user.id:
        raise PermissionDenied()
    return project


@extend_schema(tags=["projects"])
class ProjectListCreateView(generics.ListCreateAPIView):
    """GET: open projects in the current term, newest first. POST: create a draft."""

    pagination_class = DefaultCursorPagination

    def get_queryset(self):
        return services.open_projects()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectSerializer
        return ProjectListSerializer


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
    http_method_names = ["patch", "delete", "options"]

    def get_object(self):
        role = get_object_or_404(Role.objects.select_related("project"), pk=self.kwargs["pk"])
        if role.project.owner_id != self.request.user.id:
            raise PermissionDenied()
        services.ensure_role_editable(role)
        return role

    @extend_schema(tags=["projects"], request=None, responses={204: None})
    def delete(self, request, *args, **kwargs):
        """Delete one of my open roles. Locks the project if every other role is filled."""
        services.delete_role(self.get_object())
        return Response(status=204)


@extend_schema(tags=["projects"], request=None, responses=ProjectSerializer)
class ProjectPublishView(APIView):
    """Open my draft project for applications. Blocked when it has no roles."""

    def post(self, request, pk):
        project = services.publish_project(owned_project(request, pk))
        return Response(ProjectSerializer(project).data)


@extend_schema(tags=["projects"])
class MyProjectsView(generics.ListAPIView):
    """Projects I own, with their roles."""

    # shortcut: not paginated, since an owner has a few projects per term; page it if that grows
    serializer_class = MyProjectSerializer

    def get_queryset(self):
        return services.my_projects(self.request.user)


@extend_schema(tags=["projects"])
class ProjectDetailView(generics.RetrieveUpdateAPIView):
    """GET: one project with its roles and their required skills.
    Owners see their own drafts. Everyone else sees open and locked projects only (404 otherwise).

    PATCH: the owner edits the title or pitch of a draft or open project.
    """

    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return services.visible_projects(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return ProjectSerializer
        return ProjectDetailSerializer

    def get_object(self):
        if self.request.method == "PATCH":
            # owner check first (403), then the locked/archived rule (409)
            project = owned_project(self.request, self.kwargs["pk"])
            services.ensure_project_editable(project)
            return project
        return super().get_object()


@extend_schema(tags=["projects"], request=None, responses=ProjectSerializer)
class ProjectCloseView(APIView):
    """Close my project: it is archived and its pending applications are withdrawn."""

    def post(self, request, pk):
        project = services.close_project(owned_project(request, pk))
        return Response(ProjectSerializer(project).data)
