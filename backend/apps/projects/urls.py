from django.urls import path

from . import views

urlpatterns = [
    path("projects/", views.ProjectListCreateView.as_view(), name="project-list"),
    path("projects/mine/", views.MyProjectsView.as_view(), name="my-projects"),
    path("projects/<int:pk>/", views.ProjectDetailView.as_view(), name="project-detail"),
    path("projects/<int:pk>/roles/", views.ProjectRoleCreateView.as_view(), name="project-roles"),
    path("projects/<int:pk>/publish/", views.ProjectPublishView.as_view(), name="project-publish"),
    path("roles/<int:pk>/", views.RoleUpdateView.as_view(), name="role-detail"),
]
