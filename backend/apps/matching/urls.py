from django.urls import path

from . import views

urlpatterns = [
    path("feed/", views.FeedView.as_view(), name="feed"),
    path(
        "roles/<int:pk>/applications/",
        views.RoleApplicationsView.as_view(),
        name="role-applications",
    ),
]
