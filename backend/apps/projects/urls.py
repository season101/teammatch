from django.urls import path

from . import views

urlpatterns = [
    path("projects/", views.ProjectListCreateView.as_view(), name="project-list"),
    path("projects/mine/", views.MyProjectsView.as_view(), name="my-projects"),
    path("projects/<int:pk>/", views.ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<int:pk>/roles/", views.ProjectRoleCreateView.as_view(), name="project-roles"),
    path("projects/<int:pk>/publish/", views.ProjectPublishView.as_view(), name="project-publish"),
    path("projects/<int:pk>/close/", views.ProjectCloseView.as_view(), name="project-close"),
    path("roles/<int:pk>/", views.RoleUpdateView.as_view(), name="role-detail"),
    path("moderation/terms/", views.ModerationTermsView.as_view(), name="moderation-terms"),
    path("moderation/moderators/", views.ModeratorsView.as_view(), name="moderators"),
    path("moderation/moderators/<int:pk>/", views.ModeratorView.as_view(), name="moderator"),
    path(
        "moderation/projects/",
        views.ModerationProjectsView.as_view(),
        name="moderation-projects",
    ),
    path(
        "moderation/projects/<int:pk>/moderators/<int:user_pk>/",
        views.ProjectModeratorView.as_view(),
        name="project-moderator",
    ),
]
