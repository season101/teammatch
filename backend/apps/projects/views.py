from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsStudent
from apps.core.models import Term
from apps.core.pagination import DefaultCursorPagination
from apps.core.serializers import TermSerializer
from apps.profiles.permissions import RulesAccepted

from . import services
from .models import Project, ProjectModerator, Role
from .serializers import (
    ModerationProjectSerializer,
    ModeratorSerializer,
    MyProjectSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectSerializer,
    RoleSerializer,
)


def owned_project(request, pk):
    """My project. Missing or not visible to me (someone's draft or archived one): 404.
    Someone's open or locked project: 403."""
    project = get_object_or_404(Project.objects.filter(services.visible_to(request.user)), pk=pk)
    if project.owner_id != request.user.id:
        raise PermissionDenied()
    return project


@extend_schema(tags=["projects"])
@extend_schema_view(
    get=extend_schema(
        parameters=[
            OpenApiParameter(
                "q",
                str,
                description="Search title, pitch, open role titles and their required skills, "
                "ignoring case.",
            )
        ]
    )
)
class ProjectListCreateView(generics.ListCreateAPIView):
    """GET: open projects in the current term, newest first. ?q= searches them (F2-07).
    POST: create a draft. Team rules not accepted: 403 rules_not_accepted.
    A moderator or admin: 403 not_a_student.
    """

    pagination_class = DefaultCursorPagination
    permission_classes = [IsAuthenticated, IsStudent, RulesAccepted]

    def get_queryset(self):
        return services.open_projects(q=self.request.query_params.get("q", ""))

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectSerializer
        return ProjectListSerializer


@extend_schema(tags=["projects"])
class ProjectRoleCreateView(generics.CreateAPIView):
    """Add a role (with required skills) to one of my draft or open projects."""

    serializer_class = RoleSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # check ownership first, so a non-owner gets 403 even with a bad body
        project = owned_project(request, kwargs["pk"])
        # then lock it, so a like that just locked the team is seen, not added to
        self.project = get_object_or_404(Project.objects.select_for_update(), pk=project.pk)
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
        roles = Role.objects.filter(services.visible_to(self.request.user, "project__"))
        role = get_object_or_404(roles.select_related("project"), pk=self.kwargs["pk"])
        if role.project.owner_id != self.request.user.id:
            raise PermissionDenied()
        if self.request.method == "PATCH":
            # Lock, then read the project in its own query, so a like or close that just
            # committed is seen, not overwritten. no_key: a team-locking like takes KEY SHARE.
            role = get_object_or_404(Role.objects.select_for_update(no_key=True), pk=role.pk)
        services.ensure_role_editable(role)
        return role

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(tags=["projects"], request=None, responses={204: None})
    def delete(self, request, *args, **kwargs):
        """Delete one of my open roles. Locks the project if every other role is filled."""
        services.delete_role(self.get_object())
        return Response(status=204)


@extend_schema(tags=["projects"], request=None, responses=ProjectSerializer)
class ProjectPublishView(APIView):
    """Open my draft project for applications. Blocked when it has no roles.
    Team rules not accepted: 403 rules_not_accepted. A moderator or admin: 403 not_a_student."""

    permission_classes = [IsAuthenticated, IsStudent, RulesAccepted]

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

    PATCH: the owner edits the title, pitch, repository link or more details of a draft or
    open project.
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
            # owner check first (403), then the locked/archived rule (409) on the locked row,
            # so a like or close that just committed is seen, not overwritten
            project = owned_project(self.request, self.kwargs["pk"])
            project = get_object_or_404(Project.objects.select_for_update(), pk=project.pk)
            services.ensure_project_editable(project)
            return project
        return super().get_object()

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)


@extend_schema(tags=["projects"], request=None, responses=ProjectSerializer)
class ProjectCloseView(APIView):
    """Close my project: it is archived and its pending applications are withdrawn."""

    def post(self, request, pk):
        project = services.close_project(owned_project(request, pk))
        return Response(ProjectSerializer(project).data)


# The admin's moderation page. Everything below is admin (is_staff) only: 403 for anyone else.


@extend_schema(tags=["moderation"])
class ModerationTermsView(generics.ListCreateAPIView):
    """GET: every term, newest first. POST: add one; dates that overlap another term: 400."""

    permission_classes = [IsAdminUser]
    serializer_class = TermSerializer
    queryset = Term.objects.all()


@extend_schema(tags=["moderation"])
class ModeratorsView(generics.ListCreateAPIView):
    """GET: the moderators. POST {email}: make that account a moderator (again is fine)."""

    permission_classes = [IsAdminUser]
    serializer_class = ModeratorSerializer

    def get_queryset(self):
        users = get_user_model().objects.filter(is_moderator=True, is_staff=False)
        return users.select_related("profile").order_by("email")


@extend_schema(tags=["moderation"], request=None, responses={204: None})
class ModeratorView(APIView):
    """DELETE: a student again, and off every project they moderated."""

    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        services.set_moderator(get_object_or_404(get_user_model(), pk=pk, is_moderator=True), False)
        return Response(status=204)


@extend_schema(tags=["moderation"])
class ModerationProjectsView(generics.ListAPIView):
    """Every project that isn't archived, newest first, with its moderators."""

    # shortcut: not paginated or searchable, fine for a class's worth of projects per term;
    # page it and add ?q= when the list outgrows one screen.
    permission_classes = [IsAdminUser]
    serializer_class = ModerationProjectSerializer

    def get_queryset(self):
        return (
            Project.objects.exclude(status="archived")
            .select_related("owner__profile", "term")
            .prefetch_related(services.MODERATORS)
        )


@extend_schema(tags=["moderation"], request=None, responses={204: None})
class ProjectModeratorView(APIView):
    """PUT: put a moderator on a project (again is fine). DELETE: take them off.
    No such project, or the user isn't a moderator: 404."""

    permission_classes = [IsAdminUser]

    def put(self, request, pk, user_pk):
        ProjectModerator.objects.get_or_create(
            project=get_object_or_404(Project, pk=pk),
            user=get_object_or_404(get_user_model(), pk=user_pk, is_moderator=True),
        )
        return Response(status=204)

    def delete(self, request, pk, user_pk):
        ProjectModerator.objects.filter(project_id=pk, user_id=user_pk).delete()
        return Response(status=204)
